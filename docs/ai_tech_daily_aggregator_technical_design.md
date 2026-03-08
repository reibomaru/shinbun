# 技術設計書: AI / Web開発 Daily 情報アグリゲータ

対応仕様書: `ai_tech_daily_aggregator_prd_v_2.md`

---

## 1. 技術スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| フロントエンド | Next.js (App Router) | SSR対応、React Server Components |
| UIライブラリ | shadcn/ui + Tailwind CSS | 高速開発、カスタマイズ性 |
| ORM | Prisma | 型安全なDBアクセス、マイグレーション管理 |
| バリデーション | Zod | 設定ファイルのスキーマ検証 |
| バッチ/スケジュール | GitHub Actions | 無料枠あり、APIキーをSecretで安全管理 |
| バッチ実行 | tsx | TypeScriptスクリプトを直接実行 |
| DB | Supabase (PostgreSQL) | pgvector対応、無料枠で個人利用可 |
| ベクトル検索 | pgvector (Supabase) | 別サービス不要（Phase 2〜） |
| LLM | Google Gemini API | 無料枠あり、日本語対応 |
| 埋め込み | Voyage AI or OpenAI | 高品質ベクトル（Phase 2〜） |
| ホスティング | Vercel | Next.jsとの親和性、無料枠あり |
| 通知 | Slack Incoming Webhook | シンプル、Bolt SDK不要 |
| 監視 | Sentry（無料枠） | エラー追跡 |
| テスト | Vitest | 高速、ESM対応 |

> 個人利用のためInngest/BullMQのような外部キューは不要。
> バッチ処理は GitHub Actions で実行（ローカルでは `tsx` により手動実行も可）。Gemini API キーは GitHub Secrets で管理する。
> Next.js（Vercel）はWeb UIの配信のみを担う。
> DB アクセスには Prisma ORM を使用し、`DATABASE_URL` 環境変数で接続する。

---

## 2. テーブル設計

個人利用のため`user_id`による分離は不要。全データはシングルテナント。

### 2.1 テーブル一覧

#### source
情報源の設定と取得状態を管理する。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| type | ENUM | `github_repo / rss / youtube_channel / changelog / hackernews / reddit / arxiv` |
| name | TEXT | 表示名 |
| config | JSONB | ソース固有の設定（URL、owner/repo等） |
| polling_interval | INTEGER | ポーリング間隔（秒） |
| enabled | BOOLEAN | 有効/無効 |
| last_fetched_at | TIMESTAMP | 最終取得日時 |
| last_error | TEXT | 最終エラーメッセージ |
| error_count | INTEGER | 連続エラー回数 |
| created_at | TIMESTAMP | 作成日時 |

#### raw_event
外部ソースから取得した生データ。30日保持後削除。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| source_id | UUID | FK → source |
| external_id | TEXT | 外部サービス側のID（重複検知用） |
| payload | JSONB | 生データ（API レスポンス全体。メタデータは含まない） |
| content_hash | TEXT | SHA-256（重複排除用） |
| fetched_at | TIMESTAMP | 取得日時 |
| processed | BOOLEAN | LLM処理済みフラグ |
| retry_count | INTEGER | LLM処理リトライ回数（デフォルト: 0） |
| last_error | TEXT | 最後に発生したエラーメッセージ（NULL可） |
| title | TEXT | 記事タイトル（NULL可） |
| url | TEXT | 原文URL（NULL可） |
| url_normalized | TEXT | 正規化済みURL（NULL可） |
| published_at | TIMESTAMP | 公開日時（NULL可） |
| content | TEXT | 記事本文テキスト（@extractus/article-extractor で抽出、最大10,000文字、NULL可） |

#### item
処理済みの記事データ。無期限保持。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| raw_event_id | UUID | FK → raw_event |
| item_type | TEXT | `release / article / video / paper / changelog` 等 |
| title | TEXT | タイトル |
| url | TEXT | 原文URL |
| url_normalized | TEXT | 正規化済みURL（重複検知用） |
| published_at | TIMESTAMP | 公開日時 |
| language | TEXT | 原文言語 (`en / ja`) |
| summary_short | TEXT | 短い要約（1-2行） |
| summary_medium | TEXT | 中程度の要約（3-5行） |
| key_points | JSONB | キーポイント（3つ） |
| why_it_matters | TEXT | 重要性理由（1行） |
| importance_score | FLOAT | 重要度スコア（0-100） |
| importance_reason | TEXT | スコア算出理由 |
| is_urgent | BOOLEAN | 緊急アラート対象か |
| status | ENUM | `pending / processed / llm_error` |
| llm_model_used | TEXT | 処理に使用したモデル名 |
| llm_cost | FLOAT | 処理コスト（USD） |
| created_at | TIMESTAMP | 作成日時 |

