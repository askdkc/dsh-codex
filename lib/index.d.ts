import { Context } from "@deepseek-ai/cordis";

//#region src/index.d.ts
/** Cordis plugin name. */
declare const name = "codex-subscription-oauth";
/** Services required before the command adapter can activate. */
declare const inject: string[];
/** Register the command and own the fallback authorization service, if needed. */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name };