/**
 * ChatGPT subscription OAuth command plus a live Codex model route.
 *
 * `dsh-authorization` owns attempt lifecycle and `dsh-llm-pi-ai` owns pi-ai
 * OAuth, PKCE, callback, exchange, refresh, and credential persistence. This
 * plugin owns the account-scoped model catalog and delegates inference to the
 * public pi-ai adapter.
 *
 * @module codex-subscription-oauth-plugin
 */

import type { Context } from '@deepseek-ai/cordis'
import AuthorizationService, {
  AuthorizationDeclinedError,
  type AuthorizationInteraction,
  type AuthorizationNotice,
  type AuthorizationPrompt,
} from '@deepseek-ai/dsh-authorization'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import { resolveImageAttachmentAccess, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { AdapterRegistrationHandle } from '@deepseek-ai/dsh-llm'
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import type { AskUserQuestionAnswer, AskUserQuestionItem } from '@deepseek-ai/dsh-user-questions'
import { createModels, type Api, type Model, type Provider } from '@earendil-works/pi-ai'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import { LiveCodexAdapter } from './adapter.ts'
import {
  accountIdFromAccessToken,
  CodexCatalog,
  type CodexCatalogSnapshot,
} from './catalog.ts'
import { codexAuthContext, credentialStoreFrom } from './credentials.ts'

/** Cordis plugin name. */
export const name = 'codex-subscription-oauth'

/** Services required before the command and model adapter can activate. */
export const inject = ['commands', 'credentials', 'llm', 'userQuestions']

const CODEX_KEY = credentialKey('llm-pi-ai', 'openai-codex')
const COMMAND = '/codex-auth'
const USAGE = `Usage: ${COMMAND}`
const SUCCESS = 'Codex authentication succeeded.'
const CANCELLED = 'Codex authentication cancelled.'
const FAILURE = 'Codex authentication failed.'
const SECRET_PROMPT_FAILURE = 'Codex authentication cannot handle secret prompts.'
const SELECT_PROMPT_FAILURE = 'Codex authentication cannot handle this selection prompt.'
const ANSWER_FAILURE = 'Codex authentication received an unsupported answer.'
const PROMPT_QUESTION = 'Paste the redirect URL or authorization code.'
const PROMPT_ID = 'codex-auth'
const MAX_NOTICES = 8
const MAX_NOTICE_FIELD_CHARS = 4096
const MAX_NOTICE_FIELD_BYTES = 8192
const MAX_NOTICE_AGGREGATE_CHARS = 16384
const MAX_NOTICE_AGGREGATE_BYTES = 32768
const ROUTE = 'openai-codex'
const DEFAULT_REFRESH_INTERVAL_MS = 15 * 60 * 1000
const DEFAULT_REVALIDATE_AFTER_MS = 60 * 1000
const DEFAULT_TIMEOUT_MS = 15 * 1000
const MAX_TIMER_DELAY_MS = 2_147_483_647
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 5 * 60 * 1000
const DEFAULT_MAX_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024
const DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET = 2048 * 2048
const DEFAULT_REQUEST_IMAGE_MAX_BYTES = 1024 * 1024

/** Optional live-catalog timing controls supplied by the bundle patch. */
export interface Config {
  readonly catalog?: {
    readonly refreshIntervalMs?: number
    readonly revalidateAfterMs?: number
    readonly timeoutMs?: number
  }
}

interface ResolvedCatalogConfig {
  readonly refreshIntervalMs: number
  readonly revalidateAfterMs: number
  readonly timeoutMs: number
}

function positiveTimer(value: number | undefined, fallback: number, field: string): number {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved <= 0 || resolved > MAX_TIMER_DELAY_MS) {
    throw new TypeError(`codex-subscription-oauth: catalog.${field} must be a positive timer value`)
  }
  return resolved
}

function resolveCatalogConfig(config: Config): ResolvedCatalogConfig {
  return {
    refreshIntervalMs: positiveTimer(
      config.catalog?.refreshIntervalMs,
      DEFAULT_REFRESH_INTERVAL_MS,
      'refreshIntervalMs',
    ),
    revalidateAfterMs: positiveTimer(
      config.catalog?.revalidateAfterMs,
      DEFAULT_REVALIDATE_AFTER_MS,
      'revalidateAfterMs',
    ),
    timeoutMs: positiveTimer(config.catalog?.timeoutMs, DEFAULT_TIMEOUT_MS, 'timeoutMs'),
  }
}

interface NoticeQueue {
  push(notice: AuthorizationNotice): void
  drain(): readonly AuthorizationNotice[]
  clear(): void
}

/** Whether one untrusted notice field fits both bounded representations. */
function noticeFieldFits(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= MAX_NOTICE_FIELD_CHARS
    && Buffer.byteLength(value, 'utf8') <= MAX_NOTICE_FIELD_BYTES
}

/** Whether the complete rendered notice detail fits the aggregate budget. */
function noticeDetailFits(notices: readonly AuthorizationNotice[]): boolean {
  const detail = renderNoticeDetail(notices)
  return detail !== undefined
    && detail.length <= MAX_NOTICE_AGGREGATE_CHARS
    && Buffer.byteLength(detail, 'utf8') <= MAX_NOTICE_AGGREGATE_BYTES
}

