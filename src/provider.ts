/** Compatibility boundary between the host SDK and the bundled Codex SDK. */
import type { Api, Context, Message, Model, Provider, ProviderResponse, TextContent, Tool } from '@earendil-works/pi-ai'
import {
  createAssistantMessageEventStream,
  type AssistantMessageEventStream,
} from '@earendil-works/pi-ai/utils/event-stream'

/** System transcript introduced by pi-ai 0.87; 0.85 uses envelope fields. */
interface TranscriptSystemMessage {
  readonly role: 'system'
  readonly content: string | TextContent[]
  readonly sections?: Record<string, string | null>
  readonly toolsAdded?: Tool[]
  readonly toolsRemoved?: { name: string }[]
  readonly timestamp: number
}

type HostContext = Omit<Context, 'messages'> & {
  messages: (Message | TranscriptSystemMessage)[]
}

/** Replay system deltas into the prompt/tools envelope understood by SDK 0.85. */
export function toBundledCodexContext(context: HostContext): Context {
  if (!context.messages.some(message => message.role === 'system')) return context as Context
  const instructions = context.systemPrompt ? [context.systemPrompt] : []
  const sections = new Map<string, string>()
  const tools = new Map((context.tools ?? []).map(tool => [tool.name, tool]))
  const messages: Message[] = []
  for (const message of context.messages) {
    if (message.role !== 'system') {
      messages.push(message)
      continue
    }
    const text =
      typeof message.content === 'string' ? message.content : message.content.map(block => block.text).join('\n')
    if (text.length > 0) instructions.push(text)
    for (const [name, value] of Object.entries(message.sections ?? {})) {
      if (value === null) sections.delete(name)
      else sections.set(name, value)
    }
    for (const tool of message.toolsRemoved ?? []) tools.delete(tool.name)
    for (const tool of message.toolsAdded ?? []) tools.set(tool.name, tool)
  }
  const systemPrompt = [...instructions, ...sections.values()].filter(text => text.length > 0).join('\n\n')
  return {
    messages,
    ...(systemPrompt.length === 0 ? {} : { systemPrompt }),
    ...(tools.size === 0 ? {} : { tools: [...tools.values()] }),
  }
}

/** Freeze a catalog generation and bridge both provider streaming entry points. */
export function providerWithModels(
  provider: Provider,
  models: readonly Model<Api>[],
  warn: (message: string) => void = () => {},
): Provider {
  const generation = Object.freeze([...models])
  // DSH's pi-ai adapter drops SDK diagnostics on terminal errors. Preserve a
  // small, redacted summary in the error and logger without retrying a request.
  function observed(
    model: Model<Api>,
    run: (onResponse: (response: ProviderResponse) => void) => AssistantMessageEventStream,
  ): AssistantMessageEventStream {
    const stream = createAssistantMessageEventStream()
    let httpStatus: number | undefined
    void (async () => {
      for await (const event of run(response => {
        httpStatus = response.status
      })) {
        if (event.type !== 'done' && event.type !== 'error') {
          stream.push(event)
          continue
        }
        const message = event.type === 'done' ? event.message : event.error
        const diagnostics = message.diagnostics?.map(diagnostic => {
          if (diagnostic.type !== 'provider_transport_failure') return diagnostic
          const details = diagnostic.details ?? {}
          const safe: Record<string, string | number | boolean> = {}
          for (const key of ['configuredTransport', 'fallbackTransport'] as const) {
            if (['auto', 'sse', 'websocket', 'websocket-cached'].includes(String(details[key])))
              safe[key] = String(details[key])
          }
          if (details.phase === 'before_message_stream_start' || details.phase === 'after_message_stream_start')
            safe.phase = details.phase
          if (typeof details.eventsEmitted === 'boolean') safe.eventsEmitted = details.eventsEmitted
          if (Number.isSafeInteger(details.requestBytes) && Number(details.requestBytes) >= 0)
            safe.requestBytes = Number(details.requestBytes)
          const code = diagnostic.error?.code
          if (
            (typeof code === 'number' && Number.isSafeInteger(code)) ||
            (typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code))
          )
            safe.code = code
          const summary = `Codex WebSocket failure ${JSON.stringify(safe)}`
          warn(summary)
          return { type: diagnostic.type, timestamp: diagnostic.timestamp, error: { message: summary }, details: safe }
        })
        const failures = diagnostics?.filter(diagnostic => diagnostic.type === 'provider_transport_failure') ?? []
        const terminal = {
          ...message,
          ...(diagnostics === undefined ? {} : { diagnostics }),
          // Preserve the host's non-retryable classification after a stream
          // started: neither this wrapper nor the host may replay tool output.
          ...(message.stopReason !== 'aborted' &&
          event.type === 'error' &&
          failures.some(diagnostic => diagnostic.details?.phase === 'after_message_stream_start')
            ? { errorMessage: failures.map(diagnostic => diagnostic.error?.message).join('; ') }
            : {}),
        }
        if (
          event.type === 'error' &&
          message.stopReason !== 'aborted' &&
          httpStatus !== undefined &&
          httpStatus >= 400
        ) {
          // The SDK may flatten HTTP 401 into just "Unauthorized". Retain the
          // status so the host can classify it, without logging response bodies.
          terminal.errorMessage = `Codex HTTP ${httpStatus} failure`
          warn(terminal.errorMessage)
        }
        // SDK start/partial events share this output object. Redact it too,
        // rather than leaving a raw close reason in an earlier event/result.
        Object.assign(message, terminal)
        stream.push(event.type === 'done' ? { ...event, message: terminal } : { ...event, error: terminal })
      }
      stream.end()
    })().catch(() => {
      stream.push({
        type: 'error',
        reason: 'error',
        error: {
          role: 'assistant',
          content: [],
          api: model.api,
          provider: model.provider,
          model: model.id,
          timestamp: Date.now(),
          stopReason: 'error',
          errorMessage: 'Codex provider stream failed',
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          },
        },
      })
      stream.end()
    })
    return stream
  }
  return {
    ...provider,
    getModels: () => generation,
    stream: (model, context, options) =>
      observed(model, onResponse =>
        provider.stream(model, toBundledCodexContext(context), {
          ...options,
          onResponse: (response, responseModel) => {
            onResponse(response)
            return options?.onResponse?.(response, responseModel)
          },
        } as typeof options),
      ),
    streamSimple: (model, context, options) =>
      observed(model, onResponse =>
        provider.streamSimple(model, toBundledCodexContext(context), {
          ...options,
          onResponse: (response, responseModel) => {
            onResponse(response)
            return options?.onResponse?.(response, responseModel)
          },
        } as typeof options),
      ),
  }
}
