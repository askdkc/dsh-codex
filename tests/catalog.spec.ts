import { afterEach, describe, expect, it, vi } from 'vitest'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import {
  accountIdFromAccessToken,
  CodexCatalog,
  parseOfficialModels,
  type CodexCatalogCredential,
} from '../src/catalog.ts'

const catalogs: CodexCatalog[] = []

function catalog(options: {
  fetch?: typeof globalThis.fetch
  resolveCredential?: () => Promise<CodexCatalogCredential | undefined>
  warn?: (message: string) => void
} = {}): CodexCatalog {
  const created = new CodexCatalog({
    baseline: openaiCodexProvider().getModels(),
    resolveCredential: options.resolveCredential ?? (async () => ({ accessToken: 'test-access' })),
    refreshIntervalMs: 60_000,
    revalidateAfterMs: 1,
    timeoutMs: 1_000,
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

function listed(slug: string, priority = 0): Record<string, unknown> {
  return { slug, display_name: `Live ${slug}`, priority, visibility: 'list', supported_in_api: true }
}

afterEach(() => {
  for (const entry of catalogs.splice(0)) entry.stop()
})

describe('live Codex catalog', () => {
  it('ships Astra in the executable fallback catalog', () => {
    const models = catalog({ resolveCredential: async () => undefined }).current.models

    expect(models.map(model => model.id)).toContain('gpt-6-astra')
    expect(models.find(model => model.id === 'gpt-6-astra')).toMatchObject({
      name: 'GPT-6 Astra',
      contextWindow: 272000,
      maxTokens: 128000,
    })
  })

  it('publishes the account-visible intersection in official order', async () => {
    const fetchMock = vi.fn(async (..._args: Parameters<typeof globalThis.fetch>) => response([
      listed('gpt-6-astra', 1),
      listed('future-without-local-transport-metadata'),
      listed('gpt-5.6-luna', 2),
      { ...listed('gpt-5.5'), visibility: 'hide' },
      { ...listed('gpt-5.4'), supported_in_api: false },
    ], { headers: { etag: '"catalog-v1"' } }))
    const created = catalog({ fetch: fetchMock })

    await created.start()

    expect(created.current.source).toBe('live')
    expect(created.current.models.map(model => model.id)).toEqual(['gpt-5.4', 'gpt-6-astra', 'gpt-5.6-luna'])
    expect(created.current.models.map(model => model.name)).toEqual([
      'Live gpt-5.4',
      'Live gpt-6-astra',
      'Live gpt-5.6-luna',
    ])
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

  it('sends ETag on revalidation and retains the published generation on 304', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([listed('gpt-6-astra')], { headers: { etag: '"catalog-v1"' } }))
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

  it('retains the last usable generation when the source is empty or unexecutable', async () => {
    const warn = vi.fn()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([listed('gpt-6-astra')]))
      .mockResolvedValueOnce(response([listed('future-without-metadata')]))
      .mockResolvedValueOnce(response([]))
    const created = catalog({ fetch: fetchMock, warn })
    await created.start()

    await created.forceRefresh()
    await created.forceRefresh()

    expect(created.current.models.map(model => model.id)).toEqual(['gpt-6-astra'])
    expect(warn.mock.calls.flat().join('\n')).toContain('NO_EXECUTABLE_MODELS')
    expect(warn.mock.calls.flat().join('\n')).toContain('EMPTY_LIST')
  })

  it('drops the prior account filter before refreshing a different account', async () => {
    let currentAccount = 'account-a'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([listed('gpt-6-astra')]))
      .mockResolvedValueOnce(response([listed('future-without-metadata')]))
    const created = catalog({
      fetch: fetchMock,
      resolveCredential: async () => ({ accessToken: 'test-access', accountId: currentAccount }),
    })
    await created.start()
    expect(created.current.models.map(model => model.id)).toEqual(['gpt-6-astra'])

    currentAccount = 'account-b'
    await created.forceRefresh()

    expect(created.current.source).toBe('bundled')
    expect(created.current.models.map(model => model.id)).toContain('gpt-5.6-luna')
  })

  it('coalesces concurrent refreshes into one request', async () => {
    let release: (() => void) | undefined
    const fetchMock = vi.fn(async (..._args: Parameters<typeof globalThis.fetch>) => {
      await new Promise<void>(resolve => { release = resolve })
      return response([listed('gpt-6-astra')])
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
      listed('gpt-6-astra', 2),
      listed('gpt-6-astra', 1),
      { slug: '', visibility: 'list', supported_in_api: true },
      { slug: 'hidden', visibility: 'hide', supported_in_api: true },
      { ...listed('chatgpt-only', 1), supported_in_api: false },
      null,
    ] })).toEqual([
      { slug: 'chatgpt-only', name: 'Live chatgpt-only', priority: 1 },
      { slug: 'gpt-6-astra', name: 'Live gpt-6-astra', priority: 2 },
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