/**
 * Keep notices inside one attempt. Dropping the oldest value preserves the
 * latest authentication instruction without allowing an event producer to
 * grow the queue without bound. Invalid or oversized notices are dropped
 * wholesale rather than truncated, so a URL that fits remains byte-for-byte
 * unchanged and an oversized value is never retained.
 * @returns an attempt-local notice queue.
 */
function createNoticeQueue(): NoticeQueue {
  const notices: AuthorizationNotice[] = []
  let open = true
  return {
    push(notice) {
      if (!open || !noticeFieldFits(notice.message)
        || (notice.url !== undefined && !noticeFieldFits(notice.url))
        || (notice.code !== undefined && !noticeFieldFits(notice.code))) return
      const copy = Object.freeze({
        message: notice.message,
        ...notice.url === undefined ? {} : { url: notice.url },
        ...notice.code === undefined ? {} : { code: notice.code },
      })
      while (notices.length >= MAX_NOTICES || !noticeDetailFits([...notices, copy])) {
        if (notices.length === 0) return
        notices.shift()
      }
      notices.push(copy)
    },
    drain() {
      if (!open) return []
      const drained = notices.splice(0, notices.length)
      return Object.freeze(drained)
    },
    clear() {
      open = false
      notices.length = 0
    },
  }
}

/** Render only the non-secret notice fields into the free-text prompt detail. */
function renderNotice(notice: AuthorizationNotice): string {
  const lines = [notice.message]
  if (notice.url !== undefined) lines.push(`Open: ${notice.url}`)
  if (notice.code !== undefined) lines.push(`Code: ${notice.code}`)
  return lines.join('\n')
}

/** Render queued notices without retaining their source objects. */
function renderNoticeDetail(notices: readonly AuthorizationNotice[]): string | undefined {
  if (notices.length === 0) return undefined
  return notices.map(renderNotice).join('\n\n')
}

/** Combine the command lifetime with the lifetime of the one prompt. */
function promptSignal(invocation: CommandInvocation, prompt: AuthorizationPrompt): AbortSignal {
  const signals = [invocation.signal]
  if (prompt.signal !== undefined) signals.push(prompt.signal)
  return AbortSignal.any(signals)
}

/** Detect the transported and local forms of a user-question cancellation. */
function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { code?: unknown }).code === code
}

/** Extract one free-text answer, retaining the exact submitted string only as the return value. */
function answerText(answer: AskUserQuestionAnswer): string {
  const item = answer.answers.find(candidate => candidate.id === PROMPT_ID)
  if (item === undefined || item.selected.length > 0 || item.custom === undefined) {
    throw new Error(ANSWER_FAILURE)
  }
  if (item.custom.trim().length === 0) throw new AuthorizationDeclinedError()
  return item.custom
}

/** Ask the DSH free-text channel for the manual redirect or code. */
async function askForManualCode(
  ctx: Context,
  invocation: CommandInvocation,
  queue: NoticeQueue,
  prompt: AuthorizationPrompt,
): Promise<string> {
  if (prompt.kind === 'secret') throw new Error(SECRET_PROMPT_FAILURE)
  if (prompt.kind === 'select') {
    if (prompt.options.some(option => option.id === 'browser')) return 'browser'
    throw new Error(SELECT_PROMPT_FAILURE)
  }
  const userQuestions = ctx.get('userQuestions')
  if (userQuestions === undefined) throw new Error(FAILURE)
  const notices = queue.drain()
  const detail = renderNoticeDetail(notices)
  const question: AskUserQuestionItem = {
    id: PROMPT_ID,
    question: PROMPT_QUESTION,
    ...(detail === undefined ? {} : { detail }),
  }
  try {
    const answer = await userQuestions.ask({
      questions: [question],
      agent: invocation.agent,
      signal: promptSignal(invocation, prompt),
    })
    return answerText(answer)
  } catch (error: unknown) {
    // A browser callback withdraws only this manual question. It is not a human
    // decline and must remain distinguishable to the pi-ai flow.
    if (hasCode(error, 'ASK_CANCELLED')) throw new AuthorizationDeclinedError()
    throw error
  }
}

/** Translate a pi-ai prompt into the one supported command interaction. */
function createInteraction(
  ctx: Context,
  invocation: CommandInvocation,
  queue: NoticeQueue,
): AuthorizationInteraction {
  return {
    notify: notice => { queue.push(notice) },
    prompt: prompt => askForManualCode(ctx, invocation, queue, prompt),
  }
}

