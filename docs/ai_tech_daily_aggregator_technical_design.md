# 技術設計書: AI / Web開発 Daily 情報アグリゲータ

対応仕様書: `ai_tech_daily_aggregator_prd_v_2.md`

---

## 1. 技術スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| フロントエンド | Next.js (App Router) | SSR対応、React Server Components |
| UIライブラリ | shadcn/ui + Tailwind CSS | 高速開発、カスタマイズ性 |
| バックエンド | Next.js API Routes | フロントと統合、個人利用規模で十分 |
| バッチ/スケジュール | GitHub Actions | 無料枠あり、Claude APIキーをSecretで安全管理 |
| DB | Supabase (PostgreSQL) | pgvector対応、無料枠で個人利用可 |
| ベクトル検索 | pgvector (Supabase) | 別サービス不要（Phase 2〜） |
| LLM | Anthropic API (Claude) | 日本語品質、コスト効率 |
| 埋め込み | Voyage AI or OpenAI | 高品質ベクトル（Phase 2〜） |
| ホスティング | Vercel | Next.jsとの親和性、無料枠あり |
| 通知 | Slack Incoming Webhook | シンプル、Bolt SDK不要 |
| 監視 | Sentry（無料枠） | エラー追跡 |

> 個人利用のためInngest/BullMQのような外部キューは不要。
> バッチ処理は GitHub Actions で実行し、Anthropic API キーを GitHub Secrets で管理する。
> Next.js（Vercel）はWeb UIの配信のみを担う。

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
| payload | JSONB | 生データ（API レスポンス全体） |
| content_hash | TEXT | SHA-256（重複排除用） |
| fetched_at | TIMESTAMP | 取得日時 |
| processed | BOOLEAN | LLM処理済みフラグ |

#### item
処理済みの記事データ。無期限保持。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| raw_event_id | UUID | FK → raw_event |
| item_type | ENUM | `release / article / video / paper / changelog` |
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
| status | ENUM | `pending / processed / archived` |
| llm_model_used | TEXT | 処理に使用したモデル名 |
| llm_cost | FLOAT | 処理コスト（USD） |
| created_at | TIMESTAMP | 作成日時 |

#### item_label
記事のカテゴリ・フォーマット・難易度ラベル。

| カラム | 型 | 説明 |
|---|---|---|
| item_id | UUID | FK → item |
| label_type | ENUM | `topic / format / difficulty` |
| label_value | TEXT | ラベル値 |

#### entity
ライブラリ・モデル・企業等のエンティティ定義。

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| entity_type | ENUM | `library / model / company / repo` |
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
                          └──  embedding

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

すべての設定は `config/` 配下の YAML ファイルで管理する。管理画面は提供しない。
秘匿情報（APIキー等）のみ環境変数（ローカル: `.env.local` / CI: GitHub Secrets）で管理する。

### 3.1 環境変数

秘匿情報のみ。設定値は YAML で管理するため環境変数には含めない。

**ローカル開発（`.env.local`）/ GitHub Secrets（本番）共通:**

```env
ANTHROPIC_API_KEY=sk-ant-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

### 3.2 `config/settings.yaml` — 配信設定

```yaml
digest:
  time: "08:00"         # 配信時刻（JST）
  timezone: Asia/Tokyo
  top_count: 5          # Top件数
  total_count: 20       # 全体件数

cost_alert:
  daily_usd: 5          # 日次コストアラート閾値
```

### 3.3 `config/sources.yaml` — 情報源設定

```yaml
sources:
  - type: github_repo
    name: Claude Code
    config:
      owner: anthropics
      repo: claude-code
    polling_interval: 3600   # 秒

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
      mode: top        # top / best / new
      min_score: 10    # 最低スコアフィルタ
    polling_interval: 1800