#### item_label
記事のカテゴリ・フォーマット・難易度ラベル。

| カラム | 型 | 説明 |
|---|---|---|
| item_id | UUID | FK → item |
| label_type | TEXT | `topic / format / difficulty` 等 |
| label_value | TEXT | ラベル値 |

#### entity
ライブラリ・モデル・企業等のエンティティ定義。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| entity_type | TEXT | `library / model / company / repo` 等 |
| name | TEXT | 正式名称 |
| aliases | JSONB | 別名リスト（例: `["GPT-4", "gpt4"]`） |
| official_url | TEXT | 公式URL |

#### item_entity
記事とエンティティの関連。

| カラム | 型 | 説明 |
|---|---|---|
| item_id | UUID | FK → item |
| entity_id | UUID | FK → entity |
| role | TEXT | 関連の種類（`subject / mentioned`） |
| confidence | FLOAT | 確信度（0-1） |

#### watchlist
ウォッチリスト登録データ。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| target_type | ENUM | `entity / keyword` |
| target_value | TEXT | エンティティIDまたはキーワード文字列 |
| notify_realtime | BOOLEAN | 緊急通知するか |
| score_boost | FLOAT | スコアブースト倍率（デフォルト: 1.2） |

#### saved_item
保存済み記事。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| item_id | UUID | FK → item |
| tags | JSONB | タグリスト（例: `["llm", "api"]`） |
| saved_at | TIMESTAMP | 保存日時 |

#### read_status
既読状態。90日保持後削除。

| カラム | 型 | 説明 |
|---|---|---|
| item_id | UUID | FK → item（PK） |
| read_at | TIMESTAMP | 閲覧日時 |

#### feedback
フィードバック記録。無期限保持。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| item_id | UUID | FK → item |
| feedback_type | ENUM | `helpful / not_helpful` |
| created_at | TIMESTAMP | 作成日時 |

#### daily_snapshot
日次ダッシュボードのスナップショット。アーカイブ（バックナンバー）として使用。

| カラム | 型 | 説明 |
|---|---|---|
| id | TEXT (CUID) | PK |
| date | TEXT | スナップショット日付（`YYYY-MM-DD`、JST基準）。UNIQUE |
| article_count | INTEGER | スナップショット時の記事件数 |
| top_title | TEXT | 最重要記事のタイトル |
| created_at | TIMESTAMP | 作成日時 |

#### daily_snapshot_item
スナップショットとアイテムの中間テーブル。

| カラム | 型 | 説明 |
|---|---|---|
| id | TEXT (CUID) | PK |
| snapshot_id | TEXT | FK → daily_snapshot |
| item_id | UUID | FK → item |

UNIQUE制約: `(snapshot_id, item_id)`

> **設計方針:** アーカイブは `item.status` を変更せず、`daily_snapshot` + `daily_snapshot_item` によるスナップショット方式で実現する。`item.status` は `processed` のまま維持されるため、アーカイブ後もダッシュボードに記事が表示され続ける。スナップショットはその日に作成された `processed` アイテムのみを対象とする。

#### embedding
ベクトル埋め込み（Phase 2〜）。90日保持後削除。

| カラム | 型 | 説明 |
|---|---|---|
| item_id | UUID | FK → item |
| vector | VECTOR(1536) | 埋め込みベクトル |
| embedding_model | TEXT | 使用モデル名 |

---

### 2.2 ER図（概略）

```
source ──< raw_event ──< item >──< item_label
                          │
                          ├──< item_entity >── entity
                          ├──< saved_item
                          ├──  read_status
                          ├──< feedback
                          ├──  embedding
                          └──< daily_snapshot_item >── daily_snapshot

watchlist（独立テーブル。entity.idまたはキーワードを参照）
```

---

### 2.3 データ保持ポリシー

| テーブル | 保持期間 | 削除タイミング |
|---|---|---|
| raw_event | 30日 | 週次クリーンアップジョブ |
| item | 無期限 | — |
| item_label | 無期限（itemに追従） | — |
| item_entity | 無期限（itemに追従） | — |
| embedding | 90日 | 週次クリーンアップジョブ |
| read_status | 90日 | 週次クリーンアップジョブ |
| feedback | 無期限 | — |
| saved_item | 無期限 | — |

