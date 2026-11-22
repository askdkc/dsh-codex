import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import * as sourcePlugin from '../src/index.ts'

const contexts: Context[] = []
const CODEX_KEY = credentialKey('llm-pi-ai', 'openai-codex')

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  vi.unstubAllGlobals()
})

// Use the real adapter: listing alone does not exercise model resolution or
// request preparation. Transport compatibility is covered in transport.spec.ts.
describe.each(['source', 'built'] as const)('%s adapter compatibility', artifact => {
  it('shows newly listed Astra and Sol on the first lookup after expiry', async () => {
    const plugin = artifact === 'source' ? sourcePlugin : await import('../lib/index.js')
    const listed = (ids: string[]) => new Response(JSON.stringify({
      models: ids.map(slug => ({ slug, visibility: 'list' })),
    }))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listed(['gpt-6-astra']))
      .mockResolvedValueOnce(listed(['gpt-6.2-sol', 'gpt-6.2-astra']))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(LlmRuntime)
    ctx.provide('commands', { register: vi.fn() } as never)
    ctx.provide('userQuestions', { ask: vi.fn() } as never)
    ctx.provide('authorization', {} as never)
    ctx.provide('credentials', { readRecord: async () => ({ kind: 'grant', payload: {
      type: 'oauth', access: 'synthetic-access', refresh: 'synthetic-refresh',
      expires: Date.now() + 3_600_000, accountId: 'synthetic-account',
    } }) } as never)
    await ctx.plugin(plugin)
    const ids = async () => (await ctx.llm.listModels('openai-codex')).map(model => model.id)
    expect(await ids()).toEqual(['gpt-6-astra'])
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000)
    try {
      const expected = ['gpt-6.2-sol', 'gpt-6.2-astra']
      expect(await Promise.all([ids(), ids()])).toEqual([expected, expected])
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      clock.mockRestore()
    }
  })

  it('resolves and prepares models across fallback, live refresh, and logout', async () => {
    const plugin = artifact === 'source' ? sourcePlugin : await import('../lib/index.js')
    let grant: unknown
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      models: [
        { slug: 'gpt-6-astra', display_name: 'Account Astra', visibility: 'list' },
        { slug: 'gpt-6-sol', display_name: 'Account Sol', visibility: 'list' },
        { slug: 'gpt-6-luna', display_name: 'Account Luna', visibility: 'list' },
        { slug: 'gpt-6.1-sol', display_name: 'Account Sol 6.1', visibility: 'list' },
      ],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(LlmRuntime)
    ctx.provide('commands', { register: vi.fn() } as never)
    ctx.provide('userQuestions', { ask: vi.fn() } as never)
    ctx.provide('authorization', {} as never)
    ctx.provide('credentials', {
      readRecord: async () => grant === undefined ? undefined : { kind: 'grant', payload: grant },
    } as never)
    const register = vi.spyOn(ctx.llm, 'registerAdapter')
    await ctx.plugin(plugin)
    const adapter = register.mock.calls[0]?.[1]
    expect(adapter).toBeDefined()
    if (adapter === undefined) throw new Error('Codex adapter was not registered')

    const fallback = await ctx.llm.listModels('openai-codex')
    const imageTarget = adapter.imageRequestTarget('openai-codex', 'gpt-6.1-terra', {
      attachmentId: AttachmentId('test-image'), mediaType: 'image/png', bytes: 512, width: 32, height: 32,
    })
    if ('maxImageBytes' in imageTarget) {
      expect(imageTarget).toMatchObject({ maxImageBytes: 786432, imageTargetBytes: 786432 })
    } else {
      expect(imageTarget).toMatchObject({ maxBytes: 1048576 })
    }
    expect(fallback.length).toBeGreaterThan(1)
    expect(fallback).toContainEqual(expect.objectContaining({ id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol' }))
    expect(fallback).toContainEqual(expect.objectContaining({ id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra' }))
    await expect(adapter.prepareCall('openai-codex', 'gpt-6.1-terra')).resolves.toMatchObject({
      model: { context: { contextWindow: 500000 }, inputModalities: ['text', 'image'] },
    })
    await expect(ctx.llm.resolveModelInfo('openai-codex', 'gpt-6.1-terra')).resolves.toMatchObject({
      reasoning: { efforts: ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].map(id => ({ id, name: `${id[0]!.toUpperCase()}${id.slice(1)}` })) },
    })
    for (const model of fallback) {
      await expect(ctx.llm.resolveModelInfo('openai-codex', model.id)).resolves.toMatchObject({
        id: model.id, name: model.name,
      })
      await expect(adapter.prepareCall('openai-codex', model.id)).resolves.toMatchObject({
        model: { id: model.id, name: model.name }, stream: expect.any(Function),
      })
    }
    expect(fetchMock).not.toHaveBeenCalled()
    const prepared = await adapter.prepareCall('openai-codex', 'gpt-6-astra')

    grant = {
      type: 'oauth', access: 'synthetic-access', refresh: 'synthetic-refresh',
      expires: Date.now() + 3_600_000, accountId: 'synthetic-account',
    }
    ctx.emit('credentials/record-updated', CODEX_KEY)
    await vi.waitFor(async () => {
      await expect(ctx.llm.listModels('openai-codex')).resolves.toMatchObject([
        { id: 'gpt-6-astra', name: 'Account Astra' },
        { id: 'gpt-6-sol', name: 'Account Sol' },
        { id: 'gpt-6-luna', name: 'Account Luna' },
        { id: 'gpt-6.1-sol', name: 'Account Sol 6.1' },
      ])
    })
    await expect(ctx.llm.resolveModelInfo('openai-codex', 'gpt-6-astra')).resolves.toMatchObject({
      id: 'gpt-6-astra', name: 'Account Astra',
    })
    await expect(adapter.prepareCall('openai-codex', 'gpt-6-astra')).resolves.toMatchObject({
      model: { id: 'gpt-6-astra', name: 'Account Astra' },
    })
    for (const [id, name] of [['gpt-6-sol', 'Account Sol'], ['gpt-6-luna', 'Account Luna'], ['gpt-6.1-sol', 'Account Sol 6.1']] as const) {
      await expect(adapter.prepareCall('openai-codex', id)).resolves.toMatchObject({
        model: { id, name }, stream: expect.any(Function),
      })
    }
    expect(prepared.model.name).toBe('GPT-6 Astra')
    await expect(adapter.prepareCall('openai-codex', 'missing-model')).rejects.toMatchObject({
      code: 'UNKNOWN_MODEL',
    })

    grant = undefined
    ctx.emit('credentials/record-updated', CODEX_KEY)
    await vi.waitFor(async () => {
      expect(await ctx.llm.listModels('openai-codex')).toHaveLength(fallback.length)
    })
    await expect(adapter.prepareCall('openai-codex', 'gpt-6-astra')).resolves.toMatchObject({
      model: { id: 'gpt-6-astra', name: 'GPT-6 Astra' },
    })
  })
})
