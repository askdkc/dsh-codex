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

This plugin ships prebuilt `lib` files and does not need install-time build scripts. If an installation or update fails with `ERR_PNPM_IGNORED_BUILDS` naming `codex-subscription-oauth-plugin`, edit the target profile's `pnpm-workspace.yaml` (by default, `~/.dsh/profiles/web/pnpm-workspace.yaml`). In its existing `allowBuilds` map, explicitly skip this package's build scripts:

```yaml
allowBuilds:
  codex-subscription-oauth-plugin: false
```

Change an existing `codex-subscription-oauth-plugin: true` to `false`. Delete any other `allowBuilds` entries whose key starts with `codex-subscription-oauth-plugin@`, including repository URLs, commit URLs, and generated `set this to true or false` placeholders. Keep only the name-only `false` entry for this package and preserve other packages' settings. Save the profile file before retrying.

Unlike a name-only `true`, a name-only `false` also applies to Git dependencies: pnpm records an explicit decision to skip the scripts, so updates do not require commit-hash edits. This recovery works with pnpm 11.7.0; upgrading pnpm is not required. See pnpm's [Git dependency build settings](https://pnpm.io/settings/build#allowbuilds).

Then rerun the failed `pnpm dsh plugin ...` command from the DeepSeek Harness checkout. Even an update of another plugin checks this profile's dependencies; for example, retry a failed Kiokuko update with:

```sh
pnpm dsh plugin --profile web update kiokuko-dsh --latest
```

Wait for the command to exit successfully. `Already up to date` can appear before a build-policy error and does not by itself mean the update succeeded.

Use the same profile for the configuration edit and retry; adjust the path for a custom `DSH_HOME`. Running `pnpm approve-builds` in the Harness checkout targets that checkout, not the plugin profile. Changing `minimumReleaseAge` does not resolve build approval failures.

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
