# Serena MCP Quickstart (Codex CLI)

Serena は Model Context Protocol (MCP) のサーバーです。このプロジェクトの Codex CLI から接続して、チュートリアルを進めるための最小セットアップ手順をまとめました。

## 前提条件
- `uv`/`uvx` が使えること（Python 3.11+ 推奨）
- `git` が使えること
- Codex CLI が動作していること（このリポジトリは trusted プロジェクトに設定済み）

## Codex 設定（.codex/config.toml）
既に以下の Serena 設定が入っています（参考）。毎回 Git から取得するため、ネットワークが遅い環境では初回起動時にタイムアウトしやすい場合があります。

```toml
[mcp_servers.serena]
command = "uvx"
args = ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "codex"]
```

### タイムアウト対策（推奨）
Serena を事前インストールしておくと、Codex 起動時のハンドシェイクが安定します。

```
uv pip install "git+https://github.com/oraios/serena"
```

その上で設定を次のように変更します（`--from` を外す）：

```toml
[mcp_servers.serena]
command = "uvx"
args = ["serena", "start-mcp-server", "--context", "codex"]
```

### 環境変数（必要に応じて）
Serena が利用するモデル/外部サービスに応じて API キーを渡します。例：

```toml
[mcp_servers.serena]
command = "uvx"
args = ["serena", "start-mcp-server", "--context", "codex"]
# 例: OpenAI/Anthropic/Tavily など（実値に置き換えてください）
# env = { OPENAI_API_KEY = "...", ANTHROPIC_API_KEY = "...", TAVILY_API_KEY = "..." }
```

## 動作確認
1) Codex CLI/TUI を再起動します。
2) ステータスログに `aggregated … tools from … servers` と表示後、`serena` のエラーがないことを確認します。
   - `ERROR MCP client for \`serena\` failed to start: request timed out` が出る場合は、上記の「事前インストール」手順を実施してください。
3) ツールパレットから Serena のツールが見えることを確認します。

## 直接起動での切り分け（任意）
Codex を介さずに手元で起動確認できます：

```
# 事前インストールしている場合
uvx serena start-mcp-server --context codex

# 未インストール（その場取得）の場合
uvx --from git+https://github.com/oraios/serena \
  serena start-mcp-server --context codex
```

上記でサーバーが即時に立ち上がらない（依存の解決で待ちが発生する）環境では Codex からの接続がタイムアウトしやすくなります。

## チュートリアルの進め方（例）
- Codex に対して：
  - 「Serena チュートリアルを開始。前提と最初のステップを教えて」と問い合わせ
  - 「このリポジトリの README/コードを踏まえて最小のゴールを提案して」と依頼
- Serena のツールから：
  - チュートリアル用のコマンド/タスク（Serena 側のドキュメント記載）を順に実行

不明点や追加の環境変数が必要になった場合は、Serena の公式 README を参照の上で `.codex/config.toml` の `env` に追記してください。
