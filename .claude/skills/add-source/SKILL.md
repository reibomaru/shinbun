---
name: add-source
description: >
  fetchソース（RSS/GitHub/Hacker News等）を backend/config/sources.yaml に追加するスキル。
  ユーザーがURLを貼ったときに、適切なfetch方法を自動判別してソース設定を生成・追加する。
  「このサイトをソースに追加して」「このRSSを登録して」「このGitHubリポジトリをウォッチしたい」
  「この記事のサイトをfetchソースにして」「ソースを追加」「source追加」など、
  情報収集ソースの登録・追加に関するリクエストで必ずこのスキルを使うこと。
  URLが貼られて「追加して」「登録して」「ウォッチして」と言われたときもトリガーする。
---

# Add Source Skill

ユーザーが貼ったURLから適切なfetch方法を判別し、`backend/config/sources.yaml` にソースを追加する。

---

## ソースタイプ判別ルール

URLパターンから以下の順で判別する。

### 1. GitHub リポジトリ (`github_repo`)

**判定**: `github.com/{owner}/{repo}` にマッチするURL

```yaml
- type: github_repo
  name: "{repo名の人間向け表記}"
  config:
    owner: "{owner}"
    repo: "{repo}"
  polling_interval: 3600
```

リリースページ (`/releases`) やタグページ (`/tags`) のURLでも、owner/repo を抽出して同じ形式にする。

### 2. 明示的なRSS/AtomフィードURL (`rss`)

**判定**: URLのパスが以下のいずれかで終わる場合
- `/rss`, `/rss.xml`, `/feed`, `/feed.xml`, `/atom`, `/atom.xml`, `/index.xml`
- Content-Type が `application/rss+xml` や `application/atom+xml`

```yaml
- type: rss
  name: "{サイト名やフィードの説明}"
  config:
    url: "{フィードURL}"
  polling_interval: 3600
```

### 3. 一般的なWebサイト → RSSディスカバリー (`rss`)

**判定**: 上記に該当しない一般的なWebサイトURL

WebFetch を使ってページのHTMLを取得し、以下を **agenticに探索** してRSSフィードURLを発見する:

1. **HTMLの `<link>` タグ**: `rel="alternate"` で `type="application/rss+xml"` または `type="application/atom+xml"`
2. **ページ内リンク**: RSS/Atomアイコン、「RSS」テキスト、フィードへのリンク
3. **よくあるパス**: `/rss.xml`, `/feed`, `/feed.xml`, `/atom.xml`, `/index.xml` へのリンク
4. **フッターやサイドバー**: 購読リンク、RSSアイコン

見つかったフィードURLが相対パスの場合は、元のURLのオリジンと結合して絶対URLにする。

**フィードが見つかった場合**: そのURLで `rss` タイプとして登録する。

**フィードが見つからなかった場合**: 以下を試す。
- よくあるパス (`/rss.xml`, `/feed`, `/feed.xml`, `/atom.xml`) に直接 WebFetch してフィードが存在するか確認する
- それでも見つからなければ、ユーザーにRSSフィードが見つからなかった旨を伝え、手動でフィードURLを教えてもらう

### 4. Hacker News (`hackernews`)

**判定**: `news.ycombinator.com` ドメインのURL

Hacker Newsは通常、初期設定で入っているため追加の必要はない。ユーザーに確認する。

```yaml
- type: hackernews
  name: Hacker News
  config:
    mode: top
    min_score: 10
  polling_interval: 1800
```

---

## 手順

### Step 1: URL解析とソースタイプ判別

ユーザーが貼ったURLを上記のルールで判別する。

### Step 2: RSSディスカバリー（必要な場合）

一般的なWebサイトの場合、WebFetch でページを取得してRSSフィードを探す。

```
WebFetch(url, "このページからRSSフィードのURLを探してください。
1. <link rel='alternate' type='application/rss+xml'> や type='application/atom+xml' タグ
2. ページ内のRSS/Atomフィードへのリンク（テキスト、アイコン）
3. /feed, /rss, /rss.xml, /atom.xml, /index.xml へのリンク
見つかったフィードURLをすべてリストアップしてください。見つからない場合は「見つかりませんでした」と回答してください。")
```

### Step 3: 既存ソースとの重複チェック

`backend/config/sources.yaml` を読み込み、同じURLやリポジトリが既に登録されていないか確認する。
重複がある場合はユーザーに通知して、追加をスキップする。

### Step 4: ソース名の決定

- GitHub: リポジトリ名をそのまま使う（例: `Next.js`, `Claude Code`）
- RSS: サイト名やフィードのタイトルを使う。WebFetchで取得したページタイトルを参考にする
- ユーザーが名前を指定した場合はそれを優先する

### Step 5: sources.yaml への追加

`backend/config/sources.yaml` の `sources:` 配列の末尾に新しいソースを追加する。
Edit ツールを使って既存のファイルに追記する。

### Step 6: 追加結果の報告

追加したソースの内容をユーザーに報告する:
- ソースタイプ
- ソース名
- 設定内容（URL、owner/repo等）
- polling_interval

---

## polling_interval の目安

| ソースタイプ | デフォルト | 備考 |
|---|---|---|
| `github_repo` | 3600 (1時間) | リリース頻度は低いため |
| `rss` | 3600 (1時間) | 一般的なブログ・ニュースサイト |
| `hackernews` | 1800 (30分) | 更新頻度が高い |

ユーザーが頻度を指定した場合はそれに従う。

---

## 複数URL対応

ユーザーが複数のURLを一度に貼った場合、それぞれについて上記の手順を実行する。
RSSディスカバリーなど独立した処理は並列で行い、効率化する。
