/** Compatibility boundary between the host SDK and the bundled Codex SDK. */
import type { Api, Context, Message, Model, Provider, TextContent, Tool } from '@earendil-works/pi-ai'

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
    const text = typeof message.content === 'string'
      ? message.content
      : message.content.map(block => block.text).join('\n')
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
export function providerWithModels(provider: Provider, models: readonly Model<Api>[]): Provider {
  const generation = Object.freeze([...models])
  return {
    ...provider,
    getModels: () => generation,
    stream: (model, context, options) => provider.stream(model, toBundledCodexContext(context), options),
    streamSimple: (model, context, options) => provider.streamSimple(model, toBundledCodexContext(context), options),
  }
}
