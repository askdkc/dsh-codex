# dsh-codex

English | [日本語](./README.ja.md)

## Usage

Install the plugin from a DeepSeek Harness checkout:

```sh
pnpm dsh plugin --profile web add github:askdkc/dsh-codex
```

Replace `web` with the target profile name, then restart that profile.

Sign in to ChatGPT for Codex:

```text
/codex-auth
```

Complete the browser login. If the localhost callback cannot reach DSH, paste the redirect URL or authorization code when prompted.

Remove the plugin:

```sh
pnpm dsh plugin --profile web remove codex-subscription-oauth-plugin
```

## License

MIT. See [LICENSE](./LICENSE).

Bundled third-party notices are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