```

### 3.4 `config/watchlist.yaml` — ウォッチリスト

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
情報取得
  ↓
[Stage 1] ルールベースフィルタ（コスト: $0）
  - content_hash による完全重複排除
  - url_normalized による URL重複排除
  - ソースごとの最低品質フィルタ（例: HN score > 10）
  ↓
[Stage 2] 軽量LLM分類（Claude Haiku）
  - 関連度判定（AI/Web開発に関係あるか）
  - topic / format ラベル付け
  - 緊急度判定（セキュリティ / Breaking Change）
  ↓ 関連ありのみ通過
  ├── is_urgent=true → 即時 Slack 緊急アラート
  ↓
[Stage 3] 高品質LLM処理（Claude Sonnet）※上位100件のみ
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
| Stage 2 | Claude Haiku 4.5 | 分類・フィルタ | ~$0.001 |
| Stage 3 | Claude Sonnet 4.6 | 要約・スコアリング | ~$0.01 |
| Stage 4 | Voyage AI / OpenAI | 埋め込み生成 | ~$0.0001 |

### 4.3 コスト試算（月額）

| 項目 | 想定件数/日 | 通過率 | 処理件数/日 | 単価 | 月額 |
|---|---|---|---|---|---|
| Stage 1 通過 | 500 | 80% | 400 | — | $0 |
| Stage 2 Haiku | 400 | 50% | 400 | $0.001 | $12 |
| Stage 3 Sonnet | — | — | 100（上位のみ） | $0.01 | $30 |
| Stage 4 埋め込み | — | — | Phase 2以降 | — | — |
| **合計** | | | | | **~$42** |

### 4.4 コスト管理ロジック

- `item.llm_cost` に処理コストを記録
- 日次コスト合計が `LLM_DAILY_COST_ALERT_USD`（デフォルト $5）を超えたら Slack に通知
- 月次予算超過時は Stage 3 を Haiku にフォールバック

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
| topic | `genai / frontend / backend / devtools / infra / security` |
| format | `release / tutorial / benchmark / incident / paper / announcement` |
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

| レイヤー | 手法 | 実行ステージ |
|---|---|---|
| 完全一致 | `content_hash`（SHA-256） | Stage 1 |
| URL一致 | `url_normalized`（クエリパラメータ除去・www統一・末尾スラッシュ統一） | Stage 1 |
| タイトル類似 | タイトル正規化 + Levenshtein距離 < 0.2 | Stage 2 |
| 意味的重複 | embedding cosine similarity > 0.92 | Stage 4（Phase 2〜） |

### 5.2 マージ処理

意味的に重複するアイテムが検出された場合:
- より信頼度の高いソースを「プライマリ」とする
- 他ソースの情報は `item_entity` の関連ソースとして紐付ける
- 複数ソースで言及されている事実はスコアをブースト

---

## 6. インフラ構成

### 6.1 全体アーキテクチャ図

```
┌────────────────────────────────────────────────────────────────┐
│                      External Sources                          │
│  GitHub API   RSS Feeds   HN API   YouTube API   arXiv        │
└────────┬──────────────┬──────────┬────────────────────────────┘
         └──────────────┴──────────┘
                        │
          ┌─────────────▼──────────────────────────┐
          │           GitHub Actions                │
          │  fetch.yml       (毎時: cron)           │
          │  fetch-hn.yml    (30分毎: cron)         │
          │  digest.yml      (毎朝: cron)           │
          │  cleanup.yml     (毎週: cron)           │
          │                                         │
          │  scripts/ 配下の Node.js スクリプトを実行│
          └──────┬──────────────────────┬───────────┘
                 │                      │
     ┌───────────▼──┐        ┌──────────▼─────────┐
     │   Supabase   │        │   Anthropic API    │
     │  PostgreSQL  │        │  (ANTHROPIC_API_KEY │
     │  + pgvector  │        │   via GH Secrets)  │
     └──────┬───────┘        │   Claude Haiku     │
            │                │   Claude Sonnet    │
            │                └────────────────────┘
    ┌────────┴──────────┐
    │                   │
