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
├── backend/        # バッチ処理・バックエンドロジック
│   ├── lib/        # コアライブラリ（レイヤードアーキテクチャ）
│   │   ├── models/         # ドメインモデル・型定義（RawEventInput, FetchResult 等）
│   │   ├── repositories/   # リポジトリインターフェース（ISourceRepository, IRawEventRepository）
│   │   │   └── prisma/     # Prisma によるリポジトリ実装
│   │   ├── usecases/       # ビジネスロジック（fetchSource, syncSources, deduplicateEvents, saveEvents）
│   │   ├── fetchers/       # 外部ソースからのデータ取得
│   │   ├── container.ts    # DI コンテナ（リポジトリのシングルトン管理・実装切り替えの唯一の変更点）
│   │   ├── config.ts       # 設定
│   │   └── db/             # Prisma クライアント
│   └── scripts/    # エントリーポイント（薄いオーケストレーター）
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

## バックエンドアーキテクチャ

`backend/lib/` は **models / repositories / usecases** の3層レイヤードアーキテクチャ + DI コンテナで構成される。

| レイヤー | 役割 | 例 |
|---|---|---|
| **models** | ドメインモデル・型定義（最下層・依存なし） | `RawEventInput`, `FetchResult` |
| **repositories** | データアクセスのインターフェースと実装（models に依存） | `ISourceRepository`, `PrismaSourceRepository` |
| **usecases** | ビジネスロジック（repositories・models に依存） | `fetchSource`, `syncSources`, `deduplicateEvents`, `saveEvents` |
| **container.ts** | DI ワイヤリング（実装の切り替えはここだけ） | `sourceRepository`, `rawEventRepository` |
| **scripts/** | エントリーポイント（container から取得した依存を usecases に渡す薄いオーケストレーター） | `fetch.ts` |

### 設計方針

- **依存の方向:** scripts → usecases → repositories（インターフェース） → models。実装クラス（`prisma/`）はインターフェースに依存。
- **DI:** `container.ts` がリポジトリ実装のシングルトンを管理。実装の差し替え（例: Prisma → mock）は `container.ts` のみ変更。
- **テスト:** リポジトリインターフェースのモックを直接注入する方式。`vi.mock` は使わない。

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
# 依存インストール
pnpm install

# フロントエンド開発サーバー
pnpm --filter mock dev

# ビルド
pnpm --filter mock build

# リント（バックエンド）
pnpm run lint

# リント（フロントエンド）
pnpm --filter mock lint

# テスト
pnpm test
```

## Git ワークフロー

- メインブランチ: `main`
- 機能ブランチ: `feature/<機能名>`
- PR は `main` に対して作成
- **PR の作成は必ず `pr-creator` サブエージェント（Agent ツール）を使用すること。** 直接 `gh pr create` を実行しない。

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
