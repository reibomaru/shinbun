# CLAUDE.md

## プロジェクト概要

AI Tech Daily Aggregator（Shinbun 新聞）— AI・Web開発領域の情報を自動収集・要約し、Slack通知とWebダッシュボードで配信するシステム。

## 技術スタック

- **フロントエンド:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **UIフレームワーク:** shadcn/ui (new-york スタイル) + Tailwind CSS 4 + Lucide Icons
- **データベース:** PostgreSQL (Supabase) + Prisma ORM
- **LLM:** Anthropic Claude API (Haiku: フィルタリング、Sonnet: 要約)
- **バッチ処理:** GitHub Actions (cron)
- **通知:** Slack Incoming Webhooks
- **ホスティング:** Vercel (フロントエンド)、GitHub Actions (バッチジョブ)

## ディレクトリ構成

```
shinbun/
├── mock/           # Next.js Web UI（フロントエンド）
│   ├── app/        # App Router ページ
│   ├── components/ # React コンポーネント
│   └── lib/        # ユーティリティ・モックデータ
├── docs/           # 設計ドキュメント
│   ├── ai_tech_daily_aggregator_prd_v_2.md          # PRD（プロダクト要件定義書）
│   ├── ai_tech_daily_aggregator_technical_design.md  # 技術設計書（DB スキーマ、LLM パイプライン、コスト分析等）
│   ├── ui_screen_design.md                           # UI/UX 画面設計書（レイアウト、コンポーネント仕様、配色）
│   └── screenshots/                                  # UI モックアップのスクリーンショット
└── .claude/        # Claude Code 設定
```

## 開発における注意事項

- **フロントエンド開発時は `docs/ui_screen_design.md` を必ず参照すること。** UI のレイアウト・コンポーネント仕様・配色はこの設計書に準拠する。
- 技術的な実装方針は `docs/ai_tech_daily_aggregator_technical_design.md` を参照。
- プロダクト要件・機能仕様は `docs/ai_tech_daily_aggregator_prd_v_2.md` を参照。

## コーディング規約

### 言語・ファイル

- TypeScript 必須（`.tsx` / `.ts`）
- パスエイリアス: `@/` を使用（例: `@/components/Header`）
- クライアントコンポーネントは先頭に `"use client"` を記述

### 命名規則

- **コンポーネント・型:** PascalCase（`ArticleCard`, `Article`）
- **変数・Props:** camelCase（`isRead`, `summaryShort`）
- **定数:** UPPER_SNAKE_CASE（`TOPIC_COLORS`）

### スタイリング

- Tailwind CSS ユーティリティクラスを直接使用
- CSS変数によるテーマ管理
- カテゴリ配色: GenAI=紫, Frontend=青, Backend=緑, DevTools=橙, Security=赤

### コンポーネント設計

- shadcn/ui のバリアントシステムを活用
- レスポンシブ対応: モバイルファースト → `sm:` → `lg:` ブレークポイント

## 開発コマンド

```bash
# フロントエンド開発サーバー
cd mock && npm run dev

# ビルド
cd mock && npm run build

# リント
cd mock && npm run lint
```

## Git ワークフロー

- メインブランチ: `main`
- 機能ブランチ: `feature/<機能名>`
- PR は `main` に対して作成

## PR 作成時の設計書整合性チェック

PR を作成する前に、以下の手順で `docs/` 配下の設計書と実装の整合性を確認すること。

1. **変更内容の特定:** PR に含まれる変更ファイルを確認する
2. **関連する設計書の特定:** 変更内容に応じて対応する設計書を特定する
   - UI / フロントエンド変更 → `docs/ui_screen_design.md`
   - DB スキーマ / バックエンド / バッチ処理 → `docs/ai_tech_daily_aggregator_technical_design.md`
   - 機能仕様 / ユーザーフロー変更 → `docs/ai_tech_daily_aggregator_prd_v_2.md`
3. **差分の確認:** 実装が設計書の内容と乖離していないか確認する
4. **設計書の更新:** 乖離がある場合、設計書を実装に合わせて更新し、同じ PR に含める
5. **PR 本文に記載:** 設計書を更新した場合、PR の変更内容に「設計書更新」を明記する