---

## 3. 設定管理

すべての設定は `backend/config/` 配下の YAML ファイルで管理する。管理画面は提供しない。
秘匿情報（APIキー等）のみ環境変数（ローカル: `.env` / CI: GitHub Secrets）で管理する。

### 3.1 環境変数

秘匿情報のみ。設定値は YAML で管理するため環境変数には含めない。

**ローカル開発（`.env`）/ GitHub Secrets（本番）共通:**

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
GITHUB_TOKEN=ghp_xxx              # GitHub API レートリミット緩和用（任意）
GEMINI_API_KEY=xxx                # Gemini API（分類・要約処理）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx  # 通知用
```

> Prisma は `DATABASE_URL` で Supabase PostgreSQL に接続する。`SUPABASE_URL` / `SUPABASE_SERVICE_KEY` は使用しない。

### 3.2 `backend/config/settings.yaml` — 配信設定

```yaml
digest:
  time: "08:00"         # 配信時刻（JST）
  timezone: Asia/Tokyo
  top_count: 5          # Top件数
  total_count: 20       # 全体件数

cost_alert:
  daily_usd: 5          # 日次コストアラート閾値
```

### 3.3 `backend/config/sources.yaml` — 情報源設定

```yaml
sources:
  - type: github_repo
    name: Claude Code
    config:
      owner: anthropics
      repo: claude-code
    polling_interval: 3600

  - type: github_repo
    name: Next.js
    config:
      owner: vercel
      repo: next.js
    polling_interval: 3600

  - type: rss
    name: Zenn トレンド
    config:
      url: https://zenn.dev/feed
    polling_interval: 3600

  - type: rss
    name: はてなブックマーク IT
    config:
      url: https://b.hatena.ne.jp/hotentry/it.rss
    polling_interval: 3600

  - type: hackernews
    name: Hacker News
    config:
      mode: top
      min_score: 10
    polling_interval: 1800
```

> 設定ファイルは Zod スキーマで読み込み時にバリデーションされる（`backend/lib/config.ts`）。

### 3.4 `backend/config/watchlist.yaml` — ウォッチリスト

```yaml
entities:
  - name: Anthropic
    notify_realtime: true
    score_boost: 1.3

  - name: Next.js
    notify_realtime: true
    score_boost: 1.2

  - name: LangChain
    notify_realtime: false
    score_boost: 1.2

keywords:
  - value: "RAG"
    notify_realtime: false
    score_boost: 1.2

  - value: "MCP"
    notify_realtime: false
    score_boost: 1.2
```

---

## 4. LLM処理パイプライン

### 4.1 処理ステージ概要

```
情報取得（実装済み: github.ts / rss.ts / hackernews.ts）
  ↓
[Stage 1] ルールベースフィルタ（コスト: $0）（実装済み: fetch.ts の deduplicateEvents）
  - content_hash（SHA-256）による完全重複排除
  - externalId（ソース×外部ID ユニーク制約）による重複排除
  - ソースごとの最低品質フィルタ（例: HN score > min_score）
  ↓
[Stage 1.5] 記事本文抽出（@extractus/article-extractor）
  - 記事URLから本文を自動抽出（タイムアウト10秒、並列度5）
  - HTMLタグを除去してプレーンテキスト化（最大10,000文字）
  - raw_event.content に保存（失敗時は null、Stage 3 では従来通りタイトル+URLで要約）
  ↓
[Stage 2] 軽量LLM分類（Gemini Flash Lite）
  - 関連度判定（AI/Web開発に関係あるか）
  - topic / format ラベル付け
  - 緊急度判定（セキュリティ / Breaking Change）
  ↓ 関連ありのみ通過
  ├── is_urgent=true → 即時 Slack 緊急アラート
  ↓
[Stage 3] 高品質LLM処理（Gemini Flash）※上位100件のみ
  - 日本語要約生成（short / medium / key_points / why_it_matters）
  - エンティティ抽出
  - 重要度スコアリング
  ↓
[Stage 4] 埋め込み生成（Phase 2〜）
  - 意味的重複排除（cosine similarity > 0.92 → マージ）
  - 関連アイテム紐付け
