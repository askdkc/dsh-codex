/** Catalog-aware wrapper around DSH's public pi-ai adapter. */
import { LlmError } from '@deepseek-ai/dsh-llm'
import type {
  LlmModelInfo,
  LlmResolvedModelInfo,
  PreparedAdapterCall,
} from '@deepseek-ai/dsh-llm'
import { PiAiAdapter, type PiAiAdapterOptions } from '@deepseek-ai/dsh-llm-pi-ai'
import type { CodexCatalog } from './catalog.ts'

const ROUTE = 'openai-codex'

export interface LiveCodexAdapterOptions extends PiAiAdapterOptions {
  readonly catalog: CodexCatalog
  readonly initialWaitMs: number
}

/** Revalidate at picker time and force one refresh before rejecting an id. */
export class LiveCodexAdapter extends PiAiAdapter {
  constructor(private readonly options: LiveCodexAdapterOptions) {
    super(options)
  }

  private assertRoute(provider: string): void {
    if (provider !== ROUTE) {
      throw new LlmError(`codex-subscription-oauth: adapter does not own provider "${provider}"`, 'NO_ADAPTER')
    }
  }

  private async ensureModel(provider: string, model: string): Promise<void> {
    this.assertRoute(provider)
    await this.options.catalog.ensureInitial(this.options.initialWaitMs)
    this.options.catalog.revalidateIfNeeded()
    if (this.options.catalog.current.models.some(candidate => candidate.id === model)) return
    await this.options.catalog.forceRefresh()
    if (!this.options.catalog.current.models.some(candidate => candidate.id === model)) {
      throw new LlmError(
        `codex-subscription-oauth: model "${model}" is not in the current executable Codex catalog`,
        'UNKNOWN_MODEL',
      )
    }
  }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    this.assertRoute(provider)
    await this.options.catalog.ensureInitial(this.options.initialWaitMs)
    this.options.catalog.revalidateIfNeeded()
    return super.listModels(provider)
  }

  override async resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    await this.ensureModel(provider, model)
    return super.resolveModel(provider, model, signal)
  }

  override async prepareCall(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<PreparedAdapterCall> {
    await this.ensureModel(provider, model)
    return super.prepareCall(provider, model, signal)
  }
}
