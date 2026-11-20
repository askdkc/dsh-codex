/** Map a picker-visible Codex row to the descriptor required by the transport. */
import type { Api, Model } from '@earendil-works/pi-ai'

const BASE_URL = 'https://chatgpt.com/backend-api'
const PROVIDER = 'openai-codex'
const API = 'openai-codex-responses'
const MAX_TOKENS = 128_000
const LONG_CONTEXT_INPUT_TOKENS = 272_000

/** Every Codex chat model exposes these reasoning levels; `minimal` maps to `low`. */
const THINKING_LEVEL_MAP = Object.freeze({
  off: null,
  minimal: 'low',
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max',
})

const COMPAT = Object.freeze({
  supportsOpenAIGrammarTools: true,
  supportsAdditionalTools: true,
  supportsToolSearch: true,
  supportsMidConvoSystemMessages: true,
})

const IMAGE_RESIZE = Object.freeze({ maxWidth: 2000, maxHeight: 2000, maxBytes: 4_718_592, jpegQuality: 80 })

/** Prices are US dollars per million tokens, as published on the pricing page. */
interface CodexModelSpec {
  readonly id: string
  readonly name: string
  readonly contextWindow: number
  readonly input: readonly ('text' | 'image')[]
  readonly cost: Model<Api>['cost']
}

const SUPPLEMENTAL_MODELS: readonly CodexModelSpec[] = [
  {
    id: 'gpt-6.2-sol',
    name: 'GPT-6.2 Sol',
    contextWindow: 500_000,
    input: ['text', 'image'],
    cost: {
      input: 2,
      output: 10,
      cacheRead: 0.1,
      cacheWrite: 2.5,
      tiers: [{ inputTokensAbove: LONG_CONTEXT_INPUT_TOKENS, input: 4, output: 15, cacheRead: 0.2, cacheWrite: 5 }],
    },
  },
  {
    id: 'gpt-6.2-astra',
    name: 'GPT-6.2 Astra',
    contextWindow: 272_000,
    input: ['text', 'image'],
    cost: {
      input: 8,
      output: 40,
      cacheRead: 0.4,
      cacheWrite: 10,
      tiers: [{ inputTokensAbove: LONG_CONTEXT_INPUT_TOKENS, input: 16, output: 60, cacheRead: 0.8, cacheWrite: 20 }],
    },
  },
]

function toModel(spec: CodexModelSpec): Model<Api> {
  return Object.freeze({
    id: spec.id,
    name: spec.name,
    api: API,
    provider: PROVIDER,
    baseUrl: BASE_URL,
    reasoning: true,
    input: [...spec.input],
    cost: spec.cost,
    contextWindow: spec.contextWindow,
    maxTokens: MAX_TOKENS,
    thinkingLevelMap: THINKING_LEVEL_MAP,
    compat: COMPAT,
    inputLimits: { images: { resize: IMAGE_RESIZE } },
    type: 'chat' as const,
  })
}

/**
 * Append supplements the bundled catalog is missing, keeping its own entry when
 * pi-ai later ships the same id so this table can only add coverage.
 */
export function withSupplementalCodexModels(
  models: readonly Model<Api>[],
): readonly Model<Api>[] {
  const known = new Set(models.map(model => model.id))
  const missing = SUPPLEMENTAL_MODELS.filter(spec => !known.has(spec.id))
  if (missing.length === 0) return Object.freeze([...models])
  return Object.freeze([...models, ...missing.map(toModel)])
}

const levels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const

export function liveCodexModel(
  id: string,
  name: string | undefined,
  row: Record<string, unknown>,
  known?: Model<Api>,
): Model<Api> {
  const input = Array.isArray(row.input_modalities)
    ? row.input_modalities.filter(value => value === 'text' || value === 'image')
    : []
  const efforts = Array.isArray(row.supported_reasoning_levels)
    ? row.supported_reasoning_levels.map(value => value?.effort)
    : undefined
  const contextWindow = capacity(row.context_window) ?? known?.contextWindow ?? 8192
  return {
    api: API,
    provider: PROVIDER,
    baseUrl: BASE_URL,
    // The subscription catalog supplies no API pricing for unrecognized IDs.
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    reasoning: false,
    ...known,
    id,
    name: name ?? known?.name ?? id,
    contextWindow,
    maxTokens: capacity(row.max_output_tokens) ?? known?.maxTokens ?? Math.min(4096, contextWindow),
    input: input.length ? input : known?.input ?? ['text'],
    ...(efforts === undefined ? {} : {
      reasoning: levels.some(level => level !== 'off' && efforts.includes(level)),
      thinkingLevelMap: Object.fromEntries(levels.map(level => [level, efforts.includes(level) ? level : null])),
    }),
    ...(row.tool_mode === 'code_mode_only' ? {
      compat: { ...known?.compat, supportsAdditionalTools: true, supportsMidConvoSystemMessages: true },
    } : {}),
  }
}

function capacity(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
}