┌───▼──────────┐  ┌─────▼────────────┐
│ Next.js UI   │  │  Slack Webhook   │
│ (Vercel)     │  │  - Daily Digest  │
│  Dashboard   │  │  - 緊急アラート  │
│  保存/設定   │  │  - コストアラート│
└──────────────┘  └──────────────────┘

  ※ Vercel は Web UI の配信のみ。バッチ処理は GitHub Actions が担う。
```

### 6.2 GitHub Actions ワークフロー

#### ジョブ一覧

| ワークフローファイル | スケジュール（cron式） | 処理内容 |
|---|---|---|
| `fetch.yml` | `0 * * * *`（毎時0分） | 全ソース新着取得 → Stage 1-3処理 |
| `fetch-hn.yml` | `*/30 * * * *`（30分毎） | HN Top/Best取得 → Stage 1-3処理 |
| `digest.yml` | `0 23 * * *`（UTC 23:00 = JST 08:00） | 重要度順に整形 → Slack配信 |
| `cleanup.yml` | `0 0 * * 0`（毎週日曜） | raw_event 30日超・read_status 90日超を削除 |

#### GitHub Secrets 設定

| Secret名 | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 呼び出し（Haiku / Sonnet） |
| `SUPABASE_URL` | Supabase 接続先 URL |
| `SUPABASE_SERVICE_KEY` | Supabase サービスロールキー（書き込み権限） |
| `SLACK_WEBHOOK_URL` | Slack 通知送信先 |

#### ワークフロー定義例

```yaml
# .github/workflows/fetch.yml
name: Fetch & Process

on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:          # 手動実行も可能

jobs:
  fetch:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: node scripts/fetch.js
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

```yaml
# .github/workflows/digest.yml
name: Daily Digest

on:
  schedule:
    - cron: '0 23 * * *'     # UTC 23:00 = JST 08:00
  workflow_dispatch:

jobs:
  digest:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: node scripts/digest.js
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### GitHub Actions 実行時間の見積もり

| ジョブ | 頻度 | 1回あたり | 月間合計 |
|---|---|---|---|
| fetch | 24回/日 | ~5分 | 3,600分 |
| fetch-hn | 48回/日 | ~2分 | 2,880分 |
| digest | 1回/日 | ~3分 | 90分 |
| cleanup | 4回/月 | ~2分 | 8分 |
| **合計** | | | **~6,578分** |

> GitHub Free（プライベートリポジトリ）の無料枠は500分/月のため超過する。
> **GitHub Pro（$4/月）で3,000分**が付与されるが、それでも不足する場合はfetch頻度を下げる（2時間に1回等）か、リポジトリをパブリックにする（**Actions は無料**）ことで対応可能。
> パブリックの場合は Secrets が漏洩しないよう環境変数の管理を徹底する。

### 6.3 データフロー詳細

```
[毎時 Fetchジョブ（GitHub Actions: fetch.yml）]

  sources.yaml（リポジトリ内の設定ファイル）
      │
      ▼
  source テーブルから有効なソースを取得
      │
      ▼
  各ソースをポーリング ────────────────────────────┐
      │                                            │
      ▼                                       エラー時
  raw_event に保存                         指数バックオフでリトライ
      │                                      (1m→2m→4m→8m→16m)
      ▼                                      error_count++
  [Stage 1] ルールベースフィルタ
    - content_hash 重複チェック
    - url_normalized 重複チェック
    - 品質フィルタ（HN score等）
      │ 通過
      ▼
  [Stage 2] Haiku分類（バッチ処理）
    - 関連度判定
    - topic / format ラベル付け
    - 緊急度判定
      │
      ├── is_urgent=true ──→ 即時 Slack 緊急アラート送信
      │
      ▼ 関連ありのみ
  [Stage 3] Sonnet要約（上位100件のみ）
    - 要約生成
    - エンティティ抽出
    - 重要度スコアリング
      │
      ▼
  item テーブルに保存
      │
      ▼
  llm_cost 集計 → 日次閾値チェック → 超過時 Slack アラート