```

### 4.2 モデル使い分けとコスト

| ステージ | モデル | 用途 | 想定コスト/件 |
|---|---|---|---|
| Stage 2 | Gemini 2.5 Flash Lite | 分類・フィルタ | $0（無料枠） |
| Stage 3 | Gemini 2.5 Flash | 要約・スコアリング | $0（無料枠） |
| Stage 4 | Voyage AI / OpenAI | 埋め込み生成 | ~$0.0001 |

> Gemini API は無料枠（30 RPM）で運用する。無料枠を超過した場合は従量課金（Flash Lite: $0.075/MTok入力、Flash: $0.15/MTok入力）が発生する。

### 4.3 コスト試算（月額）

| 項目 | 想定件数/日 | 通過率 | 処理件数/日 | 単価 | 月額 |
|---|---|---|---|---|---|
| Stage 1 通過 | 500 | 80% | 400 | — | $0 |
| Stage 2 Flash Lite | 400 | 50% | 400 | $0（無料枠） | $0 |
| Stage 3 Flash | — | — | 100（上位のみ） | $0（無料枠） | $0 |
| Stage 4 埋め込み | — | — | Phase 2以降 | — | — |
| **合計** | | | | | **$0** |

### 4.4 コスト管理ロジック

- `item.llm_cost` に処理コストを記録
- 日次コスト合計が `LLM_DAILY_COST_ALERT_USD`（デフォルト $5）を超えたら Slack に通知
- 月次予算超過時は Stage 3 を Flash Lite にフォールバック

### 4.5 要約生成仕様

| フィールド | 内容 |
|---|---|
| `summary_short` | 1〜2行。カード表示に使用 |
| `summary_medium` | 3〜5行。詳細画面に使用 |
| `key_points` | 箇条書き3項目。詳細画面に使用 |
| `why_it_matters` | 1行。重要性の理由。詳細画面に使用 |

英語記事は日本語で要約を生成する。

### 4.6 ラベル定義

| label_type | 取り得る値 |
|---|---|
| topic | `genai / frontend / backend / devtools / infra / security` 等（LLM出力のため動的に拡張可能） |
| format | `release / tutorial / benchmark / incident / paper / announcement` 等（LLM出力のため動的に拡張可能） |
| difficulty | `beginner / intermediate / advanced` |

### 4.7 エンティティ抽出

- 抽出対象: ライブラリ名、モデル名、会社名、リポジトリ名
- `entity.aliases` とマッチングして既存エンティティに紐付ける
- 未登録エンティティは新規作成する

### 4.8 重要度スコアリングアルゴリズム（0-100）

#### ベーススコア（重み付き合計）

| 要素 | 重み | スコア算出 |
|---|---|---|
| ソース信頼度 | 30% | 公式1.0 / GitHub0.8 / 大手ブログ0.6 / 個人ブログ0.4 / SNS0.2 |
| 鮮度 | 20% | 24h以内1.0 / 48h0.7 / 1週間0.3 |
| エンゲージメント | 20% | スター数・HNスコア・はてブ数を正規化（0-1） |
| コンテンツ品質 | 30% | LLMが独自性・深さ・実用性を0-1で評価 |

#### スコア補正

| 条件 | 補正 |
|---|---|
| ウォッチリスト対象 | × `score_boost`（デフォルト1.2） |
| セキュリティ関連 | +15pt |
| Breaking Change | +10pt |
| フィードバック反映（Phase 2〜） | helpful率が高いソース/トピックにブースト |

---

## 5. 重複排除仕様

### 5.1 多段重複排除

| レイヤー | 手法 | 実行ステージ | 実装状況 |
|---|---|---|---|
| 完全一致 | `content_hash`（SHA-256） | Stage 1 | 実装済み（`deduplicateEvents`） |
| 外部ID一致 | `sourceId + externalId` ユニーク制約 | Stage 1 | 実装済み（DB制約 + `deduplicateEvents`） |
| URL一致 | `url_normalized`（クエリパラメータ除去・www統一・末尾スラッシュ統一） | Stage 1 | URL正規化ロジック実装済み（`url.ts`）。DB照合は未実装 |
| タイトル類似 | タイトル正規化 + Levenshtein距離 < 0.2 | Stage 2 | 未実装 |
| 意味的重複 | embedding cosine similarity > 0.92 | Stage 4（Phase 2〜） | 未実装 |

### 5.2 マージ処理

意味的に重複するアイテムが検出された場合:
- より信頼度の高いソースを「プライマリ」とする
- 他ソースの情報は `item_entity` の関連ソースとして紐付ける
- 複数ソースで言及されている事実はスコアをブースト

---

## 6. インフラ構成

### 6.1 全体アーキテクチャ図

```
┌──────────────────────────────────────────────┐
│              External Sources                 │
│  GitHub API      RSS Feeds      HN API       │
│  (実装済み)      (実装済み)     (実装済み)    │
└────────┬──────────────┬──────────┬───────────┘
         └──────────────┴──────────┘
                        │
          ┌─────────────▼──────────────────────────┐
          │  バッチ処理（backend/scripts/fetch.ts） │
          │                                         │
          │  GitHub Actions (cron) で自動実行          │
          │  ローカルでは tsx により手動実行も可       │
          │                                         │
          │  Prisma ORM 経由で DB アクセス           │
          └──────┬──────────────────────┬───────────┘
                 │                      │
     ┌───────────▼──┐        ┌──────────▼─────────┐
     │   Supabase   │        │   Google Gemini    │
     │  PostgreSQL  │        │   API（実装済み）    │
     │  + pgvector  │        │   Flash Lite(分類) │
     └──────┬───────┘        │   Flash(要約)      │
            │                └────────────────────┘
    ┌────────┴──────────┐
    │                   │
