---
description: Pull Requestを5つの専門サブエージェントで並列レビューし、GitHub Review APIでバッチ投稿する
argument-hint: <owner/repo> <pr-number>
---

以下の引数からリポジトリとPR番号を取得してください:
$ARGUMENTS

上記の引数を `<owner/repo> <pr-number>` の形式でパースし、以下の手順でPRレビューを実施してください。

## 手順

### Step 1: PR情報の取得

1. `gh pr diff <pr-number> --repo <owner/repo>` でPRの差分を取得する
2. `gh pr view <pr-number> --repo <owner/repo>` でPRの概要・目的を把握する
3. `gh pr view <pr-number> --repo <owner/repo> --json headRefOid --jq .headRefOid` でHEADコミットSHAを取得する

### Step 2: サブエージェントの並列起動

Taskツールを使って以下の5つのサブエージェントを**並列**で起動する。
各Taskプロンプトには、取得したdiff全文とPR概要を**必ず含めて渡す**こと。

各サブエージェントは構造化JSON配列を返す。インラインコメントの投稿はサブエージェントでは行わない。

#### 1. code-quality-reviewer
`subagent_type: code-quality-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

#### 2. performance-reviewer
`subagent_type: performance-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

#### 3. test-coverage-reviewer
`subagent_type: test-coverage-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

#### 4. security-code-reviewer
`subagent_type: security-code-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

#### 5. documentation-accuracy-reviewer
`subagent_type: documentation-accuracy-reviewer`

プロンプトに含める内容:
- リポジトリ: `<owner/repo>`、PR番号: `<pr-number>`
- PR概要（gh pr viewの結果）
- diff全文（gh pr diffの結果）

### Step 3: 結果の集約とバッチ投稿

全サブエージェントの完了後、以下の手順で結果を集約しGitHub Review APIでバッチ投稿する。

#### 3-1. JSON結果の集約

各サブエージェントの出力からJSON配列を抽出し、全指摘事項を1つの配列にマージする。
同一ファイル・同一行への重複指摘がある場合は、より重要度の高いものを残す（must > imo > nits > q）。

#### 3-2. コメントbodyのフォーマット

各指摘の `body` を以下のフォーマットに変換する:

```
**{severity}.** [{category}] {指摘内容}
```

例: `**must.** [security] SQLインジェクションの危険性があります。プレースホルダを使用してください。`

#### 3-3. 指摘が0件の場合

Review API投稿をスキップし、`gh pr comment` で以下のコメントを投稿する:

```
## AI Code Review

全ての観点（コード品質・パフォーマンス・テストカバレッジ・セキュリティ・ドキュメント）でレビューを実施しましたが、特に指摘事項はありませんでした。
```

#### 3-4. 指摘がある場合: GitHub Review APIでバッチ投稿

Bashツールで以下のコマンドを実行し、1回のAPIコールで全コメントをバッチ投稿する。

`comments` 配列の各要素は `{"path": "ファイルパス", "line": 行番号, "body": "フォーマット済みbody"}` の形式にする。

```bash
jq -n \
  --arg commit_id "$HEAD_SHA" \
  --arg body "## AI Code Review Summary

各観点でのレビュー結果をインラインコメントとして投稿しました。

| カテゴリ | 指摘数 |
|---|---|
| code-quality | N件 |
| performance | N件 |
| test-coverage | N件 |
| security | N件 |
| documentation | N件 |

重要度: **must** = 必須修正, **imo** = 推奨, **nits** = 軽微, **q** = 質問" \
  --arg event "COMMENT" \
  --argjson comments "$COMMENTS_JSON" \
  '{commit_id: $commit_id, body: $body, event: $event, comments: $comments}' \
| gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "repos/<owner>/<repo>/pulls/<pr-number>/reviews" \
  --input -
```

**注意:** `<owner>/<repo>` と `<pr-number>` は実際の値に置換すること。`$HEAD_SHA` はStep 1で取得したコミットSHA。`$COMMENTS_JSON` は集約・フォーマット済みのコメントJSON配列。
