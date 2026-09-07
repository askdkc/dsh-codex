import { credentialKeyId, credentialKeyScope, isCredentialKeySegment } from "@deepseek-ai/dsh-credentials";
import { recordKeyFor } from "@deepseek-ai/dsh-llm-pi-ai";
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
export { codexAuthContext, credentialStoreFrom };
