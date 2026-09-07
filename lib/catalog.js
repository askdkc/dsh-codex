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
export { CodexCatalog, accountIdFromAccessToken, parseOfficialModels };
