# codex-subscription-oauth-plugin

A small out-of-tree DSH command adapter for ChatGPT Codex subscription OAuth. It adds `/codex-auth`; the OAuth implementation remains in the existing DSH services.

## Compatibility

- Target DSH commit: `dd6322d604e00eec1ba5e0c8541159906a21094a`
- DSH release: `0.1.2-alpha.3`
- Cordis: `4.0.2`

The package is pinned to the exact pre-release DSH contracts above. Install it into a compatible DSH profile from a tarball:

```text
dsh plugin --profile <name> add <tgz>
```

## Usage

Run the command in DSH:

```text
/codex-auth
```

The command selects the browser login path automatically and presents the OAuth authorization URL for you to open. It then waits for the localhost callback at `http://localhost:1455/callback`. If the callback cannot reach the running DSH process, the command asks for the manual redirect URL or authorization code instead. The callback and manual prompt are part of one bounded authorization attempt.

Credentials are owned by the existing `credentials-local` provider. This package does not implement OAuth, PKCE, callback exchange, refresh, revocation, or credential persistence. It also does not log or persist credentials and does not place authentication values in model context or command/session output.

## Model Experience

Authentication is a host command, not a model tool. `/codex-auth` uses the DSH command and user-question surfaces, reports only fixed success, cancellation, or failure text, and keeps OAuth notices local to the current attempt. No model context, transcript, or long-lived application log is used for the authorization exchange.

## Known Limitations

- Browser login only; there is no non-browser provider selection in this adapter.
- The callback is fixed to `localhost:1455`.
- There is no credential revocation command.
- The package requires the exact DSH `0.1.2-alpha.3` pre-release pin and compatible Cordis version.
- The bundle patch replaces the `llm-pi-ai` base configuration; the package includes a guard test for that replacement.

## License

MIT. See `LICENSE`.
