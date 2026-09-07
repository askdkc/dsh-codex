# DSH: Codex subscription OAuth and live models

An out-of-tree DSH adapter for ChatGPT Codex subscription OAuth and its account-scoped model catalog. It adds `/codex-auth`, registers the `openai-codex` route, and refreshes the selectable models without hard-coding them in the Bundle patch. OAuth remains implemented by the existing DSH services.

## Compatibility

- Target DSH commit: `dd6322d604e00eec1ba5e0c8541159906a21094a`
- DSH release: `0.1.2-alpha.3`
- Cordis: `4.0.2`

## Installation

From a DeepSeek Harness source checkout, install the bundle directly from GitHub into the target profile:

```sh
pnpm dsh plugin --profile web add github:askdkc/dsh-codex
```

Replace `web` with another profile name when needed. Restart a running profile after installation so the new Bundle membership takes effect.

This repository commits the built `lib/` artifacts and `cordis.patch.yml`, so installation from the GitHub spec does not require an npm publication or GitHub Release tarball.

To inspect the composed profile without booting it:

```sh
pnpm dsh --profile web --dump-config
```

The dump should contain the `codex-subscription-oauth` row. The base `llm-pi-ai.providers` map is intentionally empty: `llm-pi-ai` remains mounted for its OAuth flow, while this plugin owns the dynamic `openai-codex` route.

To remove the bundle:

```sh
pnpm dsh plugin --profile web remove codex-subscription-oauth-plugin
```

## Usage

Run the command in DSH:

```text
/codex-auth
```

The command selects the browser login path automatically and presents the OAuth authorization URL for you to open. It then waits for the localhost callback at `http://localhost:1455/callback`. If the callback cannot reach the running DSH process, the command asks for the manual redirect URL or authorization code instead. The callback and manual prompt are part of one bounded authorization attempt.

Credentials are owned by the existing `credentials-local` provider. This package does not implement OAuth, PKCE, callback exchange, refresh, revocation, or credential persistence. It also does not log or persist credentials and does not place authentication values in model context or command/session output.

## Live Model Catalog

Authentication is a host command, not a model tool. `/codex-auth` uses the DSH command and user-question surfaces, reports only fixed success, cancellation, or failure text, and keeps OAuth notices local to the current attempt. No model context, transcript, or long-lived application log is used for the authorization exchange.

The plugin follows the same two-source boundary as [`dsh-opencode`](https://github.com/askdkc/dsh-opencode):

- OpenAI's authenticated Codex `/models` endpoint decides which models the current account may see and their display order.
- pi-ai `0.85.x` supplies the executable transport and capability metadata. GPT-6 Astra is included starting with the pinned `0.85.1` lockfile resolution.

Only the intersection is published. A model returned by OpenAI but unknown to the installed pi-ai catalog is not advertised as executable. This avoids inventing context/output limits or wire compatibility for a newly named model.

The catalog refreshes on startup, every 15 minutes, after the one-minute display revalidation TTL, and once before rejecting an unknown selected model. Requests are authenticated with the existing Codex OAuth grant, coalesced to one in-flight fetch, bounded to 1 MiB and 15 seconds, and revalidated with ETag. A failed, empty, or wholly unsupported response retains the last usable generation. Before login, or when no live generation is available, the bundled pi-ai catalog is the fallback.

An executable-set change atomically republishes the same DSH adapter route, so an open model selector receives the normal `llm/adapters-updated` notification; a DSH restart is not required for later refreshes.

## Known Limitations

- Browser login only; there is no non-browser provider selection in this adapter.
- The callback is fixed to `localhost:1455`.
- There is no credential revocation command.
- The package requires the exact DSH `0.1.2-alpha.3` pre-release pin and compatible Cordis version.
- Newly returned models remain hidden until the installed pi-ai `0.85.x` metadata can execute them safely.
- The bundle patch replaces the `llm-pi-ai` base configuration with an empty provider map to avoid duplicate ownership of `openai-codex`; the package includes a guard test for that replacement.

## License

MIT

See `LICENSE`.
