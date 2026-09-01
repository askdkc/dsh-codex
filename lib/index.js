import AuthorizationService, { AuthorizationDeclinedError } from "@deepseek-ai/dsh-authorization";
import { credentialKey } from "@deepseek-ai/dsh-credentials";
//#region src/index.ts
/** Cordis plugin name. */
const name = "codex-subscription-oauth";
/** Services required before the command adapter can activate. */
const inject = [
	"commands",
	"credentials",
	"userQuestions"
];
const CODEX_KEY = credentialKey("llm-pi-ai", "openai-codex");
const USAGE = `Usage: /codex-auth`;
const SUCCESS = "Codex authentication succeeded.";
const CANCELLED = "Codex authentication cancelled.";
const FAILURE = "Codex authentication failed.";
const SECRET_PROMPT_FAILURE = "Codex authentication cannot handle secret prompts.";
const SELECT_PROMPT_FAILURE = "Codex authentication cannot handle this selection prompt.";
const ANSWER_FAILURE = "Codex authentication received an unsupported answer.";
const PROMPT_QUESTION = "Paste the redirect URL or authorization code.";
const PROMPT_ID = "codex-auth";
const MAX_NOTICES = 8;
const MAX_NOTICE_FIELD_CHARS = 4096;
const MAX_NOTICE_FIELD_BYTES = 8192;
const MAX_NOTICE_AGGREGATE_CHARS = 16384;
const MAX_NOTICE_AGGREGATE_BYTES = 32768;
/** Whether one untrusted notice field fits both bounded representations. */
function noticeFieldFits(value) {
	return typeof value === "string" && value.length <= MAX_NOTICE_FIELD_CHARS && Buffer.byteLength(value, "utf8") <= MAX_NOTICE_FIELD_BYTES;
}
/** Whether the complete rendered notice detail fits the aggregate budget. */
function noticeDetailFits(notices) {
	const detail = renderNoticeDetail(notices);
	return detail !== void 0 && detail.length <= MAX_NOTICE_AGGREGATE_CHARS && Buffer.byteLength(detail, "utf8") <= MAX_NOTICE_AGGREGATE_BYTES;
}
/**
* Keep notices inside one attempt. Dropping the oldest value preserves the
* latest authentication instruction without allowing an event producer to
* grow the queue without bound. Invalid or oversized notices are dropped
* wholesale rather than truncated, so a URL that fits remains byte-for-byte
* unchanged and an oversized value is never retained.
* @returns an attempt-local notice queue.
*/
function createNoticeQueue() {
	const notices = [];
	let open = true;
	return {
		push(notice) {
			if (!open || !noticeFieldFits(notice.message) || notice.url !== void 0 && !noticeFieldFits(notice.url) || notice.code !== void 0 && !noticeFieldFits(notice.code)) return;
			const copy = Object.freeze({
				message: notice.message,
				...notice.url === void 0 ? {} : { url: notice.url },
				...notice.code === void 0 ? {} : { code: notice.code }
			});
			while (notices.length >= MAX_NOTICES || !noticeDetailFits([...notices, copy])) {
				if (notices.length === 0) return;
				notices.shift();
			}
			notices.push(copy);
		},
		drain() {
			if (!open) return [];
			const drained = notices.splice(0, notices.length);
			return Object.freeze(drained);
		},
		clear() {
			open = false;
			notices.length = 0;
		}
	};
}
/** Render only the non-secret notice fields into the free-text prompt detail. */
function renderNotice(notice) {
	const lines = [notice.message];
	if (notice.url !== void 0) lines.push(`Open: ${notice.url}`);
	if (notice.code !== void 0) lines.push(`Code: ${notice.code}`);
	return lines.join("\n");
}
/** Render queued notices without retaining their source objects. */
function renderNoticeDetail(notices) {
	if (notices.length === 0) return void 0;
	return notices.map(renderNotice).join("\n\n");
}
/** Combine the command lifetime with the lifetime of the one prompt. */
function promptSignal(invocation, prompt) {
	const signals = [invocation.signal];
	if (prompt.signal !== void 0) signals.push(prompt.signal);
	return AbortSignal.any(signals);
}
/** Detect the transported and local forms of a user-question cancellation. */
function hasCode(error, code) {
	return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
/** Extract one free-text answer, retaining the exact submitted string only as the return value. */
function answerText(answer) {
	const item = answer.answers.find((candidate) => candidate.id === PROMPT_ID);
	if (item === void 0 || item.selected.length > 0 || item.custom === void 0) throw new Error(ANSWER_FAILURE);
	if (item.custom.trim().length === 0) throw new AuthorizationDeclinedError();
	return item.custom;
}
/** Ask the DSH free-text channel for the manual redirect or code. */
async function askForManualCode(ctx, invocation, queue, prompt) {
	if (prompt.kind === "secret") throw new Error(SECRET_PROMPT_FAILURE);
	if (prompt.kind === "select") {
		if (prompt.options.some((option) => option.id === "browser")) return "browser";
		throw new Error(SELECT_PROMPT_FAILURE);
	}
	const userQuestions = ctx.get("userQuestions");
	if (userQuestions === void 0) throw new Error(FAILURE);
	const detail = renderNoticeDetail(queue.drain());
	const question = {
		id: PROMPT_ID,
		question: PROMPT_QUESTION,
		...detail === void 0 ? {} : { detail }
	};
	try {
		return answerText(await userQuestions.ask({
			questions: [question],
			agent: invocation.agent,
			signal: promptSignal(invocation, prompt)
		}));
	} catch (error) {
		if (hasCode(error, "ASK_CANCELLED")) throw new AuthorizationDeclinedError();
		throw error;
	}
}
/** Translate a pi-ai prompt into the one supported command interaction. */
function createInteraction(ctx, invocation, queue) {
	return {
		notify: (notice) => {
			queue.push(notice);
		},
		prompt: (prompt) => askForManualCode(ctx, invocation, queue, prompt)
	};
}
/** Execute one sanitized Codex authentication command. */
async function execute(invocation, ctx) {
	if (invocation.rawInput.trim().length > 0) return {
		kind: "error",
		text: USAGE
	};
	if (invocation.signal.aborted) return {
		kind: "success",
		text: CANCELLED
	};
	const authorization = ctx.get("authorization");
	if (authorization === void 0) return {
		kind: "error",
		text: FAILURE
	};
	const queue = createNoticeQueue();
	try {
		return (await authorization.begin({
			key: CODEX_KEY,
			method: "oauth",
			interaction: createInteraction(ctx, invocation, queue),
			signal: invocation.signal
		})).status === "authorized" ? {
			kind: "success",
			text: SUCCESS
		} : {
			kind: "success",
			text: CANCELLED
		};
	} catch {
		return invocation.signal.aborted ? {
			kind: "success",
			text: CANCELLED
		} : {
			kind: "error",
			text: FAILURE
		};
	} finally {
		queue.clear();
	}
}
/** Register the command and own the fallback authorization service, if needed. */
function apply(ctx) {
	if (ctx.get("authorization") === void 0) ctx.plugin(AuthorizationService);
	ctx.commands.register({
		name: "codex-auth",
		description: "Sign in to ChatGPT for Codex",
		recordInput: false,
		handler: (invocation) => execute(invocation, ctx)
	});
}
//#endregion
export { apply, inject, name };