┌───▼──────────┐  ┌─────▼────────────┐
│ Next.js UI   │  │  Slack Webhook   │
│ (mock/)      │  │  （実装済み）     │
│ モックデータ  │  │  - Daily Digest  │
│ DB未接続     │  │  - 緊急アラート  │
└──────────────┘  └──────────────────┘

  ※ 実装済み: データ取得 → 重複排除 → raw_event保存 → LLM分類 → LLM要約 → Slack緊急アラート
  ※ フロントエンドはモックデータで動作。DB連携は未実装。
```

### 6.2 GitHub Actions ワークフロー

#### 実装済みワークフロー

| ワークフローファイル | トリガー | 処理内容 |
|---|---|---|
| `test.yml` | push/PR to main | `npm test`（Vitest）によるユニットテスト |
| `claude.yml` | Issue/PRコメント（`@claude`） | Claude Code によるインタラクティブアシスタンス |
| `claude-code-review.yml` | PR opened | 設計書との整合性を自動レビュー |

#### バッチワークフロー

| ワークフローファイル | スケジュール（cron式） | 処理内容 | 状態 |
|---|---|---|---|
| `fetch.yml` | `*/30 * * * *`（30分毎） | 全ソース（HN含む）新着取得 → Stage 1-3処理 | 実装済み |
| `digest.yml` | `0 23 * * *`（UTC 23:00 = JST 08:00） | 重要度順に整形 → Slack配信 | 未実装 |
| `cleanup.yml` | `0 0 * * 0`（毎週日曜） | raw_event 30日超・read_status 90日超を削除 | 未実装 |

> バッチ処理はローカルでは `npm run fetch` で手動実行、GitHub Actions で自動実行。

#### GitHub Secrets 設定

| Secret名 | 用途 |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL 接続文字列（Prisma用） |
| `GEMINI_API_KEY` | Gemini API 呼び出し（Flash Lite / Flash） |
| `SLACK_WEBHOOK_URL` | Slack 通知送信先 |

#### ワークフロー定義例（実装済み: test.yml）

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
```

#### ワークフロー定義（実装済み: fetch.yml）

```yaml
# .github/workflows/fetch.yml
name: Fetch (All Sources)

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  fetch:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    concurrency:
      group: fetch
      cancel-in-progress: false
    permissions:
      contents: read

    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx prisma generate --schema backend/migration/schema.prisma
      - run: npx tsx backend/scripts/fetch.ts
```

#### GitHub Actions 実行時間の見積もり（バッチワークフロー実装後）

| ジョブ | 頻度 | 1回あたり | 月間合計 |
|---|---|---|---|
| fetch（30分毎） | 48回/日 | ~5分 | 7,200分 |
| digest | 1回/日 | ~3分 | 90分 |
| cleanup | 4回/月 | ~2分 | 8分 |
| **合計** | | | **~7,298分** |

> GitHub Free（プライベートリポジトリ）の無料枠は500分/月のため超過する。
> **GitHub Pro（$4/月）で3,000分**が付与されるが、それでも不足する場合はfetch頻度を下げる（2時間に1回等）か、リポジトリをパブリックにする（**Actions は無料**）ことで対応可能。
> パブリックの場合は Secrets が漏洩しないよう環境変数の管理を徹底する。

