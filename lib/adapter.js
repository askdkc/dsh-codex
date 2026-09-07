import { LlmError } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
//#region src/adapter.ts
/** Catalog-aware wrapper around DSH's public pi-ai adapter. */
const ROUTE = "openai-codex";
/** Revalidate at picker time and force one refresh before rejecting an id. */
var LiveCodexAdapter = class extends PiAiAdapter {
	options;
	constructor(options) {
		super(options);
		this.options = options;
	}
	assertRoute(provider) {
		if (provider !== ROUTE) throw new LlmError(`codex-subscription-oauth: adapter does not own provider "${provider}"`, "NO_ADAPTER");
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
export { LiveCodexAdapter };
