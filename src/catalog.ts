/** Authenticated OpenAI Codex model-catalog refresh and publication. */
import type { Api, Model } from '@earendil-works/pi-ai'

const MODEL_LIST_URL = 'https://chatgpt.com/backend-api/codex/models?client_version=99.99.99'
const MAX_RESPONSE_BYTES = 1024 * 1024
const MAX_MODEL_ID_CHARS = 200
const JWT_CLAIM = 'https://api.openai.com/auth'
const JITTER_RATIO = 0.1

/** Minimal bearer facts needed by the official model-list request. */
export interface CodexCatalogCredential {
  readonly accessToken: string
  readonly accountId?: string
}

/** Immutable currently executable catalog. */
export interface CodexCatalogSnapshot {
  readonly source: 'bundled' | 'live'
  readonly models: readonly Model<Api>[]
  readonly revision: number
}

export interface CodexCatalogOptions {
  readonly baseline: readonly Model<Api>[]
  readonly resolveCredential: (signal: AbortSignal) => Promise<CodexCatalogCredential | undefined>
  readonly refreshIntervalMs: number
  readonly revalidateAfterMs: number
  readonly timeoutMs: number
  readonly fetch?: typeof globalThis.fetch
  readonly now?: () => number
  readonly random?: () => number
  readonly onChange?: (snapshot: CodexCatalogSnapshot) => void
  readonly warn?: (message: string) => void
}

interface OfficialModel {
  readonly slug: string
  readonly name?: string
  readonly priority: number
}

/**
 * Own one live account-scoped list. The official endpoint decides visibility
 * and order; the installed pi-ai catalog decides whether DSH can execute it.
 */
export class CodexCatalog {
  private readonly baseline: readonly Model<Api>[]
  private readonly baselineById: ReadonlyMap<string, Model<Api>>
  private readonly resolveCredential: CodexCatalogOptions['resolveCredential']
  private readonly refreshIntervalMs: number
  private readonly revalidateAfterMs: number
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof globalThis.fetch
  private readonly now: () => number
  private readonly random: () => number
  private readonly onChange: (snapshot: CodexCatalogSnapshot) => void
  private readonly warn: (message: string) => void
  private lifecycle = new AbortController()
  private inFlight: Promise<void> | undefined
  private initial: Promise<void> | undefined
  private timer: NodeJS.Timeout | undefined
  private etag: string | undefined
  private accountId: string | undefined
  private lastCheckedAt: number | undefined
  private disposed = false
  private revision = 0
  private snapshotValue: CodexCatalogSnapshot

  constructor(options: CodexCatalogOptions) {
    this.baseline = Object.freeze([...options.baseline])
    this.baselineById = new Map(this.baseline.map(model => [model.id, model]))
    this.resolveCredential = options.resolveCredential
    this.refreshIntervalMs = options.refreshIntervalMs
    this.revalidateAfterMs = options.revalidateAfterMs
    this.timeoutMs = options.timeoutMs
    this.fetchImpl = options.fetch ?? globalThis.fetch
    this.now = options.now ?? (() => Date.now())
    this.random = options.random ?? Math.random
    this.onChange = options.onChange ?? (() => {})
    this.warn = options.warn ?? (() => {})
    this.snapshotValue = Object.freeze({ source: 'bundled', models: this.baseline, revision: 0 })
  }

  get current(): CodexCatalogSnapshot {
    return this.snapshotValue
  }

  /** Start one initial refresh followed by jittered periodic revalidation. */
  start(): Promise<void> {
    if (this.initial !== undefined) return this.initial
    this.initial = this.refresh().finally(() => {
      if (!this.disposed) this.schedule()
    })
    return this.initial
  }

  /** Stop timers and every in-flight request; late completions cannot publish. */
  stop(): void {
    if (this.disposed) return
    this.disposed = true
    this.lifecycle.abort()
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = undefined
  }