### 6.3 データフロー詳細

#### 実装済みフロー（backend/scripts/fetch.ts + backend/lib/usecases/）

```
  backend/config/sources.yaml（設定ファイル・Zodバリデーション）
      │
      ▼
  source テーブルと同期（upsert: type+name ユニーク制約）
      │
      ▼
  各ソースを並列フェッチ（Promise.allSettled）──────┐
      │                                              │
      │  github.ts  → GitHub Releases API            │
      │    └─ r.body を content にマッピング          │
      │  rss.ts     → rss-parser                エラー時
      │    └─ enrichEventsWithContent で本文抽出  error_count++
      │  hackernews.ts → Firebase HN API        lastError 記録
      │    └─ URL有: enrichEventsWithContent
      │       URL無(Ask HN): HN API text フィールド
      ▼
  [Stage 1] 重複排除（deduplicateEvents）
    - externalId による既存チェック
    - content_hash（SHA-256）による既存チェック
      │ 新規のみ通過
      ▼
  raw_event に一括保存（createMany + skipDuplicates）
    - title, url, urlNormalized, publishedAt, content を専用カラムに保存
    - payload は純粋な生APIレスポンスのみ
      │
      ▼
  source.lastFetchedAt 更新、errorCount リセット
```

#### 実装済みフロー（共通モジュール: backend/lib/usecases/ Stage 2-3）

fetch.ts から共通モジュールとして利用される。

```
  [Stage 2] classifyEvents（Gemini Flash Lite 分類・バッチ処理・並列度5）
    - 全ソースの未処理 raw_event を対象（ソースタイプフィルタなし）
    - ソース信頼度を動的決定: hackernews=0.8, rss=0.7, github_release=0.9
    - 関連度判定、topic / format ラベル付け、緊急度判定
      │
      ├── is_urgent=true ──→ 即時 Slack 緊急アラート送信
      │
      ▼ 関連ありのみ
  [Stage 3] summarizeItems（Gemini Flash 要約・上位100件・並列度3）
    - 全ソースの未要約 item を対象（ソースタイプフィルタなし）
    - rawEvent.content（記事本文）を使用して日本語要約生成
    - 日本語要約生成（short / medium / key_points / why_it_matters）
    - エンティティ抽出
    - Flash 失敗時は Flash Lite にフォールバック
      │
      ▼
  item テーブルに保存
      │
      ▼
  checkCost: llm_cost 集計 → 日次閾値チェック → 超過時 Slack アラート

  [毎朝 Digestジョブ]（未実装）
  item テーブルから過去24h分を取得 → Slack配信
```

### 6.4 ディレクトリ構成

