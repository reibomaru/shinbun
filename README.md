# 新聞 (Shinbun)

AI・Web 開発領域の情報を自動収集・要約し、Slack 通知と Web ダッシュボードで配信するシステムです。

> **Note:** 現在開発中です。

## アーキテクチャ概要

```
shinbun/
├── mock/      # Web UI (Next.js)
├── backend/   # バッチ処理スクリプト・DB マイグレーション
└── docs/      # 設計ドキュメント
```

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | shadcn/ui + Tailwind CSS 4 |
| DB | PostgreSQL (Supabase) + Prisma ORM |
| LLM | Anthropic Claude API |
| バッチ | GitHub Actions (cron) |
| 通知 | Slack Incoming Webhooks |

## 必要な環境

- Node.js 20+
- Docker (ローカル DB 用)
- npm

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repo-url>
cd shinbun
```

### 2. ローカル DB の起動

```bash
docker compose up -d
```

PostgreSQL が `localhost:5432` で起動します（DB 名: `shinbun_dev`、ユーザー: `postgres`、パスワード: `postgres`）。

### 3. 環境変数の設定

ルートと `mock/` それぞれに `.env` を作成します。

**ルート (`.env`)** — バッチ処理・Prisma 用:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shinbun_dev"
ANTHROPIC_API_KEY="sk-ant-..."
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
GITHUB_TOKEN="ghp_..."          # GitHub RSS 取得用（任意）
```

**`mock/.env.local`** — フロントエンド用:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shinbun_dev"
```

### 4. バックエンド依存パッケージのインストール & DB マイグレーション

```bash
npm install
npm run db:migrate
```

### 5. フロントエンドのセットアップ

```bash
cd mock
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 開発コマンド

### フロントエンド (`mock/`)

```bash
npm run dev    # 開発サーバー起動
npm run build  # プロダクションビルド
npm run lint   # ESLint
```

### バックエンド (ルート)

```bash
npm run fetch       # 記事フェッチ実行
npm test            # テスト実行 (Vitest)
npm run db:migrate  # DB マイグレーション適用
npm run db:studio   # Prisma Studio (DB GUI)
npm run db:generate # Prisma Client 再生成
```

## ドキュメント

詳細な仕様・設計は `docs/` を参照してください。

- [`docs/ai_tech_daily_aggregator_prd_v_2.md`](docs/ai_tech_daily_aggregator_prd_v_2.md) — プロダクト要件定義書
- [`docs/ai_tech_daily_aggregator_technical_design.md`](docs/ai_tech_daily_aggregator_technical_design.md) — 技術設計書
- [`docs/ui_screen_design.md`](docs/ui_screen_design.md) — UI/UX 画面設計書
