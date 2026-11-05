---
kind: upgrade-guide
description: "The pi-ai 1.5.0 catalog removes model IDs and lowers some model capacities."
---

# pi-ai 1.5.0 model catalog changes

English | [中文](guide.zh.md)

## Change

The pi-ai dependency changes from 1.3.0 to 1.5.0. These chat model IDs leave the catalog. Stored `modelOverrides` report missing-catalog diagnostics; new overrides are rejected. Explicit `models` entries lose their catalog defaults.

| Provider | Removed model IDs |
|---|---|
| `azure` | `gpt-5.2-chat-latest`, `gpt-5.3-chat-latest`, `gpt-realtime-2.1` |
| `baseten` | `deepseek-ai/DeepSeek-V4-Pro`, `moonshotai/Kimi-K2.5`, `moonshotai/Kimi-K2.6`, `moonshotai/Kimi-K2.7-Code`, `nvidia/Nemotron-120B-A12B`, `thinkingmachines/inkling`, `thinkingmachines/inkling-small`, `zai-org/GLM-4.7`, `zai-org/GLM-5`, `zai-org/GLM-5.1` |
| `github-copilot` | `claude-opus-4.7`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.7-flash`, `kimi-k2.7-code`, `gpt-5-mini`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.5`, `mai-code-1-flash-picker` |
| `google` | `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-live-preview` |
| `google-vertex` | `gemini-3.1-flash-lite-image` |
| `huggingface` | `Qwen/Qwen3-Next-80B-A3B-Thinking`, `XiaomiMiMo/MiMo-V2-Flash`, `zai-org/GLM-4.5` |
| `mistral` | `devstral-medium-2507`, `devstral-small-2505`, `devstral-small-2507`, `mistral-large-2411`, `mistral-nemo`, `open-mistral-7b`, `open-mixtral-8x22b`, `open-mixtral-8x7b`, `pixtral-large-latest` |
| `nvidia` | `z-ai/glm-5.3` |
| `openai` | `gpt-5.2-chat-latest`, `gpt-5.3-chat-latest`, `gpt-realtime-2.1` |
| `openai-codex` | `gpt-5.3-codex-spark`, `gpt-5.5` |
| `opencode` | `claude-sonnet-4`, `cat-jam-free`, `deepseek-v4-flash`, `deepseek-v4-flash-vision-exp`, `longcat-2.5-preview-free`, `muse-spark-1.3-contributor-free`, `nemotron-3-ultra-free`, `space-bunny-free`, `step-5-preview-free` |
| `opencode-go` | `cat-jam-free`, `gemini-4-argon-contributor`, `longcat-2.5-preview-free`, `space-bunny`, `step-5-preview-free` |
| `openrouter` | `arcee-ai/trinity-large-thinking`, `deepseek/deepseek-r1`, `google/gemini-2.5-flash-lite:batch`, `google/gemini-2.5-flash:batch`, `google/gemini-2.5-pro:batch`, `mistralai/codestral-2508:batch`, `mistralai/ministral-8b-2512:batch`, `mistralai/mistral-large-2512:batch`, `mistralai/mistral-medium-3.1:batch`, `mistralai/mistral-small-2603:batch`, `nvidia/nemotron-3-super-120b-a12b:free`, `openai/gpt-3.5-turbo`, `openai/gpt-3.5-turbo:batch`, `openai/gpt-4-turbo`, `openai/o1`, `openai/o3-mini`, `openai/o3-mini-high`, `openai/o4-mini`, `openai/o4-mini-high`, `poolside/laguna-s-2.1`, `poolside/laguna-s-2.1:free`, `poolside/laguna-xs-2.1`, `poolside/laguna-xs-2.1:free`, `qwen/qwen3-next-80b-a3b-thinking`, `upstage/solar-pro-3` |
| `radius` | `gpt-5.3-codex`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.5` |
| `together` | `deepseek-ai/DeepSeek-V4-Flash-0731`, `meta-llama/Llama-3.3-70B-Instruct-Turbo`, `MiniMaxAI/MiniMax-M2.7`, `nvidia/nemotron-3-ultra-550b-a55b`, `Qwen/Qwen2.5-7B-Instruct-Turbo` |
| `vercel-ai-gateway` | `anthropic/claude-sonnet-4`, `arcee-ai/trinity-large-thinking`, `openai/gpt-3.5-turbo`, `openai/gpt-4-turbo`, `openai/gpt-4.1-nano-batch`, `openai/gpt-4.1-nano-fast`, `openai/o4-mini-fast`, `poolside/laguna-s-2.1-free`, `spacexai/grok-4.1-fast-non-reasoning`, `spacexai/grok-4.1-fast-reasoning`, `stealth/cat-jam` |
| `xiaomi` | `mimo-v2.5`, `mimo-v2.5-pro`, `mimo-v2.5-pro-ultraspeed` |
| `xiaomi-token-plan-ams`, `xiaomi-token-plan-cn`, `xiaomi-token-plan-sgp` | `mimo-v2.5`, `mimo-v2.5-pro` |

These catalog limits decrease. Values are tokens; `—` means that limit did not decrease. Explicit overrides still take precedence. `maxTokens` describes model capacity, not an implicit request limit.

| Provider/model | New contextWindow / maxTokens |
|---|---|
| `huggingface/deepseek-ai/DeepSeek-R1-0528` | — / 32768 |
| `huggingface/Qwen/Qwen3-235B-A22B-Thinking-2507` | — / 81920 |
| `huggingface/Qwen/Qwen3-Coder-480B-A35B-Instruct` | — / 65536 |
| `huggingface/Qwen/Qwen3-Next-80B-A3B-Instruct` | — / 32768 |
| `openrouter/~z-ai/glm-flash-latest` | — / 131072 |
| `openrouter/deepseek/deepseek-chat` | 128000 / 16000 |
| `openrouter/google/gemma-4-26b-a4b-it` | — / 32768 |
| `openrouter/meta-llama/llama-3.3-70b-instruct` | — / 16384 |
| `openrouter/meta-llama/llama-4-scout` | — / 16384 |
| `openrouter/mistralai/mistral-small-3.2-24b-instruct` | 128000 / — |
| `openrouter/qwen/qwen3-next-80b-a3b-instruct` | — / 16384 |
| `openrouter/xiaomi/mimo-v2.5` | 1000000 / 65536 |
| `openrouter/xiaomi/mimo-v2.5-pro` | 262144 / — |
| `openrouter/z-ai/glm-5.3-flash` | — / 131072 |
| `together/Qwen/Qwen3.6-Plus` | — / 65536 |
| `together/Qwen/Qwen3.7-Max` | — / 131072 |
| `together/zai-org/GLM-5.3` | 1048575 / — |

## Migration

1. In Settings → Models, replace removed IDs with supported models. Check endpoints, capabilities, and prices; IDs have no automatic replacement.
2. Update selections in `cordis.patch.yml`, preset patches, and affected Sessions. Remove obsolete `providers.<provider>.modelOverrides.<id>` entries and replace removed IDs in `providers.<provider>.models` lists. See the pi-ai configuration reference in `packages/llm/llm-pi-ai/README.md` of the DeepSeek Harness checkout.
3. Review capacity and reasoning overrides against the endpoint's supported values. Start the profile, confirm the model has no configuration diagnostic, and send a short prompt.
