# Web セッションでの GitHub CLI 認証

Web セッション（`CLAUDE_CODE_REMOTE=true`）では、`gh` コマンドを PAT（Personal Access Token）で認証して使用すること。

## 前提

- セッション開始時に `.claude/hooks/session-start.sh` が `GITHUB_TOKEN` シークレットを使って `gh auth login --with-token` を自動実行する
- `GITHUB_TOKEN` は Claude Code on the web のプロジェクト設定でシークレットとして登録する
- 必要なスコープ: `repo`, `read:org`（classic token）または同等の権限（fine-grained token）

## ルール

- Web セッションで `gh` コマンドを使う際は、PAT による認証済み状態であることを前提とする
- `GITHUB_TOKEN` が未設定で認証できていない場合、PR 作成・Issue 操作などの GitHub API を利用する操作は実行しないこと
- ローカル環境（`CLAUDE_CODE_REMOTE` が `true` でない場合）ではこのルールは適用されない
