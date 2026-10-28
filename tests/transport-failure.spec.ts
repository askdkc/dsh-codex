import { afterEach, describe, expect, it, vi } from 'vitest'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import { providerWithModels } from '../src/provider.ts'
import { sockets, sse } from './fixtures/websocket.ts'

const access = `header.${Buffer.from(
  JSON.stringify({
    'https://api.openai.com/auth': { chatgpt_account_id: 'test-account' },
  }),
).toString('base64url')}.signature`

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('real Codex SDK WebSocket boundary', () => {
  it.each(['stream', 'streamSimple'] as const)(
    'settles a provider exception without leaking its message (%s)',
    async method => {
      const upstream = openaiCodexProvider()
      const model = upstream.getModels().find(model => model.id === 'gpt-6-astra')!
      const failing = {
        ...upstream,
        [method]: () => {
          throw new Error('Bearer synthetic-secret')
        },
      }
      const stream = providerWithModels(failing, [model])[method](model, { messages: [] })
      const events = []
      for await (const event of stream) events.push(event)
      expect(events.at(-1)).toMatchObject({ type: 'error', error: { errorMessage: 'Codex provider stream failed' } })
      expect(JSON.stringify(await stream.result())).not.toContain('synthetic-secret')
    },
  )
  it.each(['stream', 'streamSimple'] as const)(
    'falls back once before start and retains safe diagnostics (%s)',
    async method => {
      const { requests } = sockets('before')
      const fetchMock = vi.fn(async () => sse())
      vi.stubGlobal('fetch', fetchMock)
      const upstream = openaiCodexProvider()
      const model = upstream.getModels().find(model => model.id === 'gpt-6-astra')!
      const warn = vi.fn()
      const provider = providerWithModels(upstream, [model], warn)
      const events = []
      for await (const event of provider[method](
        model,
        { messages: [{ role: 'user', content: 'Hi', timestamp: 0 }] },
        {
          apiKey: access,
          env: {},
          transport: 'auto',
          maxRetries: 0,
        },
      ))
        events.push(event)
      expect(events.at(-1)).toMatchObject({ type: 'done' })
      expect(requests).toHaveLength(0)
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('before_message_stream_start'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('sse'))
    },
  )

  it.each(['after', 'tool', 'error'] as const)('does not replay after first provider event (%s)', async mode => {
    const { requests } = sockets(mode)
    const fetchMock = vi.fn(async () => sse())
    vi.stubGlobal('fetch', fetchMock)
    const upstream = openaiCodexProvider()
    const model = upstream.getModels().find(model => model.id === 'gpt-6-astra')!
    const warn = vi.fn()
    const events = []
    const stream = providerWithModels(upstream, [model], warn).streamSimple(
      model,
      {
        messages: [{ role: 'user', content: 'Hi', timestamp: 0 }],
        tools: [{ name: 'lookup', description: 'Read a value', parameters: { type: 'object', properties: {} } }],
      },
      { apiKey: access, env: {}, transport: 'auto', maxRetries: 0 },
    )
    for await (const event of stream) events.push(event)
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      error: { stopReason: 'error', errorMessage: expect.stringContaining('after_message_stream_start') },
    })
    expect((await stream.result()).errorMessage).toContain('after_message_stream_start')
    expect(requests).toHaveLength(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(events.filter(event => event.type === 'toolcall_end')).toHaveLength(mode === 'tool' ? 1 : 0)
    if (mode !== 'error') expect(warn).toHaveBeenCalledWith(expect.stringContaining('1006'))
    expect(JSON.stringify(warn.mock.calls)).not.toContain('synthetic-secret')
    expect(JSON.stringify(events)).not.toContain('Bearer synthetic-secret')
  })

  it('preserves an SSE authentication error after the WS fallback', async () => {
    sockets('before')
    const fetchMock = vi.fn(async () => new Response('{"error":{"message":"Unauthorized"}}', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const upstream = openaiCodexProvider()
    const model = upstream.getModels().find(model => model.id === 'gpt-6-astra')!
    const events = []
    for await (const event of providerWithModels(upstream, [model]).streamSimple(
      model,
      {
        messages: [{ role: 'user', content: 'Hi', timestamp: 0 }],
      },
      { apiKey: access, env: {}, transport: 'auto', maxRetries: 0 },
    ))
      events.push(event)
    expect(events.at(-1)).toMatchObject({ type: 'error', error: { errorMessage: expect.stringContaining('401') } })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([true, false])('keeps cancellation terminal without fallback (before start=%s)', async before => {
    const { requests } = sockets('cancel')
    const fetchMock = vi.fn(async () => sse())
    vi.stubGlobal('fetch', fetchMock)
    const upstream = openaiCodexProvider()
    const model = upstream.getModels().find(model => model.id === 'gpt-6-astra')!
    const controller = new AbortController()
    if (before) controller.abort()
    const events = []
    for await (const event of providerWithModels(upstream, [model]).streamSimple(
      model,
      {
        messages: [{ role: 'user', content: 'Hi', timestamp: 0 }],
      },
      { apiKey: access, env: {}, signal: controller.signal, transport: 'auto', maxRetries: 0 },
    )) {
      events.push(event)
      if (event.type === 'start') controller.abort()
    }
    expect(events.at(-1)).toMatchObject({ type: 'error', error: { stopReason: 'aborted' } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(requests).toHaveLength(before ? 0 : 1)
  })
})
