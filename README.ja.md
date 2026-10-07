# dsh-codex

[English](./README.md) | 日本語

## 使い方

DeepSeek Harnessのチェックアウトからプラグインをインストールします。

```sh
pnpm dsh plugin --profile web add github:askdkc/dsh-codex
```

`web` は対象のプロファイル名に置き換え、インストール後にそのプロファイルを再起動してください。

ACPで使う場合は、ACP用プロファイルにもインストールします。

```sh
pnpm dsh plugin --profile acp add github:askdkc/dsh-codex
```

プラグインはプロファイルごとに読み込まれるため、`web` に導入しただけでは `acp` にモデルは追加されません。ACPクライアントが起動するDSHプロセスを再起動し、モデル選択を開き直してください。別のプロファイルを使っている場合は、`acp` をその名前に置き換えます。

このプラグインはビルド済みの `lib` を配布しており、インストール時のビルドスクリプトは不要です。インストールや更新が `ERR_PNPM_IGNORED_BUILDS` で失敗し、`codex-subscription-oauth-plugin` が表示された場合は、対象プロファイルの `pnpm-workspace.yaml`（標準では `~/.dsh/profiles/web/pnpm-workspace.yaml`）を編集します。既存の `allowBuilds` 内で、このパッケージのビルドスクリプトを実行しないよう明示してください。

```yaml
allowBuilds:
  codex-subscription-oauth-plugin: false
```

既に `codex-subscription-oauth-plugin: true` があれば `false` に変更します。`allowBuilds` のキーが `codex-subscription-oauth-plugin@` で始まる他の項目は、リポジトリURL、コミットURL、生成された `set this to true or false` のプレースホルダーも含めて削除してください。このパッケージの項目は名前だけの `false` 一つにし、他のパッケージの設定は保持します。再実行する前に、プロファイルの設定ファイルを保存してください。

名前だけの `true` と異なり、名前だけの `false` はGit依存関係にも適用されます。pnpmにスクリプトを実行しない判断を明示するため、更新のたびにコミットハッシュを書き換える必要はありません。この復旧手順はpnpm 11.7.0で動作し、pnpmの更新は不要です。詳しくはpnpmの [Git依存関係のビルド設定](https://pnpm.io/settings/build#allowbuilds) を参照してください。

その後、DeepSeek Harnessのチェックアウトから、失敗した `pnpm dsh plugin ...` コマンドを再実行します。別のプラグインを更新する場合も、このプロファイルの依存関係が確認されます。例えば、失敗したKiokukoの更新を再実行する場合:

```sh
pnpm dsh plugin --profile web update kiokuko-dsh --latest
```

コマンドが正常終了するまで確認してください。`Already up to date` はビルド設定のエラーより前に表示される場合があり、その表示だけでは更新成功とは判断できません。

設定を編集するプロファイルと再実行するプロファイルを合わせてください。`DSH_HOME` を変更している場合はパスも合わせます。Harnessのチェックアウトで `pnpm approve-builds` を実行しても、対象はそのチェックアウトであり、プラグインのプロファイルではありません。`minimumReleaseAge` を変更しても、ビルドの承認エラーは解消しません。

既存のACPプロファイルへのインストールが `ERR_PNPM_UNEXPECTED_STORE` で失敗した場合は、現在のpnpmストアを使ってそのプロファイルの依存関係を再インストールしてから、プラグインの追加を再実行します。

```sh
pnpm --dir ~/.dsh/profiles/acp install --force --frozen-lockfile
pnpm dsh plugin --profile acp add github:askdkc/dsh-codex
```

最初のコマンドはロックファイルを変更せずに、プロファイルの `node_modules` を作り直します。失敗した場合は、そのエラーを解消してからプラグインの追加を再実行してください。`DSH_HOME` やプロファイル名を変更している場合は、両方のコマンドを合わせて変更します。ストア不一致の後に表示される `allowBuilds` の案内では、このエラーは解消しません。

Codex用のChatGPTアカウントでログインします。

```text
/codex-auth
```

ブラウザでログインを完了してください。localhostのコールバックがDSHへ届かない場合は、表示された指示に従ってリダイレクトURLまたは認証コードを貼り付けます。

プラグインを削除する場合:

```sh
pnpm dsh plugin --profile web remove codex-subscription-oauth-plugin
```

## ライセンス

MITライセンスです。詳細は [LICENSE](./LICENSE) を参照してください。

同梱している第三者コードの通知は [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) に記載しています。
