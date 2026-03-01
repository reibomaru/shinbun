---
description: Pull Requestを5つの専門サブエージェントで並列レビューし、インラインコメントを投稿する
argument-hint: <owner/repo> <pr-number>
---

以下の引数からリポジトリとPR番号を取得してください:
$ARGUMENTS

上記の引数を `<owner/repo> <pr-number>` の形式でパースし、以下の手順でPRレビューを実施してください。

## 手順

1. `gh pr diff <owner/repo> <pr-number>` でPRの差分を取得する
2. `gh pr view <owner/repo> <pr-number>` でPRの概要・目的を把握する
3. Taskツールを使って以下の5つのサブエージェントを**並列**で起動する
   - 各Taskプロンプトには、取得したdiff全文とPR概要を**必ず含めて渡す**こと

---

## 起動するサブエージェント

以下のエージェントをTaskツールで並列起動してください。各プロンプトにはdiff全文を含めること。

### 1. code-quality-reviewer
`subagent_type: code-quality-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

### 2. performance-reviewer
`subagent_type: performance-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

### 3. test-coverage-reviewer
`subagent_type: test-coverage-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

### 4. security-code-reviewer
`subagent_type: security-code-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

### 5. documentation-accuracy-reviewer
`subagent_type: documentation-accuracy-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

---

## 完了後

全サブエージェントの完了後、`gh pr comment` でPR全体へのサマリーコメントを投稿してください:
- 発見された重要な問題の概要
- 各カテゴリ（品質・パフォーマンス・テスト・セキュリティ・ドキュメント）の評価
- 全体的な所感
