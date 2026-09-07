import { Context } from "@deepseek-ai/cordis";

//#region src/index.d.ts
/** Cordis plugin name. */
declare const name = "codex-subscription-oauth";
/** Services required before the command and model adapter can activate. */
declare const inject: string[];
/** Optional live-catalog timing controls supplied by the bundle patch. */
interface Config {
  readonly catalog?: {
    readonly refreshIntervalMs?: number;
    readonly revalidateAfterMs?: number;
    readonly timeoutMs?: number;
  };
}
/** Register the command, dynamic model route, and fallback authorization service. */
declare function apply(ctx: Context, config?: Config): void;
//#endregion
export { Config, apply, inject, name };