import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  accountIdFromAccessToken,
  CodexCatalog,
  parseOfficialModels,
  type CodexCatalogCredential,
} from '../src/catalog.ts'

const catalogs: CodexCatalog[] = []

function catalog(options: {
  timeoutMs?: number
  fetch?: typeof globalThis.fetch
  resolveCredential?: () => Promise<CodexCatalogCredential | undefined>
  warn?: (message: string) => void
} = {}): CodexCatalog {
  const created = new CodexCatalog({
    baseline: [],
    resolveCredential: options.resolveCredential ?? (async () => ({ accessToken: 'test-access' })),
    refreshIntervalMs: 60_000,
    revalidateAfterMs: 1,
    timeoutMs: options.timeoutMs ?? 1_000,
    random: () => 0.5,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  })
  catalogs.push(created)
  return created
}

function response(models: unknown[], init: ResponseInit = {}): Response {
  return new Response(JSON.stringify({ models }), {
    status: 200,
    headers: { 'content-type': 'application/json', ...init.headers },
    ...init,
  })
}

function listed(slug: string, priority = 0) {
  return { slug, display_name: `Live ${slug}`, priority, visibility: 'list', supported_in_api: true }
}

afterEach(() => {
  for (const entry of catalogs.splice(0)) entry.stop()
})

describe('live Codex catalog', () => {
  it('publishes the full account-visible list in official order', async () => {
    const retired = listed('retired', 0)
    const retained = listed('retained', 1)
    const release = { ...listed('just-released', 0), supported_in_api: false }
    const hidden = { ...listed('private-preview'), visibility: 'hide' }
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response([retained, retired]))
      .mockResolvedValueOnce(response([retained, hidden, release]))
    const created = catalog({ fetch: fetchMock })
    const entries = () => created.current.models.map(({ id, name }) => [id, name])

    await created.start()
    expect(entries()).toEqual([[retired.slug, retired.display_name], [retained.slug, retained.display_name]])
    await created.forceRefresh()
    expect(created.current.source).toBe('live')
    expect(entries()).toEqual([[release.slug, release.display_name], [retained.slug, retained.display_name]])
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://chatgpt.com/backend-api/codex/models?client_version=99.99.99')
    expect(init).toMatchObject({
      method: 'GET',
      redirect: 'error',
      headers: {
        authorization: 'Bearer test-access',
        originator: 'pi',
        'user-agent': 'dsh-codex/0.1.0',
      },
    })
  })

  const accessToken = process.env.DSH_TEST_CODEX_ACCESS_TOKEN
  const catalogFile = process.env.DSH_TEST_CODEX_CATALOG_FILE
  it.skipIf(!accessToken && !catalogFile)('matches the visible IDs in an actual Codex catalog', async () => {
    interface Row { slug: string; visibility: string; priority?: number }
    const accountId = accessToken && accountIdFromAccessToken(accessToken)
    let rows: Row[] = []
    const created = catalog({
      timeoutMs: 15_000,
      resolveCredential: async () => ({
        accessToken: accessToken || 'offline-fixture',
        ...(accountId && { accountId }),
      }),
      fetch: async (url, init) => {
        const result = catalogFile
          ? new Response(await readFile(catalogFile, 'utf8'))
          : await fetch(url, init)
        rows = (await result.clone().json()).models
        return result
      },
    })
    await created.start()
    expect(created.current.source).toBe('live')
    const expected = rows
      .map((row, index) => ({ ...row, priority: row.priority ?? index }))
      .filter(row => row.visibility === 'list')
      .sort((a, b) => a.priority - b.priority)
      .map(row => row.slug)
    expect(created.current.models.map(model => model.id)).toEqual([...new Set(expected)])
  }, 20_000)

  it('sends ETag on revalidation and retains the published generation on 304', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([listed('example-model')], { headers: { etag: '"catalog-v1"' } }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
    const created = catalog({ fetch: fetchMock })
    await created.start()
    const revision = created.current.revision

    await created.forceRefresh()

    expect(created.current.revision).toBe(revision)
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: { 'if-none-match': '"catalog-v1"' },
    })
  })

  it('refreshes capabilities for the same new ID and honors an empty visible list', async () => {
    const row = { ...listed('new-model'), input_modalities: ['text', 'image'], context_window: 600000,
      supported_reasoning_levels: [{ effort: 'high' }] }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([row]))
      .mockResolvedValueOnce(response([{ ...row, context_window: 800000 }]))
      .mockResolvedValueOnce(response([{ ...row, visibility: 'hide' }]))
    const created = catalog({ fetch: fetchMock })
    await created.start()
    expect(created.current.models[0]).toMatchObject({ id: 'new-model', contextWindow: 600000,
      input: ['text', 'image'], reasoning: true, thinkingLevelMap: { high: 'high', max: null } })
    await created.forceRefresh()
    expect(created.current.models[0]?.contextWindow).toBe(800000)
    await created.forceRefresh()
    expect(created.current.models).toEqual([])
  })

  it('drops the prior account filter before refreshing a different account', async () => {
    let currentAccount = 'account-a'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([listed('example-model')]))
      .mockResolvedValueOnce(response([listed('future-without-metadata')]))
    const created = catalog({
      fetch: fetchMock,
      resolveCredential: async () => ({ accessToken: 'test-access', accountId: currentAccount }),
    })
    await created.start()
    expect(created.current.models.map(model => model.id)).toEqual(['example-model'])

    currentAccount = 'account-b'
    await created.forceRefresh()

    expect(created.current.source).toBe('live')
    expect(created.current.models.map(model => model.id)).toEqual(['future-without-metadata'])
  })

  it('coalesces concurrent refreshes into one request', async () => {
    let release: (() => void) | undefined
    const fetchMock = vi.fn(async (..._args: Parameters<typeof globalThis.fetch>) => {
      await new Promise<void>(resolve => { release = resolve })
      return response([listed('example-model')])
    })
    const created = catalog({ fetch: fetchMock })

    const first = created.refresh()
    const second = created.refresh()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    release?.()
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('sorts and filters malformed, hidden, and duplicate official rows', () => {
    expect(parseOfficialModels({ models: [
      listed('example-model', 2),
      listed('example-model', 1),
      { slug: '', visibility: 'list', supported_in_api: true },
      { slug: 'hidden', visibility: 'hide', supported_in_api: true },
      { ...listed('chatgpt-only', 1), supported_in_api: false },
      null,
    ] })).toMatchObject([
      { slug: 'chatgpt-only', name: 'Live chatgpt-only', priority: 1 },
      { slug: 'example-model', name: 'Live example-model', priority: 2 },
    ])
    expect(() => parseOfficialModels({ data: [] })).toThrow()
  })

  it('extracts only the account id from an OAuth access JWT', () => {
    const payload = Buffer.from(JSON.stringify({
      'https://api.openai.com/auth': { chatgpt_account_id: 'account-123', secret: 'ignored' },
    })).toString('base64url')

    expect(accountIdFromAccessToken(`header.${payload}.signature`)).toBe('account-123')
    expect(accountIdFromAccessToken('not-a-jwt')).toBeUndefined()
  })
})
