# dsh-codex

English | [日本語](./README.ja.md)

## Usage

Install the plugin from a DeepSeek Harness checkout:

```sh
pnpm dsh plugin --profile web add github:askdkc/dsh-codex
```

Replace `web` with the target profile name, then restart that profile.

For ACP, install the plugin in the ACP profile too:

```sh
pnpm dsh plugin --profile acp add github:askdkc/dsh-codex
```

Profiles load plugins independently: installing into `web` does not add models to `acp`. Restart the DSH process launched by your ACP client, then reopen its model selector. If the client uses a different profile, replace `acp` with that name.

If installation into an existing ACP profile fails with `ERR_PNPM_UNEXPECTED_STORE`, reinstall that profile's dependencies using the current pnpm store, then retry:

```sh
pnpm --dir ~/.dsh/profiles/acp install --force --frozen-lockfile
pnpm dsh plugin --profile acp add github:askdkc/dsh-codex
```

The first command rebuilds the profile's `node_modules` without changing its lockfile. If it fails, resolve that error before retrying the plugin installation. If you use a custom `DSH_HOME` or profile name, adjust both commands. The `allowBuilds` hint printed after a store mismatch does not fix this error.

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
