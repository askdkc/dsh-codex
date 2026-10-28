import { afterEach, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import * as plugin from '../lib/index.js'
import { sockets, sse } from './fixtures/websocket.ts'

const contexts: Context[] = []
const access = `header.${Buffer.from(
  JSON.stringify({
    'https://api.openai.com/auth': { chatgpt_account_id: 'test-account' },
  }),
).toString('base64url')}.signature`

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  vi.unstubAllGlobals()
})

it.each(['before', 'after', 'tool', 'error', 'cancel', 'cancel-before'] as const)(
  'packed-code adapter retains %s diagnostics without replay',
  async mode => {
    const controller = new AbortController()
    const { requests } = sockets(mode === 'cancel-before' ? 'cancel' : mode, () => controller.abort())
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (!String(url).includes('/codex/models')) {
        if (mode === 'before') return sse()
        throw new Error('Unexpected SSE replay')
      }
      return new Response(JSON.stringify({ models: [{ slug: 'gpt-6.1-terra', visibility: 'list' }] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(LlmRuntime)
    ctx.provide('commands', { register: vi.fn() } as never)
    ctx.provide('userQuestions', { ask: vi.fn() } as never)
    ctx.provide('authorization', {} as never)
    ctx.provide('credentials', {
      readRecord: async () => ({
        kind: 'grant',
        payload: {
          type: 'oauth',
          access,
          refresh: 'synthetic-refresh',
          expires: Date.now() + 3_600_000,
          accountId: 'test-account',
        },
      }),
    } as never)
    const register = vi.spyOn(ctx.llm, 'registerAdapter')
    await ctx.plugin(plugin)
    const prepared = await register.mock.calls[0]![1].prepareCall('openai-codex', 'gpt-6.1-terra')
    if (mode === 'cancel-before') controller.abort()
    const chunks = []
    for await (const chunk of prepared.stream({
      provider: 'openai-codex',
      model: 'gpt-6.1-terra',
      system: 'Answer briefly.',
      signal: controller.signal,
      tools: [{ name: 'lookup', description: 'Read a value', parameters: { type: 'object', properties: {} } }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
    }))
      chunks.push(chunk)
    if (mode === 'before') {
      expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'stop' } })
      expect(fetchMock.mock.calls.filter(([url]) => !String(url).includes('/codex/models'))).toHaveLength(1)
    } else if (mode === 'cancel' || mode === 'cancel-before') {
      expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'aborted' } })
    } else {
      expect(chunks.at(-1)).toMatchObject({
        type: 'finish',
        reason: {
          kind: 'error',
          failure: {
            code: 'PI_AI_ERROR',
            message: expect.stringContaining('after_message_stream_start'),
          },
        },
      })
    }
    expect(requests).toHaveLength(mode === 'before' || mode === 'cancel-before' ? 0 : 1)
    if (mode !== 'before')
      expect(fetchMock.mock.calls.every(([url]) => String(url).includes('/codex/models'))).toBe(true)
    expect(JSON.stringify(chunks)).not.toContain('synthetic-secret')
  },
)