[毎朝 Digestジョブ（GitHub Actions: digest.yml / UTC 23:00）]

  item テーブルから過去24h分を取得
      │
      ▼
  importance_score 降順でソート
      │
      ▼
  Top N + カテゴリ別ハイライトを整形
      │
      ▼
  Slack Incoming Webhook でメッセージ送信
```

### 6.4 ディレクトリ構成

```
shinbun/
├── .github/
│   └── workflows/
│       ├── fetch.yml               # 毎時フェッチジョブ
│       ├── fetch-hn.yml            # 30分毎 HN フェッチジョブ
│       ├── digest.yml              # 毎朝 Daily Digestジョブ
│       └── cleanup.yml             # 毎週クリーンアップジョブ
│
├── config/                         # 全設定ファイル（管理画面なし・YAML直接編集）
│   ├── settings.yaml               # 配信時刻・件数・コストアラート閾値
│   ├── sources.yaml                # 情報源リスト
│   └── watchlist.yaml              # ウォッチリスト（エンティティ・キーワード）
│
├── scripts/                        # GitHub Actions から直接実行するスクリプト
│   ├── fetch.js                    # フェッチ → Stage 1-3処理
│   ├── fetch-hn.js                 # HN フェッチ → Stage 1-3処理
│   ├── digest.js                   # Slack Daily Digest 送信
│   └── cleanup.js                  # データクリーンアップ
│
├── app/                            # Next.js（Web UI のみ）
│   ├── page.tsx                    # ダッシュボード一面
│   ├── items/[id]/page.tsx         # 記事詳細
│   ├── saved/page.tsx              # 保存一覧
│   └── api/
│       ├── items/route.ts          # アイテム一覧API（UI用）
│       ├── feedback/route.ts       # フィードバック記録API
│       └── saved/route.ts          # 保存API
│
├── lib/
│   ├── config.ts                   # config/*.yaml の読み込みユーティリティ
│   ├── fetchers/
│   │   ├── github.ts
│   │   ├── rss.ts
│   │   ├── hackernews.ts
│   │   └── changelog.ts
│   ├── processors/
│   │   ├── filter.ts               # Stage 1 ルールベース
│   │   ├── classify.ts             # Stage 2 (Claude Haiku)
│   │   └── summarize.ts            # Stage 3 (Claude Sonnet)
│   ├── db/
│   │   └── client.ts               # Supabase クライアント
│   ├── slack.ts                    # Webhook 送信
│   └── scoring.ts                  # 重要度スコアリング
│
├── migration/                     # DBスキーマ・マイグレーション（Prisma）
│   ├── schema.prisma
│   └── migrations/
│
└── .env.local                      # gitignore 対象（ローカル開発用・秘匿情報のみ）
```

> `config/*.yaml` はリポジトリにコミットして管理する。設定変更はファイル編集 → `main` へのプッシュで反映される。
> `scripts/` は GitHub Actions の `ubuntu-latest` ランナー上で直接 `node scripts/fetch.js` として実行される。
> `lib/` 配下のモジュールは `scripts/` と `app/` の両方から共有する。

### 6.5 Supabase 構成

| 機能 | 用途 | プラン |
|---|---|---|
| PostgreSQL | メインDB（全テーブル） | 無料枠（500MB） |
| pgvector | ベクトル検索（Phase 2〜） | 無料枠に含む |

> raw_event を30日で削除すれば、~500件/日の規模で500MBは問題なし。
> item テーブルが1年以上蓄積し1GBを超えた場合は Supabase Pro（$25/月）へ移行を検討。

### 6.6 Vercel プラン選定

バッチ処理を GitHub Actions に移したことで、Vercel は Web UI の配信のみを担う。Cron 機能は不要となるため **Hobby（$0）で十分**。

| プラン | 月額 | 採用理由 |
|---|---|---|
| Hobby | $0 | Web UI 配信のみ。Cron 不要のため無料枠で十分 |

### 6.7 GitHub Actions（パブリックリポジトリ前提）

リポジトリはパブリックとする。パブリックリポジトリの GitHub Actions は**実行時間無制限・無料**。

APIキー等の機密情報は必ず **GitHub Secrets** で管理し、コードおよびログには含めない。

#### 実行時間内訳

| ジョブ | 頻度/月 | 1回あたり | 月間合計 |
|---|---|---|---|
| fetch（毎時） | 720回 | ~5分 | ~3,600分 |
| fetch-hn（30分毎） | 1,440回 | ~2分 | ~2,880分 |
| digest（毎朝） | 30回 | ~3分 | ~90分 |
| cleanup（毎週） | 4回 | ~2分 | ~8分 |
| **合計** | | | **~6,578分** |

> パブリックリポジトリであれば上記すべて **$0**。

### 6.8 月額コスト試算

#### 前提

LLM API 呼び出しは **Claude Code Pro プランの利用枠を使用**するため、Anthropic API の従量課金は発生しない。

#### フェーズ別コスト見通し

| サービス | 内容 | Phase 1 | Phase 2〜 |
|---|---|---|---|
| Vercel | Hobby（Web UI配信のみ） | $0 | $0 |
| GitHub Actions | パブリックリポジトリ（無制限） | $0 | $0 |
| Supabase | Free（500MB） | $0 | $0〜$25 ※1 |
| Anthropic API | Claude Code Pro 枠を利用 | **$0** | **$0** ※2 |
| Sentry | Free | $0 | $0 |
| **追加インフラ合計** | | **$0/月** | **$0〜$25/月** |

※1 item テーブルが1年以上蓄積し 1GB を超えた場合、Supabase Pro（$25/月）へ移行
※2 利用量が Pro プランの枠を超過した場合は従量課金が発生する可能性あり（下記参照）

#### API 利用量の目安（プラン枠の超過監視）

Claude Code Pro プランの枠内に収まっているか確認するため、`item.llm_cost` に処理コストを記録し続ける。

| ステージ | モデル | 処理件数/日 | 想定コスト換算/日 | 月間換算 |
|---|---|---|---|---|
| Stage 2 分類 | Claude Haiku 4.5 | ~400件 | ~$0.40 | ~$12 |
| Stage 3 要約 | Claude Sonnet 4.6 | ~100件（上位のみ） | ~$1.00 | ~$30 |
| **合計** | | | **~$1.40/日** | **~$42/月相当** |

> 枠超過のリスク管理: 日次コストが閾値（$5）を超えた場合に Slack アラートを送信する仕組みは引き続き有効にしておく。枠を超過し従量課金に切り替わった場合の早期検知に使用する。

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
| Sonnet 障害 | Haiku で要約（品質低下を許容し配信継続） |
| Haiku 障害 | ルールベース分類のみ（要約なしで配信） |
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
| APIキー管理（バッチ） | GitHub Secrets に登録。ワークフローの `env:` から参照し、コード・ログには含めない |
| APIキー管理（Web UI） | Vercel Environment Variables に登録。`.env.local` はローカル開発専用（gitignore） |
| パブリックリポジトリ対策 | Secrets はコードに埋め込まない。`console.log` 等でのキー出力を禁止する |
| Web UI保護 | Vercel Password Protection または Basic認証 |
| 外部データのサニタイズ | 外部取得データの表示時に XSS 対策を実施 |
| DB接続 | Supabase Service Key（書き込み権限）は GitHub Secrets と Vercel Env Variables のみで管理 |
| Actions ログ | Secrets の値は GitHub が自動的にログからマスクする。ただし加工した値は手動でマスク要 |

---

End of 技術設計書
