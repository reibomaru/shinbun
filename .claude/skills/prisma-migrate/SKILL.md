---
name: prisma-migrate
description: Prisma のマイグレーション実行・作成スキル。schema.prisma を変更した後のマイグレーションファイル生成、DBへの適用、Prisma Client の再生成を行う。「マイグレーションを実行して」「スキーマ変更を反映して」「DBを更新して」「migrate して」「prisma migrate」など、Prisma スキーマ変更後のDB反映作業が必要なときに使うこと。schema.prisma を編集した直後にも積極的にトリガーすること。
---

# Prisma マイグレーション実行スキル

Claude Code は非インタラクティブ環境のため、`prisma migrate dev` が警告を伴うスキーマ変更時に確認プロンプトで失敗する。このスキルでは `prisma migrate diff` でSQLを自動生成し、マイグレーションファイルを作成してDBに適用する手順を定める。

## プロジェクト固有の設定

まず以下を確認して、プロジェクトのPrisma構成を把握する:

1. `package.json` の `prisma.schema` フィールドまたは `scripts` 内の `--schema` オプションからスキーマパスを特定する
2. 既存のマイグレーションディレクトリ（`migrations/` 配下）のタイムスタンプ形式と命名規則を確認する
3. `.env` から `DATABASE_URL` を読み込む方法を確認する

## マイグレーションファイル作成手順

### Step 1: `prisma migrate diff` でSQL自動生成

現在のDBの状態とスキーマの差分から、SQLを自動生成する。これが最も確実な方法で、手動でSQL文を書く必要がない:

```bash
source .env && npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel <schema-path> \
  --script
```

出力されるSQLが正しいことを確認する。

### Step 2: マイグレーションディレクトリ作成とSQL書き込み

タイムスタンプは `YYYYMMDDHHmmss` 形式(UTC)。命名は変更内容を表す英語のスネークケース:

```bash
TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
MIGRATION_DIR="<migrations-dir>/${TIMESTAMP}_<description>"
mkdir -p "$MIGRATION_DIR"

source .env && npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel <schema-path> \
  --script > "$MIGRATION_DIR/migration.sql"
```

Step 1 と Step 2 はまとめて1コマンドで実行してよい。

### Step 3: DBへの適用

`migrate deploy` は非インタラクティブ環境でも動作し、未適用のマイグレーションを順番に実行する:

```bash
npx prisma migrate deploy --schema <schema-path>
```

### Step 4: Prisma Client を再生成

```bash
npx prisma generate --schema <schema-path>
```

## テストの実行

マイグレーション作成後、既存テストが通ることを確認する。Prisma のモックを使っているテストでは、新しいメソッド（例: `createMany`）の追加やシグネチャ変更がテストに影響する場合があるので注意する。

## よくあるトラブル

### `prisma migrate dev` が非インタラクティブエラーで失敗する

```
Error: Prisma Migrate has detected that the environment is non-interactive
```

→ 上記の `prisma migrate diff` + `migrate deploy` の手順を使う。`--create-only` フラグも警告がある場合は同様に失敗する。

### DBリセットが必要な場合

Prisma が Claude Code を検出してセーフガードが発動する。ユーザーの明示的な同意を得た上で `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` 環境変数にユーザーの同意メッセージをセットして実行する:

```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<ユーザーの同意メッセージ>" \
  npx prisma migrate reset --schema <schema-path> --force
```

### マイグレーション履歴とDBの状態がドリフトしている

適用済みマイグレーションファイルを削除するとドリフトが発生する。`_prisma_migrations` テーブルで状態を確認:

```sql
SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;
```

ドリフト解消には DB リセット（上記参照）が必要。
