/**
 * Host-only `/codex-auth` command for the ChatGPT subscription OAuth flow.
 *
 * The plugin owns only the human-command adapter. `dsh-authorization` owns
 * attempt lifecycle, while `dsh-llm-pi-ai` owns pi-ai OAuth, PKCE, callback,
 * exchange, refresh, and credential persistence.
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
import type { AskUserQuestionAnswer, AskUserQuestionItem } from '@deepseek-ai/dsh-user-questions'

/** Cordis plugin name. */
export const name = 'codex-subscription-oauth'

/** Services required before the command adapter can activate. */
export const inject = ['commands', 'credentials', 'userQuestions']

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

/** Register the command and own the fallback authorization service, if needed. */
export function apply(ctx: Context): void {
  if (ctx.get('authorization') === undefined) ctx.plugin(AuthorizationService)
  ctx.commands.register({
    name: 'codex-auth',
    description: 'Sign in to ChatGPT for Codex',
    recordInput: false,
    handler: invocation => execute(invocation, ctx),
  })
}
