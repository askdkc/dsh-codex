//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/event-stream.js
var FifoQueue = class {
	incoming = [];
	outgoing = [];
	get length() {
		return this.incoming.length + this.outgoing.length;
	}
	enqueue(value) {
		this.incoming.push(value);
	}
	dequeue() {
		if (this.outgoing.length === 0) while (this.incoming.length > 0) this.outgoing.push(this.incoming.pop());
		return this.outgoing.pop();
	}
};
var EventStream = class {
	queue = new FifoQueue();
	waiting = new FifoQueue();
	done = false;
	finalResultPromise;
	resolveFinalResult;
	isComplete;
	extractResult;
	constructor(isComplete, extractResult) {
		this.isComplete = isComplete;
		this.extractResult = extractResult;
		this.finalResultPromise = new Promise((resolve) => {
			this.resolveFinalResult = resolve;
		});
	}
	push(event) {
		if (this.done) return;
		if (this.isComplete(event)) {
			this.done = true;
			this.resolveFinalResult(this.extractResult(event));
		}
		const waiter = this.waiting.dequeue();
		if (waiter) waiter({
			value: event,
			done: false
		});
		else this.queue.enqueue(event);
	}
	end(result) {
		this.done = true;
		if (result !== void 0) this.resolveFinalResult(result);
		while (this.waiting.length > 0) this.waiting.dequeue()({
			value: void 0,
			done: true
		});
	}
	async *[Symbol.asyncIterator]() {
		while (true) if (this.queue.length > 0) yield this.queue.dequeue();
		else if (this.done) return;
		else {
			const result = await new Promise((resolve) => this.waiting.enqueue(resolve));
			if (result.done) return;
			yield result.value;
		}
	}
	result() {
		return this.finalResultPromise;
	}
};
/**
* Event stream of one assistant response. It also times the response: the final message (`done` or `error` event, or
* the result passed to `end()`) gets `durationMs`, measured with a monotonic clock from the stream's creation, unless
* the message already has one or its `timestamp` predates the stream. A stream that forwards a response which started
* elsewhere, such as a deferred result fetched later, therefore leaves it untimed.
*/
var AssistantMessageEventStream = class extends EventStream {
	#startedAt = Date.now();
	#startedAtMonotonic = performance.now();
	constructor() {
		super((event) => event.type === "done" || event.type === "error", (event) => {
			if (event.type === "done") return event.message;
			else if (event.type === "error") return event.error;
			throw new Error("Unexpected event type for final result");
		});
	}
	push(event) {
		if (event.type === "done") this.#time(event.message);
		else if (event.type === "error") this.#time(event.error);
		super.push(event);
	}
	end(result) {
		if (result !== void 0) this.#time(result);
		super.end(result);
	}
	#time(message) {
		if (this.done || message.durationMs !== void 0 || message.timestamp < this.#startedAt) return;
		message.durationMs = Math.max(0, Math.round(performance.now() - this.#startedAtMonotonic));
	}
};
/** Factory function for AssistantMessageEventStream (for use in extensions) */
function createAssistantMessageEventStream() {
	return new AssistantMessageEventStream();
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/api/lazy.js
function createSetupErrorMessage(model, error, timestamp) {
	return {
		role: "assistant",
		content: [],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				total: 0
			}
		},
		stopReason: "error",
		errorMessage: error instanceof Error ? error.message : String(error),
		timestamp
	};
}
function hasResult(source) {
	return typeof source.result === "function";
}
async function forwardStream(target, source, observer, observeResult) {
	let result;
	for await (const event of source) {
		target.push(event);
		observer?.onEvent?.(event);
		if (event.type === "done") result = event.message;
		else if (event.type === "error") result = event.error;
	}
	if (hasResult(source)) result = await source.result();
	target.end(result);
	observeResult(result);
}
/**
* Returns a stream synchronously while running async setup (auth resolution,
* lazy module loading) behind it. Setup failures terminate the stream with an
* error event.
*/
function lazyStream(model, setup, observer) {
	const startedAt = Date.now();
	const outer = new AssistantMessageEventStream();
	let observedResult = false;
	const observeResult = (result) => {
		if (observedResult) return;
		observedResult = true;
		observer?.onResult?.(result);
	};
	setup().then((inner) => forwardStream(outer, inner, observer, observeResult)).catch((error) => {
		const message = createSetupErrorMessage(model, error, startedAt);
		const event = {
			type: "error",
			reason: "error",
			error: message
		};
		outer.push(event);
		observer?.onEvent?.(event);
		outer.end(message);
		observeResult(message);
	});
	return outer;
}
function lazyApi(load, capabilities) {
	const api = {
		stream: (model, context, options) => lazyStream(model, async () => (await load()).stream(model, context, options)),
		streamSimple: (model, context, options) => lazyStream(model, async () => (await load()).streamSimple(model, context, options))
	};
	if (capabilities?.fetchDeferred) api.fetchDeferred = (model, handle, options) => lazyStream(model, async () => {
		const implementation = await load();
		if (!implementation.fetchDeferred) throw new Error("API does not support deferred responses");
		return implementation.fetchDeferred(model, handle, options);
	});
	if (capabilities?.cancelDeferred) api.cancelDeferred = async (model, handle, options) => {
		const implementation = await load();
		if (!implementation.cancelDeferred) throw new Error("API cannot cancel deferred responses");
		await implementation.cancelDeferred(model, handle, options);
	};
	return api;
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/auth/context.js
var __rewriteRelativeImportExtension = function(path, preserveJsx) {
	if (typeof path === "string" && /^\.\.?\//.test(path)) return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
		return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
	});
	return path;
};
const importNodeModule = (specifier) => import(__rewriteRelativeImportExtension(specifier));
function getProcessEnv() {
	return globalThis.process?.env;
}
/**
* Default auth context: env vars from `process.env` (undefined in browsers),
* file existence via node:fs (always false in browsers).
*/
function defaultProviderAuthContext() {
	return {
		async env(name) {
			const value = getProcessEnv()?.[name];
			return typeof value === "string" && value.trim().length > 0 ? value : void 0;
		},
		async fileExists(path) {
			try {
				const fs = await importNodeModule("node:fs/promises");
				let resolved = path;
				if (resolved.startsWith("~")) resolved = (await importNodeModule("node:os")).homedir() + resolved.slice(1);
				await fs.access(resolved);
				return true;
			} catch {
				return false;
			}
		}
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/abort.js
function abortReason(signal) {
	if (signal.reason !== void 0) return signal.reason;
	const error = /* @__PURE__ */ new Error("The operation was aborted");
	error.name = "AbortError";
	return error;
}
/** Create an operation-local signal for public APIs whose signal is optional. */
function operationSignal(signal) {
	return signal ?? new AbortController().signal;
}
/**
* Stop waiting for an operation when its signal aborts while continuing to
* observe the abandoned promise so a later rejection is always handled.
*/
function raceWithAbortSignal(operation, signal) {
	if (signal.aborted) {
		operation.catch(() => {});
		return Promise.reject(abortReason(signal));
	}
	return new Promise((resolve, reject) => {
		let settled = false;
		const cleanup = () => signal.removeEventListener("abort", onAbort);
		const onAbort = () => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(abortReason(signal));
		};
		signal.addEventListener("abort", onAbort, { once: true });
		operation.then((value) => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(value);
		}, (error) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(error);
		});
		if (signal.aborted) onAbort();
	});
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/auth/credential-store.js
/**
* Default in-memory credential store. Apps inject persistent stores.
* Keyed by `Provider.id`, one credential per provider; see `CredentialStore`.
* Writes are serialized per provider through a promise chain.
*/
var InMemoryCredentialStore = class {
	credentials = /* @__PURE__ */ new Map();
	chains = /* @__PURE__ */ new Map();
	/** Serialize tasks per provider id without releasing the chain before active work settles. */
	enqueue(providerId, task, options) {
		const signal = operationSignal(options?.signal);
		const previous = this.chains.get(providerId) ?? Promise.resolve();
		const queued = (async () => {
			await previous.catch(() => {});
			signal.throwIfAborted();
			return task();
		})();
		const tail = queued.catch(() => {});
		this.chains.set(providerId, tail);
		tail.then(() => {
			if (this.chains.get(providerId) === tail) this.chains.delete(providerId);
		});
		return raceWithAbortSignal(queued, signal);
	}
	async read(providerId, options) {
		options?.signal?.throwIfAborted();
		return this.credentials.get(providerId);
	}
	async list(options) {
		options?.signal?.throwIfAborted();
		return [...this.credentials].map(([providerId, credential]) => ({
			providerId,
			type: credential.type
		}));
	}
	modify(providerId, fn, options) {
		return this.enqueue(providerId, async () => {
			const current = this.credentials.get(providerId);
			const next = await fn(current);
			options?.signal?.throwIfAborted();
			if (next !== void 0) this.credentials.set(providerId, next);
			return next ?? current;
		}, options);
	}
	delete(providerId, options) {
		return this.enqueue(providerId, async () => {
			this.credentials.delete(providerId);
		}, options);
	}
};
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/diagnostics.js
function formatThrownValue(value) {
	if (value instanceof Error) return value.message || value.name;
	if (typeof value === "string") return value;
	return String(value);
}
function extractDiagnosticError(error) {
	if (!(error instanceof Error)) return {
		name: "ThrownValue",
		message: formatThrownValue(error)
	};
	const code = error.code;
	return {
		name: error.name || void 0,
		message: error.message || error.name,
		stack: error.stack,
		code: typeof code === "string" || typeof code === "number" ? code : void 0
	};
}
function createAssistantMessageDiagnostic(type, error, details) {
	return {
		type,
		timestamp: Date.now(),
		error: extractDiagnosticError(error),
		details
	};
}
function appendAssistantMessageDiagnostic(message, diagnostic) {
	message.diagnostics = [...message.diagnostics ?? [], diagnostic];
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/models-error.js
var ModelsError = class extends Error {
	code;
	constructor(code, message, options) {
		super(withCauseDetail(message, options?.cause), options);
		this.name = "ModelsError";
		this.code = code;
	}
};
/** Callers surface `error.message` only, so keep the underlying reason in it. */
function withCauseDetail(message, cause) {
	if (cause === void 0 || cause === null) return message;
	const detail = formatThrownValue(cause).trim();
	if (!detail || message.includes(detail)) return message;
	return `${message}: ${detail}`;
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/auth/resolve.js
/**
* Auth resolution shared by all operations in a `Models` collection.
* A stored credential owns the provider: ambient/env is consulted only when
* nothing is stored. No silent env fallback after a failed refresh or for a
* credential type without a matching handler.
*/
function resolveProviderAuth(provider, credentials, authContext, overrides) {
	const signal = operationSignal(overrides?.signal);
	return raceWithAbortSignal(resolveProviderAuthWithSignal(provider, credentials, authContext, overrides, signal), signal);
}
async function resolveProviderAuthWithSignal(provider, credentials, authContext, overrides, signal) {
	signal.throwIfAborted();
	const requestAuthContext = overrides?.env ? overlayEnvAuthContext(authContext, overrides.env) : authContext;
	if (overrides?.apiKey !== void 0 && provider.auth.apiKey) return resolveApiKey(requestAuthContext, provider.auth.apiKey, provider.id, {
		type: "api_key",
		key: overrides.apiKey,
		env: overrides.env
	}, signal);
	const stored = await readCredential(credentials, provider.id, signal);
	if (stored) {
		if (stored.type === "oauth" && provider.auth.oauth) return resolveStoredOAuth(credentials, provider.id, provider.auth.oauth, stored, signal, overrides?.minOAuthValidityMs);
		if (stored.type === "api_key" && provider.auth.apiKey) {
			const credential = overrides?.env ? {
				...stored,
				env: {
					...stored.env,
					...overrides.env
				}
			} : stored;
			return resolveApiKey(requestAuthContext, provider.auth.apiKey, provider.id, credential, signal);
		}
		return;
	}
	return provider.auth.apiKey ? resolveApiKey(requestAuthContext, provider.auth.apiKey, provider.id, void 0, signal) : void 0;
}
function overlayEnvAuthContext(base, env) {
	return {
		env: async (name) => env[name] || await base.env(name),
		fileExists: (path) => base.fileExists(path)
	};
}
const DEFAULT_OAUTH_MINIMUM_VALIDITY_MS = 300 * 1e3;
const DEFAULT_OAUTH_REFRESH_TIMEOUT_MS = 15e3;
/**
* Refresh a stored OAuth credential under the credential-store lock and persist
* the result before the lock is released. `needsRefresh` is re-checked under
* the lock, so concurrent callers and processes refresh only once.
*
* `signal` cancels only the wait for the lock. Once a refresh starts, the
* provider may already have rotated the refresh token, so the refresh and its
* persistence ignore `signal` and are bounded only by a timeout. Otherwise a
* cancelled caller could discard the only valid refresh token. Callers that
* must return promptly on cancellation race this promise with their signal.
*
* Resolves with the stored OAuth credential after the operation, or undefined
* when the provider no longer has an OAuth credential.
*/
async function refreshStoredOAuthCredential(credentials, providerId, oauth, needsRefresh, signal) {
	let post;
	const lockWait = new AbortController();
	const cancelLockWait = () => lockWait.abort(signal.reason);
	signal.addEventListener("abort", cancelLockWait, { once: true });
	if (signal.aborted) cancelLockWait();
	try {
		post = await credentials.modify(providerId, async (current) => {
			signal.removeEventListener("abort", cancelLockWait);
			signal.throwIfAborted();
			if (current?.type !== "oauth") return void 0;
			if (!needsRefresh(current)) return void 0;
			try {
				return await oauth.refresh(current, AbortSignal.timeout(DEFAULT_OAUTH_REFRESH_TIMEOUT_MS));
			} catch (error) {
				throw new ModelsError("oauth", `OAuth refresh failed for ${providerId}`, { cause: error });
			}
		}, { signal: lockWait.signal });
	} catch (error) {
		if (error instanceof ModelsError) throw error;
		signal.throwIfAborted();
		throw new ModelsError("auth", `Credential store modify failed for ${providerId}`, { cause: error });
	} finally {
		signal.removeEventListener("abort", cancelLockWait);
	}
	return post?.type === "oauth" ? post : void 0;
}
/**
* OAuth resolution with double-checked locking: tokens with less than five
* minutes remaining are refreshed through `refreshStoredOAuthCredential`.
*/
async function resolveStoredOAuth(credentials, providerId, oauth, stored, signal, minOAuthValidityMs) {
	const minimumValidityMs = Math.max(DEFAULT_OAUTH_MINIMUM_VALIDITY_MS, minOAuthValidityMs ?? 0);
	const expiresSoon = (credential) => Date.now() + minimumValidityMs >= credential.expires;
	let credential = stored;
	if (expiresSoon(credential)) {
		const post = await refreshStoredOAuthCredential(credentials, providerId, oauth, expiresSoon, signal);
		if (!post) return void 0;
		credential = post;
		if (minOAuthValidityMs !== void 0 && expiresSoon(credential)) throw new ModelsError("oauth", `OAuth refresh returned a token that expires too soon for ${providerId}`);
	}
	try {
		return {
			auth: await oauth.toAuth(credential),
			source: "OAuth"
		};
	} catch (error) {
		throw new ModelsError("oauth", `OAuth auth derivation failed for ${providerId}`, { cause: error });
	}
}
async function resolveApiKey(authContext, apiKey, providerId, credential, signal) {
	try {
		return await apiKey.resolve({
			ctx: authContext,
			credential,
			signal
		});
	} catch (error) {
		throw new ModelsError("auth", `API key auth failed for provider ${providerId}`, { cause: error });
	}
}
async function readCredential(credentials, providerId, signal) {
	try {
		return await credentials.read(providerId, { signal });
	} catch (error) {
		throw new ModelsError("auth", `Credential store read failed for ${providerId}`, { cause: error });
	}
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/models-store.js
var InMemoryModelsStore = class {
	entries = /* @__PURE__ */ new Map();
	async read(providerId, options) {
		options?.signal?.throwIfAborted();
		const entry = this.entries.get(providerId);
		return entry ? structuredClone(entry) : void 0;
	}
	async write(providerId, entry, options) {
		options?.signal?.throwIfAborted();
		this.entries.set(providerId, structuredClone(entry));
	}
	async delete(providerId, options) {
		options?.signal?.throwIfAborted();
		this.entries.delete(providerId);
	}
};
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-telemetry@1.5.0/node_modules/@earendil-works/pi-telemetry/dist/metrics.js
/** Bind instrument names, kinds, metadata, and exact measurement attributes to one or more schemas. */
function createTypedMetrics(metrics, schemas) {
	const definitions = /* @__PURE__ */ new Map();
	for (const schema of schemas) for (const [name, definition] of Object.entries(schema.metrics ?? {})) definitions.set(name, definition);
	return {
		counter: (name) => metrics.counter(name, definitions.get(name)),
		upDownCounter: (name) => metrics.upDownCounter(name, definitions.get(name)),
		histogram: (name) => metrics.histogram(name, definitions.get(name))
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-telemetry@1.5.0/node_modules/@earendil-works/pi-telemetry/dist/noop.js
async function startNoopSpan(_options, callback) {
	return callback(noopTelemetrySpan);
}
const noopCounter = Object.freeze({ add: () => {} });
const noopUpDownCounter = Object.freeze({ add: () => {} });
const noopHistogram = Object.freeze({ record: () => {} });
/** Shared instruments that never inspect or retain metadata, measurements, or contexts. */
const NOOP_TELEMETRY_METRICS = Object.freeze({
	counter: () => noopCounter,
	upDownCounter: () => noopUpDownCounter,
	histogram: () => noopHistogram
});
const noopTelemetrySpan = {
	metrics: NOOP_TELEMETRY_METRICS,
	propagation: Object.freeze({
		inject: () => void 0,
		extract: () => NOOP_TELEMETRY_CONTEXT
	}),
	startSpan: startNoopSpan,
	addLink: () => {},
	addEvent: () => {},
	setAttributes: () => {},
	setStatus: () => {}
};
Object.freeze(noopTelemetrySpan);
/** Shared telemetry context used when an application does not provide one. */
const NOOP_TELEMETRY_CONTEXT = noopTelemetrySpan;
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-telemetry@1.5.0/node_modules/@earendil-works/pi-telemetry/dist/index.js
/** Typed identity helper for serializable telemetry schema data. */
function defineTelemetrySchema(schema) {
	return schema;
}
function bindTypedSpanStarter(telemetryContext) {
	const startSpan = (name, attributes, callback) => telemetryContext.startSpan({
		name,
		attributes
	}, (span) => callback(span, bindTypedSpanStarter(span)));
	return startSpan;
}
/**
* Bind an explicit parent context to the combined span vocabulary of one or more schemas.
* Schema values are used only for type inference; no runtime schema validation is performed.
*/
function createTypedSpanStarter(telemetryContext, _schemas) {
	return bindTypedSpanStarter(telemetryContext);
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/text.js
/** Extract and join text from message content. */
function contentText(content, separator = "\n") {
	if (typeof content === "string") return content;
	return content.filter((block) => block.type === "text").map((block) => block.text).join(separator);
}
/** Render a system message as a complete prompt: its content followed by its sections. */
function getSystemMessageText(message) {
	const parts = [contentText(message.content)];
	for (const text of Object.values(message.sections ?? {})) if (text !== null) parts.push(text);
	return parts.filter((part) => part.length > 0).join("\n\n");
}
/**
* Render a later system message for APIs that accept system messages mid-conversation.
* Section changes are framed by name so the model can relate them to the leading prompt.
* This framing is request-time only and may change between versions.
*/
function renderSystemMessageUpdate(message) {
	const parts = [];
	const text = contentText(message.content);
	if (text.length > 0) parts.push(text);
	for (const [name, value] of Object.entries(message.sections ?? {})) parts.push(value === null ? `Removed system prompt section "${name}".` : `Updated system prompt section "${name}":\n\n${value}`);
	return parts.join("\n\n");
}
/**
* `text.slice(start, end)` as a string of its own. V8 represents a slice of 13 or more characters as a view that keeps
* all of `text` alive, so a short excerpt kept from a large text (a 500-character error message cut from a megabyte
* response body) would keep the whole text alive as long as the excerpt lives. Appending a character and slicing it off
* again makes V8 copy just the slice.
*/
function ownedSlice(text, start, end = text.length) {
	return `${text.slice(start, end)} `.slice(0, -1);
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/telemetry.js
const provider = {
	type: "string",
	description: "Provider identifier.",
	required: true
};
const model = {
	type: "string",
	description: "Requested model identifier.",
	required: true
};
const stop = {
	type: "string",
	description: "Normalized stop reason.",
	values: [
		"pending",
		"stop",
		"length",
		"toolUse",
		"error",
		"aborted",
		"deferred"
	]
};
const request = {
	description: "One logical model request, including authentication and provider setup.",
	parents: { kind: "any" },
	startAttributes: {
		provider,
		api: {
			type: "string",
			description: "API identifier.",
			required: true
		},
		model,
		reasoning: {
			type: "string",
			description: "Scalar requested reasoning level.",
			required: false
		}
	},
	endAttributes: {
		stop,
		"usage.input": {
			type: "number",
			description: "Uncached input tokens."
		},
		"usage.output": {
			type: "number",
			description: "Output tokens."
		},
		"usage.cache_read": {
			type: "number",
			description: "Cache-read tokens."
		},
		"usage.cache_write": {
			type: "number",
			description: "Cache-write tokens."
		},
		"cost.total": {
			type: "number",
			description: "Total request cost in USD."
		},
		"response.id": {
			type: "string",
			description: "Provider response identifier.",
			cardinality: "high"
		}
	},
	events: {
		"pi.ai.first_chunk": {
			description: "First normalized stream event delivered.",
			attributes: {}
		},
		"pi.ai.block": {
			description: "A completed content block; content is never recorded.",
			attributes: {
				type: {
					type: "string",
					description: "Block kind.",
					values: [
						"text",
						"thinking",
						"tool_call"
					],
					required: true
				},
				index: {
					type: "number",
					description: "Content block index.",
					required: true
				},
				chars: {
					type: "number",
					description: "UTF-16 character count.",
					required: true
				},
				tool: {
					type: "string",
					description: "Tool name, for tool-call blocks only.",
					required: false
				}
			}
		}
	},
	status: {
		default: "ok",
		errorWhen: "Stop reason is error: provider_error with at most 500 error-message characters. Aborted stays ok."
	}
};
/** Pi-owned request metadata, bounded error status, events, and low-cardinality metrics. */
const AI_TELEMETRY_SCHEMA = defineTelemetrySchema({
	version: 1,
	spans: {
		"pi.ai.request": request,
		"pi.ai.poll": {
			...request,
			description: "One deferred-response poll, not the deferred request's lifetime."
		}
	},
	metrics: {
		"pi.ai.request.duration": {
			kind: "histogram",
			description: "Logical request or poll duration.",
			unit: "ms",
			attributes: {
				provider,
				model,
				stop: {
					...stop,
					required: true
				}
			}
		},
		"pi.ai.first_chunk.duration": {
			kind: "histogram",
			description: "Time to the first normalized stream event.",
			unit: "ms",
			attributes: {
				provider,
				model
			}
		},
		"pi.ai.tokens": {
			kind: "counter",
			description: "Reported model token usage; pending and deferred polls are excluded.",
			unit: "token",
			attributes: {
				provider,
				model,
				kind: {
					type: "string",
					description: "Token usage category.",
					values: [
						"input",
						"output",
						"cache_read",
						"cache_write"
					],
					required: true
				}
			}
		},
		"pi.ai.cost": {
			kind: "counter",
			description: "Reported model cost; pending and deferred polls are excluded.",
			unit: "USD",
			attributes: {
				provider,
				model
			}
		}
	}
});
function createInstruments(adapter) {
	const metrics = createTypedMetrics(adapter, [AI_TELEMETRY_SCHEMA]);
	return {
		requestDuration: metrics.histogram("pi.ai.request.duration"),
		firstChunkDuration: metrics.histogram("pi.ai.first_chunk.duration"),
		tokens: metrics.counter("pi.ai.tokens"),
		cost: metrics.counter("pi.ai.cost")
	};
}
const instrumentCache = /* @__PURE__ */ new WeakMap();
function observeModelRequest(requestedModel, options, poll) {
	const started = performance.now();
	const attributes = {
		provider: requestedModel.provider,
		model: requestedModel.id
	};
	const adapter = options?.telemetry?.metrics ?? NOOP_TELEMETRY_METRICS;
	let instruments = instrumentCache.get(adapter);
	if (!instruments) {
		instruments = createInstruments(adapter);
		instrumentCache.set(adapter, instruments);
	}
	const { requestDuration, firstChunkDuration, tokens, cost } = instruments;
	let span;
	let finish;
	let first = true;
	const toolChars = /* @__PURE__ */ new Map();
	const finished = new Promise((resolve) => {
		finish = resolve;
	});
	const run = (activeSpan) => {
		span = activeSpan;
		return finished;
	};
	const startAttributes = {
		...attributes,
		api: requestedModel.api,
		...typeof options?.reasoning === "string" ? { reasoning: options.reasoning } : {}
	};
	const start = createTypedSpanStarter(options?.telemetry ?? NOOP_TELEMETRY_CONTEXT, [AI_TELEMETRY_SCHEMA]);
	if (poll) start("pi.ai.poll", startAttributes, run);
	else start("pi.ai.request", startAttributes, run);
	return {
		onEvent(event) {
			if (first) {
				first = false;
				span.addEvent("pi.ai.first_chunk");
				firstChunkDuration.record(performance.now() - started, attributes, span);
			}
			if (event.type === "toolcall_delta") toolChars.set(event.contentIndex, (toolChars.get(event.contentIndex) ?? 0) + event.delta.length);
			else if (event.type === "text_end" || event.type === "thinking_end") span.addEvent("pi.ai.block", {
				type: event.type === "text_end" ? "text" : "thinking",
				index: event.contentIndex,
				chars: event.content.length
			});
			else if (event.type === "toolcall_end") {
				const chars = toolChars.get(event.contentIndex) ?? 0;
				toolChars.delete(event.contentIndex);
				span.addEvent("pi.ai.block", {
					type: "tool_call",
					index: event.contentIndex,
					chars,
					tool: event.toolCall.name
				});
			}
		},
		onResult(message) {
			if (message) {
				span.setAttributes({
					stop: message.stopReason,
					"usage.input": message.usage.input,
					"usage.output": message.usage.output,
					"usage.cache_read": message.usage.cacheRead,
					"usage.cache_write": message.usage.cacheWrite,
					"cost.total": message.usage.cost.total,
					"response.id": message.responseId
				});
				if (message.stopReason === "error") span.setStatus({
					status: "error",
					error: {
						name: "provider_error",
						message: ownedSlice(message.errorMessage ?? "", 0, 500)
					}
				});
				requestDuration.record(performance.now() - started, {
					...attributes,
					stop: message.stopReason
				}, span);
				if (!poll || message.stopReason !== "pending" && message.stopReason !== "deferred") {
					tokens.add(message.usage.input, {
						...attributes,
						kind: "input"
					});
					tokens.add(message.usage.output, {
						...attributes,
						kind: "output"
					});
					tokens.add(message.usage.cacheRead, {
						...attributes,
						kind: "cache_read"
					});
					tokens.add(message.usage.cacheWrite, {
						...attributes,
						kind: "cache_write"
					});
					cost.add(message.usage.cost.total, attributes);
				}
			}
			finish();
		}
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/identity.js
const NVIDIA_NIM_HOST = "integrate.api.nvidia.com";
const OPENCODE_HOST = "opencode.ai";
/** Merge identities field by field; later sources win and undefined fields are skipped. */
function mergeClientIdentity(...sources) {
	let merged;
	for (const source of sources) {
		if (!source) continue;
		merged = { ...merged };
		if (source.userAgent !== void 0) merged.userAgent = source.userAgent;
		if (source.attribution !== void 0) merged.attribution = source.attribution;
		if (source.version !== void 0) merged.version = source.version;
	}
	return merged;
}
/** The version in the detailed `User-Agent`. */
function getClientVersion(identity) {
	return identity?.version ?? "1.5.0";
}
function runtimeDescription() {
	if (typeof process === "undefined") return void 0;
	const versions = process.versions;
	if (versions?.bun) return `bun/${versions.bun}`;
	if (versions?.node) return `node/${process.version}`;
}
/** The `User-Agent` value of an identity. */
function formatUserAgent(identity) {
	const mode = identity?.userAgent ?? "detailed";
	if (typeof mode === "object") return mode.custom;
	if (mode === "short") return "pi";
	const product = `pi/${getClientVersion(identity)}`;
	const runtime = runtimeDescription();
	return runtime ? `${product} (${process.platform}; ${runtime}; ${process.arch})` : `${product} (browser)`;
}
function matchesHost(baseUrl, expectedHost) {
	try {
		return new URL(baseUrl).hostname === expectedHost;
	} catch {
		return false;
	}
}
function isOpenRouter(target) {
	return target.provider === "openrouter" || target.baseUrl.includes("openrouter.ai");
}
function isNvidiaNim(target) {
	return target.provider === "nvidia" || matchesHost(target.baseUrl, NVIDIA_NIM_HOST);
}
function isOpenCode(target) {
	return target.provider === "opencode" || target.provider === "opencode-go" || matchesHost(target.baseUrl, OPENCODE_HOST);
}
/** Provider attribution headers of an identity for a request target. Empty when attribution is off. */
function getAttributionHeaders(target, identity) {
	const attribution = identity?.attribution;
	if (!attribution) return {};
	const { name, url, categories } = attribution;
	if (isOpenRouter(target)) return {
		"HTTP-Referer": url,
		"X-OpenRouter-Title": name,
		...categories === void 0 || categories.length === 0 ? {} : { "X-OpenRouter-Categories": categories.join(",") }
	};
	if (isNvidiaNim(target)) return { "X-BILLING-INVOKE-ORIGIN": name.charAt(0).toUpperCase() + name.slice(1) };
	if (isOpenCode(target)) return { "x-opencode-client": name };
	return {};
}
/**
* OpenCode's per-conversation routing header for requests to OpenCode, including custom providers pointing at it.
* Undefined without a session or for other targets.
*/
function getOpenCodeSessionHeaders(target, sessionId) {
	return sessionId && isOpenCode(target) ? { "x-opencode-session": sessionId } : void 0;
}
/**
* Default headers an identity adds to a request: `User-Agent` and provider attribution. APIs apply them below model,
* provider, and request headers, so configured headers override them and `null` request headers remove them.
*/
function getIdentityHeaders(target, identity) {
	return {
		"User-Agent": formatUserAgent(identity),
		...getAttributionHeaders(target, identity)
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/model-operations.js
/** The type of a model. Models without `type` are chat models. */
function getModelType(model) {
	return model.type ?? "chat";
}
/** Runtime-checked model type narrowing, including legacy chat models without `type`. */
function isModelType(model, type) {
	return getModelType(model) === type;
}
function assertChatModel(model) {
	if (!isModelType(model, "chat")) throw new ModelsError("provider", `Model ${model.provider}/${model.id} is not a chat model`);
}
function assertImageModel(model) {
	if (!isModelType(model, "image")) throw new ModelsError("provider", `Model ${model.provider}/${model.id} is not an image model`);
}
function assertClassifierModel(model) {
	if (!isModelType(model, "classifier")) throw new ModelsError("provider", `Model ${model.provider}/${model.id} is not a classifier model`);
}
/** Rejects classifier images for models whose catalog entry does not accept image input. */
function assertClassifierInputSupported(model, context) {
	if (context.images?.length && !model.input.includes("image")) throw new ModelsError("provider", `Model ${model.provider}/${model.id} does not accept image input`);
}
function imageErrorResult(model, error, aborted = false) {
	return {
		api: model.api,
		provider: model.provider,
		model: model.id,
		output: [],
		stopReason: aborted ? "aborted" : "error",
		errorMessage: error instanceof Error ? error.message : String(error),
		timestamp: Date.now()
	};
}
function classifierErrorResult(model, error, aborted = false) {
	return {
		api: model.api,
		provider: model.provider,
		model: model.id,
		answers: {},
		stopReason: aborted ? "aborted" : "error",
		errorMessage: error instanceof Error ? error.message : String(error),
		timestamp: Date.now()
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/transcript.js
/**
* Build the leading system message for a prompt and tool set. Returns undefined when
* both are empty, so an empty transcript stays empty.
*/
function createInitialSystemMessage(systemPrompt, tools) {
	const hasSystemPrompt = systemPrompt !== void 0 && systemPrompt.length > 0;
	const hasTools = tools !== void 0 && tools.length > 0;
	if (!hasSystemPrompt && !hasTools) return void 0;
	return {
		role: "system",
		content: systemPrompt ?? "",
		...hasTools ? { toolsAdded: tools } : {},
		timestamp: 0
	};
}
/**
* Fold `Context.systemPrompt` and `Context.tools` into a leading system message.
* This is the only entry point that produces a {@link TranscriptContext}; every
* provider-facing function expects the result.
*/
function normalizeContext(context) {
	const initialMessage = createInitialSystemMessage(context.systemPrompt, context.tools);
	return { messages: initialMessage ? [initialMessage, ...context.messages] : context.messages };
}
function isSystemMessage(message) {
	return message.role === "system";
}
/** Return the leading system message, if the transcript starts with one. */
function getInitialSystemMessage(messages) {
	const first = messages[0];
	return first && isSystemMessage(first) ? first : void 0;
}
/** Resolve the tools available after applying every transcript delta in order. */
function getCurrentTools(messages) {
	const tools = /* @__PURE__ */ new Map();
	for (const message of messages) {
		if (!isSystemMessage(message)) continue;
		for (const tool of message.toolsRemoved ?? []) tools.delete(tool.name);
		for (const tool of message.toolsAdded ?? []) tools.set(tool.name, tool);
	}
	return [...tools.values()];
}
/**
* Replay every system message into one leading system message holding the current
* prompt and tools. Later `content` is appended to the base prompt, `sections` are
* patched by name, and tools are resolved with {@link getCurrentTools}.
*/
function getCurrentSystemMessage(messages) {
	const content = [];
	const sections = /* @__PURE__ */ new Map();
	let timestamp;
	for (const message of messages) {
		if (!isSystemMessage(message)) continue;
		timestamp ??= message.timestamp;
		const text = contentText(message.content);
		if (text.length > 0) content.push(text);
		for (const [name, value] of Object.entries(message.sections ?? {})) if (value === null) sections.delete(name);
		else sections.set(name, value);
	}
	const tools = getCurrentTools(messages);
	if (timestamp === void 0 && tools.length === 0) return void 0;
	return {
		role: "system",
		content: content.join("\n\n"),
		...sections.size > 0 ? { sections: Object.fromEntries(sections) } : {},
		...tools.length > 0 ? { toolsAdded: tools } : {},
		timestamp: timestamp ?? 0
	};
}
/**
* Rebuild the transcript for APIs without mid-conversation system messages: the replayed
* system message leads, and every later system message is dropped.
*/
function collapseSystemMessages(context) {
	const head = getCurrentSystemMessage(context.messages);
	const messages = context.messages.filter((message) => message.role !== "system");
	return { messages: head ? [head, ...messages] : messages };
}
/** Keep later system messages in place when the model accepts them; otherwise collapse them. */
function resolveTranscript(context, supportsMidConvoSystemMessages) {
	return supportsMidConvoSystemMessages ? context : collapseSystemMessages(context);
}
/** Every definition referenced by transcript tool state, in first-declaration order. */
function getDeclaredTools(messages) {
	const definitions = /* @__PURE__ */ new Map();
	for (const message of messages) {
		if (!isSystemMessage(message)) continue;
		for (const tool of message.toolsAdded ?? []) definitions.set(tool.name, tool);
	}
	return [...definitions.values()];
}
/** Index of the last system message with a removal or same-name redeclaration, or -1. */
function findLastNonAdditiveToolChange(systemMessages) {
	const declared = /* @__PURE__ */ new Set();
	let last = -1;
	for (let index = 0; index < systemMessages.length; index++) {
		const message = systemMessages[index];
		if ((message.toolsRemoved?.length ?? 0) > 0) last = index;
		for (const tool of message.toolsAdded ?? []) {
			if (declared.has(tool.name)) last = index;
			declared.add(tool.name);
		}
	}
	return last;
}
/**
* Split tool declarations between the top-level request field and in-place changes.
*
* With `"changes"`, the top-level list stays empty and every system message, including the
* leading one, declares its tools in place: an in-place declaration can replace an earlier
* in-place one, but not a top-level one. With `"additions"`, a removal or redefinition cannot be
* expressed in place, so the top-level list becomes the tool state after the last such change;
* later additions stay anchored, and the cached prefix is invalidated once per removal instead
* of on every later addition. With `"none"`, the top-level list is the current tool set.
*/
function resolveTranscriptTools(messages, support) {
	const systemMessages = messages.filter(isSystemMessage);
	if (support === "none") return {
		requestTools: getCurrentTools(systemMessages),
		foldedSystemMessages: systemMessages.length
	};
	if (support === "changes") return {
		requestTools: [],
		foldedSystemMessages: 0
	};
	const folded = Math.max(getInitialSystemMessage(messages) ? 1 : 0, findLastNonAdditiveToolChange(systemMessages) + 1);
	return {
		requestTools: getCurrentTools(systemMessages.slice(0, folded)),
		foldedSystemMessages: folded
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/models.js
const KNOWN_MODEL_TYPES = {
	chat: true,
	image: true,
	classifier: true
};
/** Models from stores and remote sources may have types that only newer versions know. */
function hasKnownModelType(model) {
	return Object.hasOwn(KNOWN_MODEL_TYPES, getModelType(model));
}
/** Drops stored models whose type this version does not know. */
function withKnownModelTypes(entry) {
	return {
		...entry,
		models: entry.models.filter(hasKnownModelType)
	};
}
function mergeHeaders(base, override) {
	if (!base && !override) return void 0;
	const merged = { ...base };
	for (const [name, value] of Object.entries(override ?? {})) {
		const lowerName = name.toLowerCase();
		for (const existingName of Object.keys(merged)) if (existingName.toLowerCase() === lowerName) delete merged[existingName];
		merged[name] = value;
	}
	return merged;
}
var ModelsImpl = class {
	providers = /* @__PURE__ */ new Map();
	credentials;
	modelsStore;
	authContext;
	identity;
	refreshGenerations = /* @__PURE__ */ new Map();
	refreshControllers = /* @__PURE__ */ new Map();
	publicationChains = /* @__PURE__ */ new Map();
	constructor(options) {
		this.credentials = options?.credentials ?? new InMemoryCredentialStore();
		this.modelsStore = options?.modelsStore ?? new InMemoryModelsStore();
		this.authContext = options?.authContext ?? defaultProviderAuthContext();
		this.identity = options?.identity;
	}
	setProvider(provider) {
		this.supersedeProviderRefresh(provider.id);
		this.providers.set(provider.id, provider);
	}
	deleteProvider(id) {
		this.supersedeProviderRefresh(id);
		this.providers.delete(id);
	}
	clearProviders() {
		for (const id of /* @__PURE__ */ new Set([...this.providers.keys(), ...this.refreshControllers.keys()])) this.supersedeProviderRefresh(id);
		this.providers.clear();
	}
	getProviders() {
		return Array.from(this.providers.values());
	}
	getProvider(id) {
		return this.providers.get(id);
	}
	getModels(provider) {
		if (provider !== void 0) {
			const entry = this.providers.get(provider);
			if (!entry) return [];
			try {
				return entry.getModels();
			} catch {
				return [];
			}
		}
		const models = [];
		for (const entry of this.providers.values()) try {
			models.push(...entry.getModels());
		} catch {}
		return models;
	}
	getAllModels(provider) {
		if (provider !== void 0) {
			const entry = this.providers.get(provider);
			if (!entry) return [];
			try {
				return entry.getAllModels?.() ?? entry.getModels();
			} catch {
				return [];
			}
		}
		const models = [];
		for (const entry of this.providers.values()) try {
			models.push(...entry.getAllModels?.() ?? entry.getModels());
		} catch {}
		return models;
	}
	getModelsOfType(type, provider) {
		return this.getAllModels(provider).filter((model) => isModelType(model, type));
	}
	getModel(provider, id) {
		return this.getModels(provider).find((model) => model.id === id);
	}
	getModelOfType(type, provider, id) {
		return this.getModelsOfType(type, provider).find((model) => model.id === id);
	}
	supersedeProviderRefresh(providerId) {
		const generation = (this.refreshGenerations.get(providerId) ?? 0) + 1;
		this.refreshGenerations.set(providerId, generation);
		const previous = this.refreshControllers.get(providerId);
		if (previous) {
			this.refreshControllers.delete(providerId);
			previous.abort();
		}
		return generation;
	}
	beginProviderRefresh(providerId) {
		const generation = this.supersedeProviderRefresh(providerId);
		const controller = new AbortController();
		this.refreshControllers.set(providerId, controller);
		return {
			generation,
			controller
		};
	}
	publishProviderModels(providerId, generation, signal, publication) {
		const previous = this.publicationChains.get(providerId) ?? Promise.resolve();
		const queued = (async () => {
			await previous.catch(() => {});
			if (signal.aborted || this.refreshGenerations.get(providerId) !== generation) return false;
			if (publication.persist === null) await this.modelsStore.delete(providerId, { signal });
			else if (publication.persist !== void 0) await this.modelsStore.write(providerId, structuredClone(publication.persist), { signal });
			if (signal.aborted || this.refreshGenerations.get(providerId) !== generation) return false;
			publication.update?.();
			return true;
		})();
		const tail = queued.catch(() => {});
		this.publicationChains.set(providerId, tail);
		tail.then(() => {
			if (this.publicationChains.get(providerId) === tail) this.publicationChains.delete(providerId);
		});
		return raceWithAbortSignal(queued, signal);
	}
	async runProviderRefreshPhase(provider, credential, allowNetwork, force, generation, signal) {
		const stored = await this.modelsStore.read(provider.id, { signal });
		await provider.refreshModels({
			credential,
			stored: stored ? withKnownModelTypes(structuredClone(stored)) : void 0,
			publish: (publication) => this.publishProviderModels(provider.id, generation, signal, publication),
			allowNetwork,
			force: allowNetwork ? force : void 0,
			signal,
			baseUrl: provider.baseUrl
		});
	}
	async refresh(options = {}) {
		const allowNetwork = options.allowNetwork ?? true;
		const callerSignal = operationSignal(options.signal);
		const errors = /* @__PURE__ */ new Map();
		if (callerSignal.aborted) return {
			aborted: true,
			errors
		};
		const selected = options.providers ? new Set(options.providers) : void 0;
		const refreshable = Array.from(this.providers.values()).filter((provider) => provider.refreshModels !== void 0 && (!selected || selected.has(provider.id)));
		const refresh = Promise.all(refreshable.map(async (provider) => {
			const { generation, controller } = this.beginProviderRefresh(provider.id);
			const signal = AbortSignal.any([callerSignal, controller.signal]);
			const operation = (async () => {
				let storedCredential;
				let credentialError;
				try {
					storedCredential = await this.readCredential(provider.id, signal);
				} catch (error) {
					credentialError = error;
				}
				await this.runProviderRefreshPhase(provider, storedCredential, false, void 0, generation, signal);
				if (credentialError !== void 0) throw credentialError;
				if (!allowNetwork || signal.aborted) return;
				const credential = await this.resolveRefreshCredential(provider, storedCredential, signal);
				if (!credential) return;
				await this.runProviderRefreshPhase(provider, credential, true, options.force, generation, signal);
			})();
			try {
				await raceWithAbortSignal(operation, signal);
			} catch (error) {
				if (!signal.aborted) errors.set(provider.id, error instanceof Error ? error : new ModelsError("model_source", `Model refresh failed for ${provider.id}`, { cause: error }));
			} finally {
				if (this.refreshControllers.get(provider.id) === controller) this.refreshControllers.delete(provider.id);
			}
		}));
		try {
			await raceWithAbortSignal(refresh, callerSignal);
		} catch (error) {
			if (!callerSignal.aborted) throw error;
		}
		return {
			aborted: callerSignal.aborted,
			errors: new Map(errors)
		};
	}
	async resolveRefreshCredential(provider, stored, signal) {
		if (stored?.type === "oauth") {
			const oauth = provider.auth.oauth;
			if (!oauth) return void 0;
			if (Date.now() < stored.expires) return stored;
			if (signal.aborted) return void 0;
			return refreshStoredOAuthCredential(this.credentials, provider.id, oauth, (current) => Date.now() >= current.expires, signal);
		}
		const apiKey = provider.auth.apiKey;
		if (!apiKey) return void 0;
		const credential = stored?.type === "api_key" ? stored : void 0;
		const result = await apiKey.resolve({
			ctx: this.authContext,
			credential,
			signal
		});
		if (!result) return void 0;
		return {
			type: "api_key",
			key: result.auth.apiKey,
			env: result.env
		};
	}
	async readCredential(providerId, signal) {
		try {
			return await this.credentials.read(providerId, { signal });
		} catch (error) {
			throw new ModelsError("auth", `Credential store read failed for ${providerId}`, { cause: error });
		}
	}
	async checkProviderAuth(provider, credential, signal) {
		if (credential?.type === "oauth") return provider.auth.oauth ? {
			source: "OAuth",
			type: "oauth"
		} : void 0;
		const apiKey = provider.auth.apiKey;
		if (!apiKey) return void 0;
		if (apiKey.check) try {
			return await apiKey.check({
				ctx: this.authContext,
				credential: credential?.type === "api_key" ? credential : void 0,
				signal
			});
		} catch (error) {
			throw new ModelsError("auth", `API key auth check failed for provider ${provider.id}`, { cause: error });
		}
		const resolution = await resolveProviderAuth(provider, this.credentials, this.authContext, { signal });
		return resolution ? {
			source: resolution.source,
			type: "api_key"
		} : void 0;
	}
	checkAuth(providerId, options) {
		const signal = operationSignal(options?.signal);
		return raceWithAbortSignal((async () => {
			signal.throwIfAborted();
			const provider = this.providers.get(providerId);
			if (!provider) return void 0;
			return this.checkProviderAuth(provider, await this.readCredential(providerId, signal), signal);
		})(), signal);
	}
	async getAuthenticatedProviders(providerId, signal) {
		signal.throwIfAborted();
		const providers = providerId ? [this.providers.get(providerId)].filter((entry) => entry !== void 0) : this.getProviders();
		return (await Promise.all(providers.map(async (provider) => {
			const credential = await this.readCredential(provider.id, signal);
			return {
				provider,
				credential,
				auth: await this.checkProviderAuth(provider, credential, signal)
			};
		}))).filter((entry) => entry.auth !== void 0);
	}
	getAvailable(providerId, options) {
		const signal = operationSignal(options?.signal);
		return raceWithAbortSignal((async () => {
			return (await this.getAuthenticatedProviders(providerId, signal)).flatMap(({ provider, credential }) => {
				const models = provider.getModels();
				return provider.filterModels?.(models, credential) ?? models;
			});
		})(), signal);
	}
	async getAvailableOfType(type, providerId, options) {
		return (await this.getAllAvailable(providerId, options)).filter((model) => isModelType(model, type));
	}
	getAllAvailable(providerId, options) {
		const signal = operationSignal(options?.signal);
		return raceWithAbortSignal((async () => {
			return (await this.getAuthenticatedProviders(providerId, signal)).flatMap(({ provider, credential }) => {
				const models = provider.getAllModels?.() ?? provider.getModels();
				if (provider.filterAllModels) return provider.filterAllModels(models, credential);
				if (!provider.filterModels) return models;
				const availableChatIds = new Set(provider.filterModels(provider.getModels(), credential).map((model) => model.id));
				return models.filter((model) => !isModelType(model, "chat") || availableChatIds.has(model.id));
			});
		})(), signal);
	}
	async getAuth(providerOrModel, overrides) {
		const signal = operationSignal(overrides?.signal);
		const providerId = typeof providerOrModel === "string" ? providerOrModel : providerOrModel.provider;
		const provider = this.providers.get(providerId);
		if (!provider) return void 0;
		const result = await resolveProviderAuth(provider, this.credentials, this.authContext, {
			...overrides,
			signal
		});
		if (!result || typeof providerOrModel === "string" || !providerOrModel.headers) return result;
		return {
			...result,
			auth: {
				...result.auth,
				headers: mergeHeaders(result.auth.headers, providerOrModel.headers)
			}
		};
	}
	async login(providerId, type, interaction, options) {
		const signal = operationSignal(interaction.signal);
		signal.throwIfAborted();
		const provider = this.providers.get(providerId);
		if (!provider) throw new ModelsError("provider", `Unknown provider: ${providerId}`);
		const method = type === "oauth" ? provider.auth.oauth : provider.auth.apiKey;
		if (!method?.login) throw new ModelsError("auth", `${provider.name} does not support ${type} login`);
		const credential = await raceWithAbortSignal(method.login({
			...interaction,
			signal
		}, options), signal);
		let mutationStarted = false;
		let markMutationStarted;
		const started = new Promise((resolve) => {
			markMutationStarted = resolve;
		});
		const mutation = this.credentials.modify(providerId, async () => {
			mutationStarted = true;
			markMutationStarted?.();
			return credential;
		}, { signal });
		mutation.catch(() => {});
		try {
			await new Promise((resolve, reject) => {
				const onAbort = () => {
					if (!mutationStarted) reject(signal.reason);
				};
				signal.addEventListener("abort", onAbort, { once: true });
				Promise.race([started, mutation]).then(() => {
					signal.removeEventListener("abort", onAbort);
					resolve();
				}, (error) => {
					signal.removeEventListener("abort", onAbort);
					reject(error);
				});
				if (signal.aborted) onAbort();
			});
			await mutation;
		} catch (error) {
			signal.throwIfAborted();
			throw new ModelsError("auth", `Credential store modify failed for ${providerId}`, { cause: error });
		}
		return credential;
	}
	async logout(providerId, options) {
		const signal = operationSignal(options?.signal);
		signal.throwIfAborted();
		try {
			await this.credentials.delete(providerId, { signal });
		} catch (error) {
			signal.throwIfAborted();
			throw new ModelsError("auth", `Credential store delete failed for ${providerId}`, { cause: error });
		}
	}
	requireProvider(model) {
		const provider = this.providers.get(model.provider);
		if (!provider) throw new ModelsError("provider", `Unknown provider: ${model.provider}`);
		return provider;
	}
	requireChatProvider(model) {
		assertChatModel(model);
		return this.requireProvider(model);
	}
	async applyAuth(model, options) {
		this.requireProvider(model);
		const resolution = await this.getAuth(model, {
			apiKey: options?.apiKey,
			env: options?.env,
			signal: options?.signal
		});
		if (!resolution) throw new ModelsError("auth", `Provider is not configured: ${model.provider}`);
		const auth = resolution.auth;
		const apiKey = options?.apiKey ?? auth.apiKey;
		const requestModel = auth.baseUrl ? {
			...model,
			baseUrl: auth.baseUrl
		} : model;
		let headers = mergeHeaders(mergeHeaders(getOpenCodeSessionHeaders(requestModel, options && "sessionId" in options && typeof options.sessionId === "string" ? options.sessionId : void 0), auth.headers), options?.headers);
		if (options?.transformHeaders) headers = await options.transformHeaders(headers ?? {});
		const env = resolution.env || options?.env ? {
			...resolution.env ?? {},
			...options?.env ?? {}
		} : void 0;
		const identity = mergeClientIdentity(this.identity, options?.identity);
		const { transformHeaders: _transformHeaders, ...providerOptions } = options ?? {};
		return {
			requestModel,
			requestOptions: {
				...providerOptions,
				apiKey,
				headers,
				env,
				...identity === void 0 ? {} : { identity }
			}
		};
	}
	stream(model, context, options) {
		const transcript = normalizeContext(context);
		return lazyStream(model, async () => {
			const provider = this.requireChatProvider(model);
			const { requestModel, requestOptions } = await this.applyAuth(model, options);
			return provider.stream(requestModel, transcript, requestOptions);
		}, observeModelRequest(model, options, false));
	}
	async complete(model, context, options) {
		return this.stream(model, context, options).result();
	}
	streamSimple(model, context, options) {
		const transcript = normalizeContext(context);
		return lazyStream(model, async () => {
			const provider = this.requireChatProvider(model);
			const { requestModel, requestOptions } = await this.applyAuth(model, options);
			return provider.streamSimple(requestModel, transcript, requestOptions);
		}, observeModelRequest(model, options, false));
	}
	async completeSimple(model, context, options) {
		return this.streamSimple(model, context, options).result();
	}
	streamDeferred(model, handle, options) {
		return lazyStream(model, async () => {
			const provider = this.requireChatProvider(model);
			if (!provider.fetchDeferred) throw new ModelsError("provider", `Provider ${model.provider} does not support deferred responses`);
			const { requestModel, requestOptions } = await this.applyAuth(model, options);
			return provider.fetchDeferred(requestModel, handle, requestOptions);
		}, observeModelRequest(model, options, true));
	}
	async fetchDeferred(model, handle, options) {
		return this.streamDeferred(model, handle, options).result();
	}
	async cancelDeferred(model, handle, options) {
		const provider = this.requireChatProvider(model);
		if (!provider.cancelDeferred) throw new ModelsError("provider", `Provider ${model.provider} does not support deferred responses`);
		const { requestModel, requestOptions } = await this.applyAuth(model, options);
		await provider.cancelDeferred(requestModel, handle, requestOptions);
	}
	async generateImages(model, context, options) {
		try {
			assertImageModel(model);
			const provider = this.requireProvider(model);
			if (!provider.generateImages) throw new ModelsError("provider", `Provider ${model.provider} does not support image generation`);
			const { requestModel, requestOptions } = await this.applyAuth(model, options);
			return await provider.generateImages(requestModel, context, requestOptions);
		} catch (error) {
			return imageErrorResult(model, error, options?.signal?.aborted);
		}
	}
	async classify(model, context, options) {
		try {
			assertClassifierModel(model);
			assertClassifierInputSupported(model, context);
			const provider = this.requireProvider(model);
			if (!provider.classify) throw new ModelsError("provider", `Provider ${model.provider} does not support classification`);
			const { requestModel, requestOptions } = await this.applyAuth(model, options);
			return await provider.classify(requestModel, context, requestOptions);
		} catch (error) {
			return classifierErrorResult(model, error, options?.signal?.aborted);
		}
	}
};
function createModels(options) {
	return new ModelsImpl(options);
}
/**
* Builds a provider from parts. Built-in provider factories and models.json
* custom providers both go through this. A single `api` streams all chat
* models; an `api` map dispatches on `model.api`, and a model whose api has
* no entry produces a stream error. One-shot operation maps dispatch on
* `model.api` the same way. At least one concrete implementation across
* `api`/`images`/`classifiers` is required; empty maps are rejected.
*/
function createProvider(input) {
	const single = input.api && typeof input.api.stream === "function" ? input.api : void 0;
	const byApi = single || !input.api ? void 0 : input.api;
	const images = input.images;
	const classifiers = input.classifiers;
	const streams = single ? [single] : Object.values(byApi ?? {}).filter((entry) => entry !== void 0);
	const imageImplementations = Object.values(images ?? {}).filter((entry) => entry !== void 0);
	const classifierImplementations = Object.values(classifiers ?? {}).filter((entry) => entry !== void 0);
	if (streams.length === 0 && imageImplementations.length === 0 && classifierImplementations.length === 0) throw new Error(`Provider ${input.id}: at least one of "api", "images", or "classifiers" is required.`);
	const baselineModels = input.models;
	let dynamicModels = [];
	const fetchModels = input.fetchModels;
	const currentModels = () => {
		const merged = [...baselineModels];
		for (const model of dynamicModels) {
			const index = merged.findIndex((entry) => getModelType(entry) === getModelType(model) && entry.id === model.id);
			if (index >= 0) merged[index] = model;
			else merged.push(model);
		}
		return merged;
	};
	const apiFor = (model) => single ?? byApi?.[model.api];
	const dispatch = (model, run) => {
		const streams = apiFor(model);
		if (!streams) return lazyStream(model, async () => {
			throw new ModelsError("stream", `Provider ${input.id} has no API implementation for "${model.api}"`);
		});
		return run(streams);
	};
	const provider = {
		id: input.id,
		name: input.name ?? input.id,
		baseUrl: input.baseUrl,
		headers: input.headers,
		auth: input.auth,
		getModels: () => currentModels().filter((model) => isModelType(model, "chat")),
		getAllModels: currentModels,
		refreshModels: fetchModels ? async (context) => {
			if (context.stored) {
				const restored = context.stored.models.filter((model) => model.provider === input.id).map((model) => model);
				if (!await context.publish({ update: () => {
					dynamicModels = restored;
				} })) return;
			}
			if (!context.allowNetwork || context.signal.aborted) return;
			const fetched = await fetchModels(context);
			if (context.signal.aborted) return;
			const refreshed = fetched.filter(hasKnownModelType);
			await context.publish({
				persist: {
					models: refreshed,
					checkedAt: Date.now()
				},
				update: () => {
					dynamicModels = refreshed;
				}
			});
		} : void 0,
		filterModels: input.filterModels,
		filterAllModels: input.filterAllModels,
		stream: (model, context, options) => dispatch(model, (streams) => streams.stream(model, context, options)),
		streamSimple: (model, context, options) => dispatch(model, (streams) => streams.streamSimple(model, context, options))
	};
	if (streams.some((entry) => entry.fetchDeferred !== void 0)) provider.fetchDeferred = (model, handle, options) => lazyStream(model, async () => {
		const implementation = apiFor(model);
		if (!implementation?.fetchDeferred) throw new ModelsError("provider", `Provider ${input.id} does not support deferred responses for "${model.api}"`);
		return implementation.fetchDeferred(model, handle, options);
	});
	if (streams.some((entry) => entry.cancelDeferred !== void 0)) provider.cancelDeferred = async (model, handle, options) => {
		const implementation = apiFor(model);
		if (!implementation?.cancelDeferred) throw new ModelsError("provider", `Provider ${input.id} cannot cancel deferred responses for "${model.api}"`);
		await implementation.cancelDeferred(model, handle, options);
	};
	if (images && imageImplementations.length > 0) provider.generateImages = async (model, context, options) => {
		const implementation = images[model.api];
		if (!implementation) return imageErrorResult(model, new ModelsError("provider", `Provider ${input.id} has no image generation implementation for "${model.api}"`));
		return implementation.generateImages(model, context, options);
	};
	if (classifiers && classifierImplementations.length > 0) provider.classify = async (model, context, options) => {
		const implementation = classifiers[model.api];
		if (!implementation) return classifierErrorResult(model, new ModelsError("provider", `Provider ${input.id} has no classifier implementation for "${model.api}"`));
		return implementation.classify(model, context, options);
	};
	return provider;
}
function calculateCost(model, usage) {
	const inputTokens = usage.input + usage.cacheRead + usage.cacheWrite;
	let rates = model.cost;
	let matchedThreshold = -1;
	for (const tier of model.cost.tiers ?? []) if (inputTokens > tier.inputTokensAbove && tier.inputTokensAbove > matchedThreshold) {
		rates = tier;
		matchedThreshold = tier.inputTokensAbove;
	}
	const longWrite = usage.cacheWrite1h ?? 0;
	const shortWrite = usage.cacheWrite - longWrite;
	usage.cost.input = rates.input / 1e6 * usage.input;
	usage.cost.output = rates.output / 1e6 * usage.output;
	usage.cost.cacheRead = rates.cacheRead / 1e6 * usage.cacheRead;
	usage.cost.cacheWrite = (rates.cacheWrite * shortWrite + rates.input * 2 * longWrite) / 1e6;
	usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
	usage.cost.totalFromProvider = false;
	return usage.cost;
}
const EXTENDED_THINKING_LEVELS = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
function getSupportedThinkingLevels(model) {
	if (!model.reasoning) return ["off"];
	return EXTENDED_THINKING_LEVELS.filter((level) => {
		const mapped = model.thinkingLevelMap?.[level];
		if (mapped === null) return false;
		if (level === "xhigh" || level === "max") return mapped !== void 0;
		return true;
	});
}
function clampThinkingLevel(model, level) {
	const availableLevels = getSupportedThinkingLevels(model);
	if (availableLevels.includes(level)) return level;
	const requestedIndex = EXTENDED_THINKING_LEVELS.indexOf(level);
	if (requestedIndex === -1) return availableLevels[0] ?? "off";
	for (let i = requestedIndex; i < EXTENDED_THINKING_LEVELS.length; i++) {
		const candidate = EXTENDED_THINKING_LEVELS[i];
		if (availableLevels.includes(candidate)) return candidate;
	}
	for (let i = requestedIndex - 1; i >= 0; i--) {
		const candidate = EXTENDED_THINKING_LEVELS[i];
		if (availableLevels.includes(candidate)) return candidate;
	}
	return availableLevels[0] ?? "off";
}
//#endregion
export { lazyApi as _, getDeclaredTools as a, resolveTranscript as c, getSystemMessageText as d, ownedSlice as f, formatThrownValue as g, createAssistantMessageDiagnostic as h, createProvider as i, resolveTranscriptTools as l, appendAssistantMessageDiagnostic as m, clampThinkingLevel as n, getInitialSystemMessage as o, renderSystemMessageUpdate as p, createModels as r, normalizeContext as s, calculateCost as t, getIdentityHeaders as u, AssistantMessageEventStream as v, createAssistantMessageEventStream as y };
