# dsh-codex

[English](./README.md) | 日本語

## 使い方

DeepSeek Harnessのチェックアウトからプラグインをインストールします。

```sh
pnpm dsh plugin --profile web add github:askdkc/dsh-codex
```

`web` は対象のプロファイル名に置き換え、インストール後にそのプロファイルを再起動してください。

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
