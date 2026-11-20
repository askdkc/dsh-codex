/** Map a picker-visible Codex row to the descriptor required by the transport. */
import type { Api, Model } from '@earendil-works/pi-ai'

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
    api: 'openai-codex-responses',
    provider: 'openai-codex',
    baseUrl: 'https://chatgpt.com/backend-api',
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
