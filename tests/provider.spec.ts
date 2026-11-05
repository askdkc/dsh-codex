import { describe, expect, it } from 'vitest'
import { normalizeContext, type Provider } from '@earendil-works/pi-ai'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream'
import { providerWithModels } from '../src/provider.ts'

/** Record the normalized context each streaming entry point receives. */
function recordingProvider(calls: unknown[]): Provider {
  const upstream = openaiCodexProvider()
  const record = (_model: unknown, context: unknown): ReturnType<Provider['streamSimple']> => {
    calls.push(context)
    const stream = createAssistantMessageEventStream()
    stream.end()
    return stream
  }
  return { ...upstream, stream: record, streamSimple: record }
}

describe('Codex SDK context boundary', () => {
  it('normalizes a prompt and tools into the leading system message', async () => {
    const calls: unknown[] = []
    const upstream = recordingProvider(calls)
    const model = upstream.getModels().find(candidate => candidate.id === 'gpt-6-astra')!
    const tools = [{ name: 'lookup', description: 'Look up a fact.', parameters: { type: 'object' as const } }]
    const user = { role: 'user' as const, content: 'Hello', timestamp: 1 }

    for await (const _event of providerWithModels(upstream, [model]).streamSimple(model, normalizeContext({
      systemPrompt: 'Base',
      tools,
      messages: [user],
    }))) {
      // The recording provider ends the stream immediately.
    }

    expect(calls).toEqual([{
      messages: [
        { role: 'system', content: 'Base', toolsAdded: tools, timestamp: 0 },
        user,
      ],
    }])
  })

  it('passes an already normalized transcript through without collapsing it', async () => {
    const calls: unknown[] = []
    const upstream = recordingProvider(calls)
    const model = upstream.getModels().find(candidate => candidate.id === 'gpt-6-astra')!
    const context = normalizeContext({
      messages: [
        { role: 'system', content: 'Base', timestamp: 0 },
        { role: 'user', content: 'First', timestamp: 1 },
        { role: 'system', content: 'Later update', timestamp: 2 },
        { role: 'user', content: 'Second', timestamp: 3 },
      ],
    })

    for await (const _event of providerWithModels(upstream, [model]).streamSimple(model, context)) {
      // The recording provider ends the stream immediately.
    }

    expect(calls).toEqual([{ messages: context.messages }])
  })
})
