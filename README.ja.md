# dsh-codex

[English](./README.md) | 日本語

## 使い方

DeepSeek Harnessのチェックアウトからプラグインをインストールします。

```sh
pnpm dsh plugin --profile web add '@askdkc/dsh-codex@github:askdkc/dsh-codex' --config.minimumReleaseAge=0 --ignore-scripts
```

`web` は対象のプロファイル名に置き換え、インストール後にそのプロファイルを再起動してください。

`--config.minimumReleaseAge=0` は、このコマンドでパッケージ公開後の最低待機時間を無効にし、24時間待機が設定されていても待たずに取得します。`--ignore-scripts` は、この操作でインストールスクリプトを実行しません。このプラグインはビルド済みの `lib` を同梱しているため、インストール時のビルドは不要です。両方の指定は `dsh plugin` より後ろに置き、プロファイル側のpnpmに渡してください。グローバル設定は変更しません。

GitHubから導入済みの場合、最新コミットへの更新は次のコマンドです。

```sh
pnpm dsh plugin --profile web update @askdkc/dsh-codex --latest --config.minimumReleaseAge=0 --ignore-scripts
```

既存の依存関係をタグやコミットに固定している場合は、上の `add` コマンドを再実行して既定ブランチへ切り替えます。正常終了後にDSHを再起動してください。別のプラグインを更新しても、dsh-codexは更新されません。

ACPで使う場合は、ACP用プロファイルにもインストールします。

```sh
pnpm dsh plugin --profile acp add '@askdkc/dsh-codex@github:askdkc/dsh-codex' --config.minimumReleaseAge=0 --ignore-scripts
```

プラグインはプロファイルごとに読み込まれるため、`web` に導入しただけでは `acp` にモデルは追加されません。ACPクライアントが起動するDSHプロセスを再起動し、モデル選択を開き直してください。別のプロファイルを使っている場合は、`acp` をその名前に置き換えます。

このプラグインはビルド済みの `lib` を配布しており、インストール時のビルドスクリプトは不要です。インストールや更新が `ERR_PNPM_IGNORED_BUILDS` で失敗し、`codex-subscription-oauth-plugin` が表示された場合は、対象プロファイルの `pnpm-workspace.yaml`（標準では `~/.dsh/profiles/web/pnpm-workspace.yaml`）を編集します。既存の `allowBuilds` 内で、このパッケージのビルドスクリプトを実行しないよう明示してください。

```yaml
allowBuilds:
  codex-subscription-oauth-plugin: false
```

既に `codex-subscription-oauth-plugin: true` があれば `false` に変更します。`allowBuilds` のキーが `codex-subscription-oauth-plugin@` で始まる他の項目は、リポジトリURL、コミットURL、生成された `set this to true or false` のプレースホルダーも含めて削除してください。このパッケージの項目は名前だけの `false` 一つにし、他のパッケージの設定は保持します。再実行する前に、プロファイルの設定ファイルを保存してください。

名前だけの `true` と異なり、名前だけの `false` はGit依存関係にも適用されます。pnpmにスクリプトを実行しない判断を明示するため、更新のたびにコミットハッシュを書き換える必要はありません。この復旧手順はpnpm 11.7.0で動作し、pnpmの更新は不要です。詳しくはpnpmの [Git依存関係のビルド設定](https://pnpm.io/settings/build#allowbuilds) を参照してください。

その後、DeepSeek Harnessのチェックアウトから、失敗した `pnpm dsh plugin ...` コマンドを再実行します。別のプラグインを更新する場合も、このプロファイルの依存関係が確認されます。例えば、失敗したdsh-codexの更新を再実行する場合:

```sh
pnpm dsh plugin --profile web update @askdkc/dsh-codex --latest --config.minimumReleaseAge=0 --ignore-scripts
```

コマンドが正常終了するまで確認してください。`Already up to date` はビルド設定のエラーより前に表示される場合があり、その表示だけでは更新成功とは判断できません。

設定を編集するプロファイルと再実行するプロファイルを合わせてください。`DSH_HOME` を変更している場合はパスも合わせます。Harnessのチェックアウトで `pnpm approve-builds` を実行しても、対象はそのチェックアウトであり、プラグインのプロファイルではありません。`minimumReleaseAge` を変更しても、ビルドの承認エラーは解消しません。

既存のACPプロファイルへのインストールが `ERR_PNPM_UNEXPECTED_STORE` で失敗した場合は、現在のpnpmストアを使ってそのプロファイルの依存関係を再インストールしてから、プラグインの追加を再実行します。

```sh
pnpm --dir ~/.dsh/profiles/acp install --force --frozen-lockfile --config.minimumReleaseAge=0 --ignore-scripts
pnpm dsh plugin --profile acp add '@askdkc/dsh-codex@github:askdkc/dsh-codex' --config.minimumReleaseAge=0 --ignore-scripts
```

最初のコマンドはロックファイルを変更せずに、プロファイルの `node_modules` を作り直します。失敗した場合は、そのエラーを解消してからプラグインの追加を再実行してください。`DSH_HOME` やプロファイル名を変更している場合は、両方のコマンドを合わせて変更します。ストア不一致の後に表示される `allowBuilds` の案内では、このエラーは解消しません。

Codex用のChatGPTアカウントでログインします。

```text
/codex-auth
```

ブラウザでログインを完了してください。localhostのコールバックがDSHへ届かない場合は、表示された指示に従ってリダイレクトURLまたは認証コードを貼り付けます。

プラグインを削除する場合:

```sh
pnpm dsh plugin --profile web remove @askdkc/dsh-codex
```

## モデルと接続診断

プラグインはpi-ai 1.5.0のCodexカタログを同梱しているため、認証済みCodexエンドポイントが表示対象として返すモデルには、手書きのモデル表なしで実行に必要なメタデータが揃います。対象はGPT-5.6 Luna・Sol・Terra、GPT-6 Astra・Luna・Sol、GPT-6.1 Sol・Terraです。アカウントごとの表示可否と順序は認証済みカタログ（`https://chatgpt.com/backend-api/codex/models`）が決め、表示できないモデルは追加されません。

GPT-6.1 SolとTerraは、Codex既定の500,000トークンのコンテキスト、128,000トークンの出力上限、テキスト・画像入力、カタログに記録されたreasoningレベルを使います。価格はOpenAI APIのモデルページに基づきます。ライブ一覧にあっても同梱カタログで実行できない未知のモデルには `MODEL_METADATA_MISSING` を出して非表示にし、他モデルの能力を推測して流用しません。

接続失敗には、SDKの開始前・開始後の段階、SSE切替の有無と安全なエラーコードを残します。診断には生のclose理由・stack・header・本文を含めません。最初の応答イベントより前ではSDKがSSEに切り替えることがありますが、プラグインは再試行を追加せず、途中の応答やツール出力を再送しません。キャンセルを維持し、SSEのHTTPエラーではホストが分類できるようstatusを保持します。

## ライセンス

MITライセンスです。詳細は [LICENSE](./LICENSE) を参照してください。

同梱している第三者コードの通知は [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) に記載しています。