```
shinbun/
├── .github/
│   ├── workflows/
│   │   ├── test.yml                # push/PR時のユニットテスト
│   │   ├── fetch.yml               # 全ソースフェッチ（30分毎）
│   │   ├── claude.yml              # Claude Code インタラクティブ
│   │   └── claude-code-review.yml  # PR自動レビュー（設計書整合性チェック）
│   └── scripts/                    # CI用スクリプト
│
├── backend/                        # バッチ処理・バックエンドロジック
│   ├── config/                     # 全設定ファイル（管理画面なし・YAML直接編集）
│   │   ├── settings.yaml           # 配信時刻・件数・コストアラート閾値
│   │   ├── sources.yaml            # 情報源リスト
│   │   └── watchlist.yaml          # ウォッチリスト（エンティティ・キーワード）
│   │
│   ├── scripts/                    # バッチスクリプト（tsx で実行）
│   │   └── fetch.ts                # 全ソースフェッチ → Stage 1-3（重複排除・分類・要約）パイプライン
│   │
│   ├── lib/
│   │   ├── config.ts               # config/*.yaml の読み込み（Zod バリデーション）
│   │   ├── config.test.ts
│   │   ├── url.ts                  # URL正規化・contentHash（SHA-256）
│   │   ├── url.test.ts
│   │   ├── gemini.ts               # Gemini API クライアント（シングルトン）+ モデル定数
│   │   ├── gemini.test.ts
│   │   ├── scoring.ts              # 重要度スコアリング（0-100）
│   │   ├── scoring.test.ts
│   │   ├── retry.ts                # 指数バックオフリトライ
│   │   ├── retry.test.ts
│   │   ├── slack.ts                # Slack通知（緊急アラート / コストアラート）
│   │   ├── slack.test.ts
│   │   ├── processors/
│   │   │   ├── classify.ts         # Gemini Flash Lite による分類（バッチ対応）
│   │   │   ├── classify.test.ts
│   │   │   ├── summarize.ts        # Gemini Flash による要約（バッチ対応・フォールバック）
│   │   │   └── summarize.test.ts
│   │   ├── fetchers/
│   │   │   ├── index.ts            # fetchSource ルータ（ソース種別で振り分け）
│   │   │   ├── types.ts            # SourceConfig の再エクスポート
│   │   │   ├── github.ts           # GitHub Releases API フェッチャー
│   │   │   ├── github.test.ts
│   │   │   ├── rss.ts              # RSS/Atom フィードフェッチャー
│   │   │   ├── rss.test.ts
│   │   │   ├── hackernews.ts       # Hacker News API フェッチャー
│   │   │   ├── hackernews.test.ts
│   │   │   ├── extract-content.ts  # 記事本文抽出（@extractus/article-extractor）
│   │   │   └── extract-content.test.ts
│   │   └── db/
│   │       └── client.ts           # Prisma クライアント（シングルトン）
│   │
│   ├── migration/                  # DBスキーマ・マイグレーション（Prisma）
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   └── test-fixtures/              # テスト用データ
│
├── mock/                           # Next.js フロントエンド（モックUI）
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # ダッシュボード
│   │   ├── layout.tsx
│   │   ├── login/page.tsx          # ログイン画面
│   │   ├── items/[id]/page.tsx     # 記事詳細
│   │   └── saved/page.tsx          # 保存一覧
│   ├── components/
│   │   ├── Header.tsx              # ナビゲーションヘッダー
│   │   ├── ArticleCard.tsx         # 記事カードコンポーネント
│   │   └── ui/                     # shadcn/ui コンポーネント
│   └── lib/
│       └── mock-data.ts            # モックデータ（DB未接続）
│
├── docs/                           # 設計ドキュメント
│
├── package.json                    # ルートプロジェクト設定
├── tsconfig.json
├── vitest.config.mts
├── docker-compose.yml
├── CLAUDE.md                       # プロジェクトガイドライン
└── .env                            # gitignore 対象（ローカル開発用・秘匿情報のみ）
```

> `backend/config/*.yaml` はリポジトリにコミットして管理する。設定変更はファイル編集 → `main` へのプッシュで反映される。
> バッチスクリプトはローカルでは `npm run fetch` で実行する。GitHub Actions では `npx tsx backend/scripts/fetch.ts` で実行。
> `backend/lib/` 配下のモジュールは `backend/scripts/` から参照される。フロントエンド（`mock/`）は現在モックデータを使用しており、DB未接続。

### 6.5 Supabase 構成

| 機能 | 用途 | プラン |
|---|---|---|
| PostgreSQL | メインDB（全テーブル） | 無料枠（500MB） |
| pgvector | ベクトル検索（Phase 2〜） | 無料枠に含む |

> DB アクセスには Prisma ORM を使用する。接続先は `DATABASE_URL` 環境変数で指定する。
> Supabase の JavaScript SDK（`@supabase/supabase-js`）は使用しない。
> raw_event を30日で削除すれば、~500件/日の規模で500MBは問題なし。
> item テーブルが1年以上蓄積し1GBを超えた場合は Supabase Pro（$25/月）へ移行を検討。

### 6.6 Vercel プラン選定

バッチ処理を GitHub Actions に移したことで、Vercel は Web UI の配信のみを担う。Cron 機能は不要となるため **Hobby（$0）で十分**。

| プラン | 月額 | 採用理由 |
|---|---|---|
| Hobby | $0 | Web UI 配信のみ。Cron 不要のため無料枠で十分 |

### 6.7 npm スクリプト

```json
{
  "scripts": {
    "db:migrate": "prisma migrate dev --schema backend/migration/schema.prisma",
    "db:studio": "prisma studio --schema backend/migration/schema.prisma",
    "db:generate": "prisma generate --schema backend/migration/schema.prisma",
    "db:push": "prisma db push --schema backend/migration/schema.prisma",
    "db:seed": "prisma db seed",
    "fetch": "tsx --env-file=.env backend/scripts/fetch.ts",
    "test": "vitest run"
  }
}
```

### 6.8 GitHub Actions（パブリックリポジトリ前提）

