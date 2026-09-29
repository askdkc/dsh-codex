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