  /** Wait only up to the caller's latency budget for the initial refresh. */
  async ensureInitial(waitMs: number): Promise<void> {
    const initial = this.initial ?? this.start()
    if (waitMs <= 0) return
    let handle: NodeJS.Timeout | undefined
    await Promise.race([
      initial,
      new Promise<void>(resolve => { handle = setTimeout(resolve, waitMs) }),
    ])
    if (handle !== undefined) clearTimeout(handle)
  }

  /** Revalidate in the background when the display-time TTL has elapsed. */
  revalidateIfNeeded(): void {
    if (this.disposed) return
    if (this.lastCheckedAt !== undefined && this.now() - this.lastCheckedAt < this.revalidateAfterMs) return
    void this.refresh()
  }

  /** Force one bounded refresh, joining an already-running request. */
  forceRefresh(): Promise<void> {
    if (this.inFlight !== undefined) return this.inFlight
    this.lastCheckedAt = undefined
    return this.refresh()
  }

  /** Coalesce every caller onto one authenticated list request. */
  refresh(): Promise<void> {
    if (this.disposed) return Promise.resolve()
    if (this.inFlight !== undefined) return this.inFlight
    const task = this.runRefresh()
      .catch(error => {
        if (!this.disposed) this.warn(`codex-subscription-oauth: model catalog refresh failed (${errorCode(error)})`)
      })
      .finally(() => {
        if (this.inFlight === task) this.inFlight = undefined
      })
    this.inFlight = task
    return task
  }