リポジトリはパブリックとする。パブリックリポジトリの GitHub Actions は**実行時間無制限・無料**。

APIキー等の機密情報は必ず **GitHub Secrets** で管理し、コードおよびログには含めない。

#### 実行時間内訳（バッチワークフロー実装後）

| ジョブ | 頻度/月 | 1回あたり | 月間合計 |
|---|---|---|---|
| fetch（30分毎） | 1,440回 | ~5分 | ~7,200分 |
| digest（毎朝） | 30回 | ~3分 | ~90分 |
| cleanup（毎週） | 4回 | ~2分 | ~8分 |
| **合計** | | | **~7,298分** |

> パブリックリポジトリであれば上記すべて **$0**。

### 6.9 月額コスト試算

#### 前提

LLM API 呼び出しは **Google Gemini API の無料枠**（30 RPM）を使用するため、通常運用ではコスト $0。

#### フェーズ別コスト見通し

| サービス | 内容 | Phase 1 | Phase 2〜 |
|---|---|---|---|
| Vercel | Hobby（Web UI配信のみ） | $0 | $0 |
| GitHub Actions | パブリックリポジトリ（無制限） | $0 | $0 |
| Supabase | Free（500MB） | $0 | $0〜$25 ※1 |
| Gemini API | 無料枠（30 RPM） | **$0** | **$0** ※2 |
| Sentry | Free | $0 | $0 |
| **追加インフラ合計** | | **$0/月** | **$0〜$25/月** |

※1 item テーブルが1年以上蓄積し 1GB を超えた場合、Supabase Pro（$25/月）へ移行
※2 無料枠を超過した場合は従量課金が発生する（Flash Lite: $0.075/MTok入力、Flash: $0.15/MTok入力）

#### API 利用量の目安

| ステージ | モデル | 処理件数/日 | コスト |
|---|---|---|---|
| Stage 2 分類 | Gemini 2.5 Flash Lite | ~400件 | $0（無料枠） |
| Stage 3 要約 | Gemini 2.5 Flash | ~100件（上位のみ） | $0（無料枠） |
| **合計** | | | **$0/日** |

> 日次コストが閾値（$5）を超えた場合に Slack アラートを送信する仕組みは引き続き有効。無料枠超過の早期検知に使用する。

---

## 7. 非機能要件

### 7.1 エラーハンドリング

#### ソースフェッチ障害

| 対応 | 内容 |
|---|---|
| リトライ | 指数バックオフ（最大5回: 1min→2min→4min→8min→16min） |
| 自動無効化 | 連続エラー5回でソースを `enabled=false` にし Slack に通知 |
| 状態追跡 | `source.last_error` / `error_count` に記録 |

#### LLM API障害

| 障害 | フォールバック |
|---|---|
| Flash 障害 | Flash Lite で要約（品質低下を許容し配信継続） |
| Flash Lite 障害 | ルールベース分類のみ（要約なしで配信） |
| レートリミット | キューイングで処理を平準化（Cron間隔内に収める） |

### 7.2 監視項目

| 項目 | 閾値 | アクション |
|---|---|---|
| ソースフェッチ失敗率 | > 20% | Slack アラート |
| LLM処理エラー率 | > 10% | フォールバック切り替え |
| 日次LLMコスト | > $5 | Slack アラート |
| Daily Digest未配信 | 配信時刻+30分 | Slack アラート |

### 7.3 セキュリティ

| 項目 | 対策 |
|---|---|
| APIキー管理（バッチ） | GitHub Secrets に登録予定。ローカルでは `.env` ファイルで管理（gitignore対象） |
| APIキー管理（Web UI） | Vercel Environment Variables に登録予定。`.env` はローカル開発専用（gitignore） |
| DB接続文字列 | `DATABASE_URL` で Prisma 経由で Supabase PostgreSQL に接続。コードにハードコードしない |
| パブリックリポジトリ対策 | Secrets はコードに埋め込まない。`console.log` 等でのキー出力を禁止する |
| Web UI保護 | Vercel Password Protection または Basic認証 |
| 外部データのサニタイズ | 外部取得データの表示時に XSS 対策を実施 |
| DB接続 | `DATABASE_URL`（Prisma 接続文字列）は `.env` / GitHub Secrets / Vercel Env Variables のみで管理 |
| Actions ログ | Secrets の値は GitHub が自動的にログからマスクする。ただし加工した値は手動でマスク要 |

---

End of 技術設計書
