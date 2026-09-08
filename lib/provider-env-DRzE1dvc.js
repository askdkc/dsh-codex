import { createRequire } from "node:module";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region node_modules/@earendil-works/pi-ai/dist/utils/provider-env.js
let procEnvCache = null;
/**
* Fallback for https://github.com/oven-sh/bun/issues/27802.
* Bun compiled binaries can expose an empty process.env inside Linux sandboxes
* even though /proc/self/environ contains the environment.
*
* This intentionally duplicates restoreSandboxEnv() in
* packages/coding-agent/src/bun/restore-sandbox-env.ts. The ai package can be
* used directly, without going through that entrypoint, so provider env lookup
* must not depend on process.env having been patched.
*/
function getBunSandboxEnvValue(name) {
	if (typeof process === "undefined" || !process.versions?.bun || Object.keys(process.env).length > 0) return;
	if (procEnvCache === null) {
		procEnvCache = /* @__PURE__ */ new Map();
		try {
			const { readFileSync } = __require("node:fs");
			const data = readFileSync("/proc/self/environ", "utf-8");
			for (const entry of data.split("\0")) {
				const idx = entry.indexOf("=");
				if (idx > 0) procEnvCache.set(entry.slice(0, idx), entry.slice(idx + 1));
			}
		} catch {}
	}
	return procEnvCache.get(name);
}
/**
* Resolve a provider env value from scoped overrides, normal process.env, then
* the duplicated Bun sandbox fallback for direct pi-ai consumers.
*/
function getProviderEnvValue(name, env) {
	return env?.[name] || (typeof process !== "undefined" ? process.env[name] : void 0) || getBunSandboxEnvValue(name) || void 0;
}
//#endregion
export { __commonJSMin as n, getProviderEnvValue as t };