  private async runRefresh(): Promise<void> {
    this.lastCheckedAt = this.now()
    const requestController = new AbortController()
    const abort = (): void => requestController.abort()
    this.lifecycle.signal.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, this.timeoutMs)
    try {
      let credential: CodexCatalogCredential | undefined
      try {
        credential = await this.resolveCredential(requestController.signal)
      } catch (error) {
        if (requestController.signal.aborted) throw error
        throw Object.assign(new Error('catalog authentication failed'), { code: 'AUTH' })
      }
      if (this.disposed || requestController.signal.aborted) return
      if (credential === undefined) {
        this.etag = undefined
        this.accountId = undefined
        this.publish('bundled', this.baseline)
        return
      }
      if (credential.accountId !== this.accountId) {
        // Never carry one account's visibility filter into another account.
        this.etag = undefined
        this.publish('bundled', this.baseline)
      }
      this.accountId = credential.accountId
      let response: Response
      try {
        response = await this.fetchImpl(MODEL_LIST_URL, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${credential.accessToken}`,
            ...(credential.accountId === undefined ? {} : { 'chatgpt-account-id': credential.accountId }),
            ...(this.etag === undefined ? {} : { 'if-none-match': this.etag }),
            originator: 'pi',
            'user-agent': 'dsh-codex/0.1.0',
          },
          redirect: 'error',
          signal: requestController.signal,
        })
      } catch (error) {
        if (requestController.signal.aborted) throw error
        throw Object.assign(new Error('model list network failure'), { code: 'NETWORK' })
      }
      if (response.status === 304) return
      if (!response.ok) throw Object.assign(new Error('HTTP status'), { code: `HTTP_${response.status}` })
      const text = await readBoundedText(response, MAX_RESPONSE_BYTES)
      let payload: unknown
      try {
        payload = JSON.parse(text) as unknown
      } catch {
        throw Object.assign(new Error('invalid model response JSON'), { code: 'INVALID_JSON' })
      }
      const official = parseOfficialModels(payload)
      if (official.length === 0) throw Object.assign(new Error('empty model list'), { code: 'EMPTY_LIST' })
      const models = official
        .map(entry => {
          const baseline = this.baselineById.get(entry.slug)
          if (baseline === undefined) return undefined
          if (entry.name === undefined || entry.name === baseline.name) return baseline
          return Object.freeze({ ...baseline, name: entry.name })
        })
        .filter((model): model is Model<Api> => model !== undefined)
      if (models.length === 0) {
        throw Object.assign(new Error('no executable model metadata'), { code: 'NO_EXECUTABLE_MODELS' })
      }
      this.etag = boundedHeader(response.headers.get('etag'))
      this.publish('live', Object.freeze(models))
    } catch (error) {
      if (requestController.signal.aborted) {
        if (this.disposed) return
        throw Object.assign(new Error('model list timeout'), { code: 'TIMEOUT' })
      }
      throw error
    } finally {
      clearTimeout(timeout)
      this.lifecycle.signal.removeEventListener('abort', abort)
    }
  }

  private publish(source: CodexCatalogSnapshot['source'], models: readonly Model<Api>[]): void {
    if (this.disposed) return
    const previous = this.snapshotValue
    if (previous.source === source && sameModels(previous.models, models)) return
    this.revision += 1
    const snapshot = Object.freeze({ source, models, revision: this.revision })
    this.snapshotValue = snapshot
    this.onChange(snapshot)
  }

  private schedule(): void {
    if (this.disposed) return
    if (this.timer !== undefined) clearTimeout(this.timer)
    const multiplier = 1 - JITTER_RATIO + this.random() * JITTER_RATIO * 2
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.refresh().finally(() => this.schedule())
    }, Math.max(1, Math.round(this.refreshIntervalMs * multiplier)))
  }
}

/** Parse picker-visible entries in official priority order; malformed rows are skipped. */
export function parseOfficialModels(payload: unknown): readonly OfficialModel[] {
  if (!isRecord(payload) || !Array.isArray(payload.models)) {
    throw Object.assign(new Error('invalid model response'), { code: 'INVALID_RESPONSE' })
  }
  const seen = new Set<string>()
  const models: OfficialModel[] = []
  for (const [index, value] of payload.models.entries()) {
    if (!isRecord(value)) continue
    const slug = value.slug
    if (typeof slug !== 'string' || slug.length === 0 || slug.length > MAX_MODEL_ID_CHARS || seen.has(slug)) continue
    if (value.visibility !== 'list') continue
    seen.add(slug)
    const displayName = value.display_name
    const name = typeof displayName === 'string'
      && displayName.length > 0
      && displayName.length <= MAX_MODEL_ID_CHARS
      ? displayName
      : undefined
    const priority = typeof value.priority === 'number' && Number.isSafeInteger(value.priority)
      ? value.priority
      : index
    models.push(Object.freeze({ slug, ...(name === undefined ? {} : { name }), priority }))
  }
  return Object.freeze(models.sort((left, right) => left.priority - right.priority))
}

/** Extract the account id without retaining or exposing any other JWT claim. */
export function accountIdFromAccessToken(accessToken: string): string | undefined {
  try {
    const payload = accessToken.split('.')[1]
    if (payload === undefined) return undefined
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown
    if (!isRecord(decoded) || !isRecord(decoded[JWT_CLAIM])) return undefined
    const accountId = decoded[JWT_CLAIM].chatgpt_account_id
    return typeof accountId === 'string' && accountId.length > 0 ? accountId : undefined
  } catch {
    return undefined
  }
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? Number.NaN)
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel()
    throw Object.assign(new Error('response too large'), { code: 'TOO_LARGE' })
  }
  if (response.body === null) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) throw Object.assign(new Error('response too large'), { code: 'TOO_LARGE' })
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(result)
}

function boundedHeader(value: string | null): string | undefined {
  return value !== null && value.length > 0 && value.length <= 1024 ? value : undefined
}

function sameModels(left: readonly Model<Api>[], right: readonly Model<Api>[]): boolean {
  return left.length === right.length && left.every((model, index) => {
    const candidate = right[index]
    return model.id === candidate?.id && model.name === candidate.name
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code.slice(0, 80)
  }
  return 'UNKNOWN'
}
