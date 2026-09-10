import { c as lazyApi, i as createProvider, r as createModels } from "./models-DaqoXO5b.js";
import AuthorizationService, { AuthorizationDeclinedError } from "@deepseek-ai/dsh-authorization";
import { credentialKey, credentialKeyId, credentialKeyScope, isCredentialKeySegment } from "@deepseek-ai/dsh-credentials";
import { LlmError, resolveImageAttachmentAccess, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter, recordKeyFor } from "@deepseek-ai/dsh-llm-pi-ai";
//#region node_modules/@earendil-works/pi-ai/dist/auth/helpers.js
/**
* Wraps a dynamically imported `OAuthAuth` so provider definitions can
* advertise OAuth without importing the implementation. The flow loads on
* first `login`/`refresh`/`toAuth` call; callers keep Node-only flow code out
* of bundles by loading through a bundler-opaque dynamic import (variable
* specifier, see the bedrock lazy wrapper).
*/
function lazyOAuth(input) {
	let promise;
	const loaded = () => {
		promise ??= input.load();
		return promise;
	};
	return {
		name: input.name,
		isSubscription: input.isSubscription,
		loginLabel: input.loginLabel,
		login: async (interaction) => (await loaded()).login(interaction),
		refresh: async (credential, signal) => (await loaded()).refresh(credential, signal),
		toAuth: async (credential) => (await loaded()).toAuth(credential)
	};
}
//#endregion
//#region node_modules/@earendil-works/pi-ai/dist/api/openai-codex-responses.lazy.js
const openAICodexResponsesApi = () => lazyApi(() => import("./openai-codex-responses-DPxdQtbt.js"));
//#endregion
//#region node_modules/@earendil-works/pi-ai/dist/auth/oauth/load.js
var __rewriteRelativeImportExtension = function(path, preserveJsx) {
	if (typeof path === "string" && /^\.\.?\//.test(path)) return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
		return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
	});
	return path;
};
/**
* Loads an OAuth flow module through a variable specifier so bundlers cannot
* follow the import into Node-only flow code (`node:http` callback servers,
* `node:crypto` PKCE). The `.ts`/`.js` rewrite keeps the trick working from
* both source and built output.
*/
const importOAuthModule = (specifier) => {
	return import(__rewriteRelativeImportExtension(import.meta.url.endsWith(".js") ? specifier.replace(/\.ts$/, ".js") : specifier));
};
const loadOpenAICodexOAuth = async () => {
	return (await importOAuthModule("./openai-codex.ts")).openaiCodexOAuth;
};
//#endregion
//#region node_modules/@earendil-works/pi-ai/dist/providers/data/openai-codex.json
var openai_codex_default = { "openai-codex-responses": {
	"gpt-5.3-codex-spark": {
		"id": "gpt-5.3-codex-spark",
		"name": "GPT-5.3 Codex Spark",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text"],
		"cost": {
			"input": 1.75,
			"output": 14,
			"cacheRead": .175,
			"cacheWrite": 0
		},
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"minimal": "low"
		},
		"compat": { "supportsOpenAIGrammarTools": true }
	},
	"gpt-5.4": {
		"id": "gpt-5.4",
		"name": "GPT-5.4",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 2.5,
			"output": 15,
			"cacheRead": .25,
			"cacheWrite": 0,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 5,
				"output": 22.5,
				"cacheRead": .5,
				"cacheWrite": 0
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsToolSearch": true
		}
	},
	"gpt-5.4-mini": {
		"id": "gpt-5.4-mini",
		"name": "GPT-5.4 mini",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": .75,
			"output": 4.5,
			"cacheRead": .075,
			"cacheWrite": 0
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsToolSearch": true
		}
	},
	"gpt-5.5": {
		"id": "gpt-5.5",
		"name": "GPT-5.5",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 5,
			"output": 30,
			"cacheRead": .5,
			"cacheWrite": 0,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 10,
				"output": 45,
				"cacheRead": 1,
				"cacheWrite": 0
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsToolSearch": true
		}
	},
	"gpt-5.6-luna": {
		"id": "gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": .2,
			"output": 1.2,
			"cacheRead": .02,
			"cacheWrite": .25,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": .4,
				"output": 1.8,
				"cacheRead": .04,
				"cacheWrite": .5
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"max": "max",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true
		}
	},
	"gpt-5.6-sol": {
		"id": "gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 5,
			"output": 30,
			"cacheRead": .5,
			"cacheWrite": 6.25,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 10,
				"output": 45,
				"cacheRead": 1,
				"cacheWrite": 12.5
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"max": "max",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true
		}
	},
	"gpt-5.6-terra": {
		"id": "gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 2,
			"output": 12,
			"cacheRead": .2,
			"cacheWrite": 2.5,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 4,
				"output": 18,
				"cacheRead": .4,
				"cacheWrite": 5
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"xhigh": "xhigh",
			"max": "max",
			"minimal": "low"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true
		}
	},
	"gpt-6-astra": {
		"id": "gpt-6-astra",
		"name": "GPT-6 Astra",
		"api": "openai-codex-responses",
		"provider": "openai-codex",
		"baseUrl": "https://chatgpt.com/backend-api",
		"reasoning": true,
		"input": ["text", "image"],
		"cost": {
			"input": 10,
			"output": 50,
			"cacheRead": 1,
			"cacheWrite": 12.5,
			"tiers": [{
				"inputTokensAbove": 272e3,
				"input": 20,
				"output": 75,
				"cacheRead": 2,
				"cacheWrite": 25
			}]
		},
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"thinkingLevelMap": {
			"off": null,
			"minimal": "low",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		},
		"compat": {
			"supportsOpenAIGrammarTools": true,
			"supportsAdditionalTools": true,
			"supportsToolSearch": true
		}
	}
} };
//#endregion
//#region node_modules/@earendil-works/pi-ai/dist/model-catalog.js
function flattenModelCatalog(_provider, groups) {
	return Object.assign({}, ...Object.values(groups));
}
//#endregion
//#region node_modules/@earendil-works/pi-ai/dist/providers/openai-codex.models.js
const OPENAI_CODEX_MODELS = flattenModelCatalog("openai-codex", openai_codex_default);
//#endregion
//#region node_modules/@earendil-works/pi-ai/dist/providers/openai-codex.js
function openaiCodexProvider() {
	return createProvider({
		id: "openai-codex",
		name: "OpenAI Codex",
		baseUrl: "https://chatgpt.com/backend-api",
		auth: { oauth: lazyOAuth({
			name: "OpenAI (ChatGPT Plus/Pro)",
			isSubscription: true,
			load: loadOpenAICodexOAuth
		}) },
		models: Object.values(OPENAI_CODEX_MODELS),
		api: openAICodexResponsesApi()
	});
}
//#endregion
//#region src/adapter.ts
/** Catalog-aware wrapper around DSH's public pi-ai adapter. */
const ROUTE$1 = "openai-codex";
/** Revalidate at picker time and force one refresh before rejecting an id. */
var LiveCodexAdapter = class extends PiAiAdapter {
	options;
	constructor(options) {
		super(options);
		this.options = options;
	}
	assertRoute(provider) {
		if (provider !== ROUTE$1) throw new LlmError(`codex-subscription-oauth: adapter does not own provider "${provider}"`, "NO_ADAPTER");
	}
	async ensureModel(provider, model) {
		this.assertRoute(provider);
		await this.options.catalog.ensureInitial(this.options.initialWaitMs);
		this.options.catalog.revalidateIfNeeded();
		if (this.options.catalog.current.models.some((candidate) => candidate.id === model)) return;
		await this.options.catalog.forceRefresh();
		if (!this.options.catalog.current.models.some((candidate) => candidate.id === model)) throw new LlmError(`codex-subscription-oauth: model "${model}" is not in the current executable Codex catalog`, "UNKNOWN_MODEL");
	}
	async listModels(provider) {
		this.assertRoute(provider);
		await this.options.catalog.ensureInitial(this.options.initialWaitMs);
		this.options.catalog.revalidateIfNeeded();
		return super.listModels(provider);
	}
	async resolveModel(provider, model, signal) {
		await this.ensureModel(provider, model);
		return super.resolveModel(provider, model, signal);
	}
	async prepareCall(provider, model, signal) {
		await this.ensureModel(provider, model);
		return super.prepareCall(provider, model, signal);
	}
};
//#endregion
//#region src/catalog.ts
const MODEL_LIST_URL = "https://chatgpt.com/backend-api/codex/models?client_version=99.99.99";
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_MODEL_ID_CHARS = 200;
const JWT_CLAIM = "https://api.openai.com/auth";
const JITTER_RATIO = .1;
/**
* Own one live account-scoped list. The official endpoint decides visibility
* and order; the installed pi-ai catalog decides whether DSH can execute it.
*/
var CodexCatalog = class {
	baseline;
	baselineById;
	resolveCredential;
	refreshIntervalMs;
	revalidateAfterMs;
	timeoutMs;
	fetchImpl;
	now;
	random;
	onChange;
	warn;
	lifecycle = new AbortController();
	inFlight;
	initial;
	timer;
	etag;
	accountId;
	lastCheckedAt;
	disposed = false;
	revision = 0;
	snapshotValue;
	constructor(options) {
		this.baseline = Object.freeze([...options.baseline]);
		this.baselineById = new Map(this.baseline.map((model) => [model.id, model]));
		this.resolveCredential = options.resolveCredential;
		this.refreshIntervalMs = options.refreshIntervalMs;
		this.revalidateAfterMs = options.revalidateAfterMs;
		this.timeoutMs = options.timeoutMs;
		this.fetchImpl = options.fetch ?? globalThis.fetch;
		this.now = options.now ?? (() => Date.now());
		this.random = options.random ?? Math.random;
		this.onChange = options.onChange ?? (() => {});
		this.warn = options.warn ?? (() => {});
		this.snapshotValue = Object.freeze({
			source: "bundled",
			models: this.baseline,
			revision: 0
		});
	}
	get current() {
		return this.snapshotValue;
	}
	/** Start one initial refresh followed by jittered periodic revalidation. */
	start() {
		if (this.initial !== void 0) return this.initial;
		this.initial = this.refresh().finally(() => {
			if (!this.disposed) this.schedule();
		});
		return this.initial;
	}
	/** Stop timers and every in-flight request; late completions cannot publish. */
	stop() {
		if (this.disposed) return;
		this.disposed = true;
		this.lifecycle.abort();
		if (this.timer !== void 0) clearTimeout(this.timer);
		this.timer = void 0;
	}
	/** Wait only up to the caller's latency budget for the initial refresh. */
	async ensureInitial(waitMs) {
		const initial = this.initial ?? this.start();
		if (waitMs <= 0) return;
		let handle;
		await Promise.race([initial, new Promise((resolve) => {
			handle = setTimeout(resolve, waitMs);
		})]);
		if (handle !== void 0) clearTimeout(handle);
	}
	/** Revalidate in the background when the display-time TTL has elapsed. */
	revalidateIfNeeded() {
		if (this.disposed) return;
		if (this.lastCheckedAt !== void 0 && this.now() - this.lastCheckedAt < this.revalidateAfterMs) return;
		this.refresh();
	}
	/** Force one bounded refresh, joining an already-running request. */
	forceRefresh() {
		if (this.inFlight !== void 0) return this.inFlight;
		this.lastCheckedAt = void 0;
		return this.refresh();
	}
	/** Coalesce every caller onto one authenticated list request. */
	refresh() {
		if (this.disposed) return Promise.resolve();
		if (this.inFlight !== void 0) return this.inFlight;
		const task = this.runRefresh().catch((error) => {
			if (!this.disposed) this.warn(`codex-subscription-oauth: model catalog refresh failed (${errorCode(error)})`);
		}).finally(() => {
			if (this.inFlight === task) this.inFlight = void 0;
		});
		this.inFlight = task;
		return task;
	}
	async runRefresh() {
		this.lastCheckedAt = this.now();
		const requestController = new AbortController();
		const abort = () => requestController.abort();
		this.lifecycle.signal.addEventListener("abort", abort, { once: true });
		const timeout = setTimeout(abort, this.timeoutMs);
		try {
			let credential;
			try {
				credential = await this.resolveCredential(requestController.signal);
			} catch (error) {
				if (requestController.signal.aborted) throw error;
				throw Object.assign(/* @__PURE__ */ new Error("catalog authentication failed"), { code: "AUTH" });
			}
			if (this.disposed || requestController.signal.aborted) return;
			if (credential === void 0) {
				this.etag = void 0;
				this.accountId = void 0;
				this.publish("bundled", this.baseline);
				return;
			}
			if (credential.accountId !== this.accountId) {
				this.etag = void 0;
				this.publish("bundled", this.baseline);
			}
			this.accountId = credential.accountId;
			let response;
			try {
				response = await this.fetchImpl(MODEL_LIST_URL, {
					method: "GET",
					headers: {
						accept: "application/json",
						authorization: `Bearer ${credential.accessToken}`,
						...credential.accountId === void 0 ? {} : { "chatgpt-account-id": credential.accountId },
						...this.etag === void 0 ? {} : { "if-none-match": this.etag },
						originator: "pi",
						"user-agent": "dsh-codex/0.1.0"
					},
					redirect: "error",
					signal: requestController.signal
				});
			} catch (error) {
				if (requestController.signal.aborted) throw error;
				throw Object.assign(/* @__PURE__ */ new Error("model list network failure"), { code: "NETWORK" });
			}
			if (response.status === 304) return;
			if (!response.ok) throw Object.assign(/* @__PURE__ */ new Error("HTTP status"), { code: `HTTP_${response.status}` });
			const text = await readBoundedText(response, MAX_RESPONSE_BYTES);
			let payload;
			try {
				payload = JSON.parse(text);
			} catch {
				throw Object.assign(/* @__PURE__ */ new Error("invalid model response JSON"), { code: "INVALID_JSON" });
			}
			const official = parseOfficialModels(payload);
			if (official.length === 0) throw Object.assign(/* @__PURE__ */ new Error("empty model list"), { code: "EMPTY_LIST" });
			const models = official.map((entry) => {
				const baseline = this.baselineById.get(entry.slug);
				if (baseline === void 0) return void 0;
				if (entry.name === void 0 || entry.name === baseline.name) return baseline;
				return Object.freeze({
					...baseline,
					name: entry.name
				});
			}).filter((model) => model !== void 0);
			if (models.length === 0) throw Object.assign(/* @__PURE__ */ new Error("no executable model metadata"), { code: "NO_EXECUTABLE_MODELS" });
			this.etag = boundedHeader(response.headers.get("etag"));
			this.publish("live", Object.freeze(models));
		} catch (error) {
			if (requestController.signal.aborted) {
				if (this.disposed) return;
				throw Object.assign(/* @__PURE__ */ new Error("model list timeout"), { code: "TIMEOUT" });
			}
			throw error;
		} finally {
			clearTimeout(timeout);
			this.lifecycle.signal.removeEventListener("abort", abort);
		}
	}
	publish(source, models) {
		if (this.disposed) return;
		const previous = this.snapshotValue;
		if (previous.source === source && sameModels(previous.models, models)) return;
		this.revision += 1;
		const snapshot = Object.freeze({
			source,
			models,
			revision: this.revision
		});
		this.snapshotValue = snapshot;
		this.onChange(snapshot);
	}
	schedule() {
		if (this.disposed) return;
		if (this.timer !== void 0) clearTimeout(this.timer);
		const multiplier = 1 - JITTER_RATIO + this.random() * JITTER_RATIO * 2;
		this.timer = setTimeout(() => {
			this.timer = void 0;
			this.refresh().finally(() => this.schedule());
		}, Math.max(1, Math.round(this.refreshIntervalMs * multiplier)));
	}
};
/** Parse picker-visible entries in official priority order; malformed rows are skipped. */
function parseOfficialModels(payload) {
	if (!isRecord(payload) || !Array.isArray(payload.models)) throw Object.assign(/* @__PURE__ */ new Error("invalid model response"), { code: "INVALID_RESPONSE" });
	const seen = /* @__PURE__ */ new Set();
	const models = [];
	for (const [index, value] of payload.models.entries()) {
		if (!isRecord(value)) continue;
		const slug = value.slug;
		if (typeof slug !== "string" || slug.length === 0 || slug.length > MAX_MODEL_ID_CHARS || seen.has(slug)) continue;
		if (value.visibility !== "list") continue;
		seen.add(slug);
		const displayName = value.display_name;
		const name = typeof displayName === "string" && displayName.length > 0 && displayName.length <= MAX_MODEL_ID_CHARS ? displayName : void 0;
		const priority = typeof value.priority === "number" && Number.isSafeInteger(value.priority) ? value.priority : index;
		models.push(Object.freeze({
			slug,
			...name === void 0 ? {} : { name },
			priority
		}));
	}
	return Object.freeze(models.sort((left, right) => left.priority - right.priority));
}
/** Extract the account id without retaining or exposing any other JWT claim. */
function accountIdFromAccessToken(accessToken) {
	try {
		const payload = accessToken.split(".")[1];
		if (payload === void 0) return void 0;
		const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
		if (!isRecord(decoded) || !isRecord(decoded[JWT_CLAIM])) return void 0;
		const accountId = decoded[JWT_CLAIM].chatgpt_account_id;
		return typeof accountId === "string" && accountId.length > 0 ? accountId : void 0;
	} catch {
		return;
	}
}
async function readBoundedText(response, maxBytes) {
	const declared = Number(response.headers.get("content-length") ?? NaN);
	if (Number.isFinite(declared) && declared > maxBytes) {
		await response.body?.cancel();
		throw Object.assign(/* @__PURE__ */ new Error("response too large"), { code: "TOO_LARGE" });
	}
	if (response.body === null) return "";
	const reader = response.body.getReader();
	const chunks = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > maxBytes) throw Object.assign(/* @__PURE__ */ new Error("response too large"), { code: "TOO_LARGE" });
			chunks.push(value);
		}
	} finally {
		await reader.cancel().catch(() => {});
	}
	const result = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(result);
}
function boundedHeader(value) {
	return value !== null && value.length > 0 && value.length <= 1024 ? value : void 0;
}
function sameModels(left, right) {
	return left.length === right.length && left.every((model, index) => {
		const candidate = right[index];
		return model.id === candidate?.id && model.name === candidate.name;
	});
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function errorCode(error) {
	if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") return error.code.slice(0, 80);
	return "UNKNOWN";
}
//#endregion
//#region src/credentials.ts
const RECORD_SCOPE = "llm-pi-ai";
/** Remove explicitly undefined plain-object members before durable storage. */
function jsonImage(value) {
	if (Array.isArray(value)) return value.map((entry) => entry === void 0 ? null : jsonImage(entry));
	if (typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
		const image = {};
		for (const [key, member] of Object.entries(value)) if (member !== void 0) image[key] = jsonImage(member);
		return image;
	}
	return value;
}
/** Translate the record format owned by llm-pi-ai back to a pi-ai credential. */
function toCredential(record) {
	if (record === void 0) return void 0;
	if (record.kind === "api-key") return {
		type: "api_key",
		...record.key === void 0 ? {} : { key: record.key },
		...record.env === void 0 ? {} : { env: { ...record.env } }
	};
	return record.payload;
}
/** Translate a pi-ai credential to the same durable record format. */
function toRecord(credential) {
	if (credential.type === "api_key") return {
		kind: "api-key",
		...credential.key === void 0 ? {} : { key: credential.key },
		...credential.env === void 0 ? {} : { env: { ...credential.env } }
	};
	return {
		kind: "grant",
		payload: jsonImage(credential)
	};
}
/**
* Access only records owned by llm-pi-ai. OAuth refresh remains serialized by
* the DSH credential provider's cross-process modify operation.
*/
function credentialStoreFrom(ctx) {
	return {
		async read(providerId) {
			if (!isCredentialKeySegment(providerId)) return void 0;
			return toCredential(await ctx.credentials.readRecord(recordKeyFor(providerId)));
		},
		async list() {
			return (await ctx.credentials.listRecords()).filter((entry) => credentialKeyScope(entry.key) === RECORD_SCOPE).map((entry) => ({
				providerId: credentialKeyId(entry.key),
				type: entry.kind === "api-key" ? "api_key" : "oauth"
			}));
		},
		async modify(providerId, mutate) {
			if (!isCredentialKeySegment(providerId)) throw new Error(`codex-subscription-oauth: invalid credential provider id "${providerId}"`);
			return toCredential(await ctx.credentials.modifyRecord(recordKeyFor(providerId), async (current) => {
				const next = await mutate(toCredential(current));
				return next === void 0 ? void 0 : toRecord(next);
			}));
		},
		async delete(providerId) {
			if (!isCredentialKeySegment(providerId)) return;
			await ctx.credentials.deleteRecord(recordKeyFor(providerId));
		}
	};
}
/** Codex OAuth has no environment or filesystem-based authentication path. */
function codexAuthContext() {
	return {
		env: async () => void 0,
		fileExists: async () => false
	};
}
//#endregion
//#region src/index.ts
/** Cordis plugin name. */
const name = "codex-subscription-oauth";
/** Services required before the command and model adapter can activate. */
const inject = [
	"commands",
	"credentials",
	"llm",
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
const ROUTE = "openai-codex";
const DEFAULT_REFRESH_INTERVAL_MS = 900 * 1e3;
const DEFAULT_REVALIDATE_AFTER_MS = 60 * 1e3;
const DEFAULT_TIMEOUT_MS = 15 * 1e3;
const MAX_TIMER_DELAY_MS = 2147483647;
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300 * 1e3;
const DEFAULT_MAX_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET = 2048 * 2048;
const DEFAULT_REQUEST_IMAGE_MAX_BYTES = 1024 * 1024;
function positiveTimer(value, fallback, field) {
	const resolved = value ?? fallback;
	if (!Number.isSafeInteger(resolved) || resolved <= 0 || resolved > MAX_TIMER_DELAY_MS) throw new TypeError(`codex-subscription-oauth: catalog.${field} must be a positive timer value`);
	return resolved;
}
function resolveCatalogConfig(config) {
	return {
		refreshIntervalMs: positiveTimer(config.catalog?.refreshIntervalMs, DEFAULT_REFRESH_INTERVAL_MS, "refreshIntervalMs"),
		revalidateAfterMs: positiveTimer(config.catalog?.revalidateAfterMs, DEFAULT_REVALIDATE_AFTER_MS, "revalidateAfterMs"),
		timeoutMs: positiveTimer(config.catalog?.timeoutMs, DEFAULT_TIMEOUT_MS, "timeoutMs")
	};
}
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
/** Bind one immutable catalog generation to the upstream Codex transport. */
function providerWithModels(provider, models) {
	const generation = Object.freeze([...models]);
	return {
		...provider,
		getModels: () => generation
	};
}
/** Build the one profile shape consumed by DSH's public pi-ai adapter. */
function profileFor(provider, models) {
	return /* @__PURE__ */ new Map([[ROUTE, {
		provider: ROUTE,
		displayName: provider.name,
		streamIdleTimeoutMs: DEFAULT_STREAM_IDLE_TIMEOUT_MS,
		maxRequestImageBytes: DEFAULT_MAX_REQUEST_IMAGE_BYTES,
		requestImagePixelBudget: DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
		requestImageMaxBytes: DEFAULT_REQUEST_IMAGE_MAX_BYTES,
		retryPolicy: resolveRetryPolicy(void 0, `codex-subscription-oauth: provider "${ROUTE}" retryPolicy`),
		configuredMaxTokens: /* @__PURE__ */ new Map(),
		modelErrors: /* @__PURE__ */ new Map(),
		piProvider: providerWithModels(provider, models)
	}]]);
}
/** Register the command, dynamic model route, and fallback authorization service. */
function apply(ctx, config = {}) {
	const catalogConfig = resolveCatalogConfig(config);
	if (ctx.get("authorization") === void 0) ctx.plugin(AuthorizationService);
	ctx.commands.register({
		name: "codex-auth",
		description: "Sign in to ChatGPT for Codex",
		recordInput: false,
		handler: (invocation) => execute(invocation, ctx)
	});
	const upstream = openaiCodexProvider();
	const auth = {
		credentials: credentialStoreFrom(ctx),
		authContext: codexAuthContext()
	};
	const authModels = createModels(auth);
	authModels.setProvider(upstream);
	let profiles;
	let registration;
	const catalog = new CodexCatalog({
		...catalogConfig,
		baseline: upstream.getModels(),
		async resolveCredential(signal) {
			const accessToken = (await authModels.getAuth(ROUTE, { signal }))?.auth.apiKey;
			if (accessToken === void 0 || accessToken.length === 0) return void 0;
			const stored = await auth.credentials.read(ROUTE, { signal });
			const storedAccountId = stored?.type === "oauth" ? stored.accountId : void 0;
			const accountId = typeof storedAccountId === "string" && storedAccountId.length > 0 ? storedAccountId : accountIdFromAccessToken(accessToken);
			return {
				accessToken,
				...accountId === void 0 ? {} : { accountId }
			};
		},
		onChange(snapshot) {
			profiles = profileFor(upstream, snapshot.models);
			registration?.replace([ROUTE]);
		},
		warn: (message) => ctx.logger.warn(message)
	});
	profiles = profileFor(upstream, catalog.current.models);
	const adapter = new LiveCodexAdapter({
		profiles: () => profiles,
		resolveApiKey: async () => void 0,
		auth,
		resolveAttachments: () => ctx.get("attachments"),
		resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(attachments, (hostPath) => ctx.get("fs")?.processPathFromHostPath(hostPath), ref),
		catalog,
		initialWaitMs: catalogConfig.timeoutMs,
		onReplayDegrade: ({ provider, model, reason }) => {
			ctx.logger.warn(`codex-subscription-oauth: unusable replay state on "${provider}/${model}"; using provider-neutral history (${reason})`);
		}
	});
	registration = ctx.llm.registerAdapter([ROUTE], adapter);
	ctx.on("credentials/record-updated", (key) => {
		if (key !== CODEX_KEY) return;
		catalog.forceRefresh();
	});
	ctx.effect(() => () => catalog.stop(), "codex model catalog");
	catalog.start();
}
//#endregion
export { apply, inject, name };
