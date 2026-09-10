import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import * as sourcePlugin from '../src/index.ts'

const contexts: Context[] = []
const CODEX_KEY = credentialKey('llm-pi-ai', 'openai-codex')

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  vi.unstubAllGlobals()
})

// Run this suite against both the pinned alpha.3 packages and DSH 0.1.5-rc.1.
// Use the real adapter: listModels alone does not exercise the modelErrors
// lookup introduced in 0.1.5, but the picker and request preparation do.
describe.each(['source', 'built'] as const)('%s adapter compatibility', artifact => {
  it('resolves and prepares models across fallback, live refresh, and logout', async () => {
    const plugin = artifact === 'source' ? sourcePlugin : await import('../lib/index.js')
    let grant: unknown
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      models: [{ slug: 'gpt-6-astra', display_name: 'Account Astra', visibility: 'list' }],
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
    expect(fallback.length).toBeGreaterThan(1)
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
      ])
    })
    await expect(ctx.llm.resolveModelInfo('openai-codex', 'gpt-6-astra')).resolves.toMatchObject({
      id: 'gpt-6-astra', name: 'Account Astra',
    })
    await expect(adapter.prepareCall('openai-codex', 'gpt-6-astra')).resolves.toMatchObject({
      model: { id: 'gpt-6-astra', name: 'Account Astra' },
    })
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
