import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import * as sourcePlugin from '../src/index.ts'
import type { Context as PiContext } from '@earendil-works/pi-ai'

// SDK 0.87 normalizes the host's prompt/tools into a system transcript entry
// before calling the plugin-owned provider, whose bundled SDK is 0.85.
vi.mock('@earendil-works/pi-ai/providers/all', async importOriginal => {
  const actual = await importOriginal<typeof import('@earendil-works/pi-ai/providers/all')>()
  return { ...actual, builtinModels: (...args: Parameters<typeof actual.builtinModels>) => {
    const models = actual.builtinModels(...args)
    const streamSimple = models.streamSimple.bind(models)
    models.streamSimple = (model, context, options) => streamSimple(model, {
      messages: [{ role: 'system', content: context.systemPrompt ?? '', toolsAdded: context.tools, timestamp: 0 }, ...context.messages],
    } as unknown as PiContext, options)
    return models
  } }
})

const contexts: Context[] = []
const access = `header.${Buffer.from(JSON.stringify({
  'https://api.openai.com/auth': { chatgpt_account_id: 'test-account' },
})).toString('base64url')}.signature`

function reply(): Response {
  const item = { type: 'message', id: 'msg_test', role: 'assistant', content: [{ type: 'output_text', text: 'OK' }] }
  const events = [
    { type: 'response.output_item.added', output_index: 0, item: { ...item, content: [] } },
    { type: 'response.output_text.delta', output_index: 0, content_index: 0, delta: 'OK' },
    { type: 'response.output_item.done', output_index: 0, item },
    { type: 'response.completed', response: {
      id: 'resp_test', status: 'completed', output: [item],
      usage: { input_tokens: 10, output_tokens: 1, total_tokens: 11 },
    } },
  ]
  return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''), {
    headers: { 'content-type': 'text/event-stream' },
  })
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  vi.unstubAllGlobals()
})

describe.each(['source', 'built'] as const)('%s Codex transport', artifact => {
  it.each([
    ['gpt-6-luna', false], ['gpt-6-luna', true],
    ['gpt-6.1-sol', false], ['gpt-6.1-sol', true],
  ] as const)('sends %s with system instructions (tools=%s) through the real adapter and SDK', async (model, withTools) => {
    const plugin = artifact === 'source' ? sourcePlugin : await import('../lib/index.js')
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes('/codex/models')) return new Response(JSON.stringify({
        models: [{ slug: model, visibility: 'list' }],
      }))
      const { zstdDecompressSync } = await import('node:zlib')
      const body = init?.body instanceof Uint8Array
        ? zstdDecompressSync(init.body).toString()
        : String(init?.body)
      const payload = JSON.parse(body)
      expect(payload).toMatchObject({
        model, instructions: 'Answer briefly.',
        ...(withTools ? { tools: [{ type: 'function', name: 'lookup', parameters: { type: 'object' } }] } : {}),
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'バーニラバニラバーニラ！' }] }],
      })
      if (!withTools) expect(payload).not.toHaveProperty('tools')
      return reply()
    })
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(LlmRuntime)
    ctx.provide('commands', { register: vi.fn() } as never)
    ctx.provide('userQuestions', { ask: vi.fn() } as never)
    ctx.provide('authorization', {} as never)
    ctx.provide('credentials', { readRecord: async () => ({ kind: 'grant', payload: {
      type: 'oauth', access, refresh: 'synthetic-refresh', expires: Date.now() + 3_600_000,
      accountId: 'test-account',
    } }) } as never)
    const register = vi.spyOn(ctx.llm, 'registerAdapter')
    await ctx.plugin(plugin)
    const adapter = register.mock.calls[0]![1]
    const prepared = await adapter.prepareCall('openai-codex', model)
    const chunks = []
    for await (const chunk of prepared.stream({
      provider: 'openai-codex', model, system: 'Answer briefly.',
      ...(withTools ? { tools: [{ name: 'lookup', description: 'Look up a fact.', parameters: { type: 'object' as const, properties: {} } }] } : {}),
      messages: [{ role: 'user', content: [{ type: 'text', text: 'バーニラバニラバーニラ！' }] }],
    })) chunks.push(chunk)
    expect(chunks).toContainEqual(expect.objectContaining({ type: 'text-delta', text: 'OK' }))
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'stop' } })
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/codex/responses'))).toBe(true)
  })
})