/** Execute one sanitized Codex authentication command. */
async function execute(invocation: CommandInvocation, ctx: Context): Promise<CommandResult> {
  if (invocation.rawInput.trim().length > 0) return { kind: 'error', text: USAGE }
  if (invocation.signal.aborted) return { kind: 'success', text: CANCELLED }
  const authorization = ctx.get('authorization')
  if (authorization === undefined) return { kind: 'error', text: FAILURE }
  const queue = createNoticeQueue()
  try {
    const outcome = await authorization.begin({
      key: CODEX_KEY,
      method: 'oauth',
      interaction: createInteraction(ctx, invocation, queue),
      signal: invocation.signal,
    })
    return outcome.status === 'authorized'
      ? { kind: 'success', text: SUCCESS }
      : { kind: 'success', text: CANCELLED }
  } catch {
    return invocation.signal.aborted
      ? { kind: 'success', text: CANCELLED }
      : { kind: 'error', text: FAILURE }
  } finally {
    queue.clear()
  }
}

/** Bind one immutable catalog generation to the upstream Codex transport. */
function providerWithModels(
  provider: Provider,
  models: readonly Model<Api>[],
): Provider {
  const generation = Object.freeze([...models])
  return { ...provider, getModels: () => generation }
}

/** Build the one profile shape consumed by DSH's public pi-ai adapter. */
function profileFor(
  provider: Provider,
  models: readonly Model<Api>[],
): ReadonlyMap<string, ResolvedPiAiProviderProfile> {
  return new Map([[
    ROUTE,
    {
      provider: ROUTE,
      displayName: provider.name,
      streamIdleTimeoutMs: DEFAULT_STREAM_IDLE_TIMEOUT_MS,
      maxRequestImageBytes: DEFAULT_MAX_REQUEST_IMAGE_BYTES,
      requestImagePixelBudget: DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
      requestImageMaxBytes: DEFAULT_REQUEST_IMAGE_MAX_BYTES,
      retryPolicy: resolveRetryPolicy(undefined, `codex-subscription-oauth: provider "${ROUTE}" retryPolicy`),
      configuredMaxTokens: new Map(),
      // dsh-llm-pi-ai alpha.3 types its provider through its nested pi-ai
      // 0.84.x copy. The public provider contract is structurally compatible;
      // this plugin intentionally supplies the newer 0.85.x implementation.
      piProvider: providerWithModels(provider, models) as unknown as ResolvedPiAiProviderProfile['piProvider'],
    },
  ]])
}

/** Register the command, dynamic model route, and fallback authorization service. */
export function apply(ctx: Context, config: Config = {}): void {
  const catalogConfig = resolveCatalogConfig(config)
  if (ctx.get('authorization') === undefined) ctx.plugin(AuthorizationService)
  ctx.commands.register({
    name: 'codex-auth',
    description: 'Sign in to ChatGPT for Codex',
    recordInput: false,
    handler: invocation => execute(invocation, ctx),
  })

  const upstream = openaiCodexProvider()
  const auth = {
    credentials: credentialStoreFrom(ctx),
    authContext: codexAuthContext(),
  }
  const authModels = createModels(auth)
  authModels.setProvider(upstream)

  let profiles: ReadonlyMap<string, ResolvedPiAiProviderProfile>
  let registration: AdapterRegistrationHandle | undefined
  const catalog = new CodexCatalog({
    ...catalogConfig,
    baseline: upstream.getModels() as readonly Model<Api>[],
    async resolveCredential(signal) {
      const resolved = await authModels.getAuth(ROUTE, { signal })
      const accessToken = resolved?.auth.apiKey
      if (accessToken === undefined || accessToken.length === 0) return undefined
      // Read again after getAuth: it may have refreshed and atomically replaced
      // the OAuth grant. Prefer its explicit account id, then fall back to the
      // access-token claim used by older grant shapes.
      const stored = await auth.credentials.read(ROUTE, { signal })
      const storedAccountId = stored?.type === 'oauth' ? stored.accountId : undefined
      const accountId = typeof storedAccountId === 'string' && storedAccountId.length > 0
        ? storedAccountId
        : accountIdFromAccessToken(accessToken)
      return {
        accessToken,
        ...(accountId === undefined ? {} : { accountId }),
      }
    },
    onChange(snapshot: CodexCatalogSnapshot) {
      profiles = profileFor(upstream, snapshot.models)
      registration?.replace([ROUTE])
    },
    warn: message => ctx.logger.warn(message),
  })
  profiles = profileFor(upstream, catalog.current.models)
  const adapter = new LiveCodexAdapter({
    profiles: () => profiles,
    resolveApiKey: async () => undefined,
    auth,
    resolveAttachments: () => ctx.get('attachments'),
    resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(
      attachments,
      hostPath => ctx.get('fs')?.processPathFromHostPath(hostPath),
      ref,
    ),
    catalog,
    initialWaitMs: catalogConfig.timeoutMs,
    onReplayDegrade: ({ provider, model, reason }) => {
      ctx.logger.warn(
        `codex-subscription-oauth: unusable replay state on "${provider}/${model}";`
        + ` using provider-neutral history (${reason})`,
      )
    },
  })
  registration = ctx.llm.registerAdapter([ROUTE], adapter)

  ctx.on('credentials/record-updated', key => {
    if (key !== CODEX_KEY) return
    void catalog.forceRefresh()
  })
  ctx.effect(() => () => catalog.stop(), 'codex model catalog')
  void catalog.start()
}
