---
name: screenshot
description: >
  Webページやローカル開発サーバーのスクリーンショットを撮影するスキル。
  「スクリーンショットを撮って」「各画面をキャプチャして」「mockupの画像が欲しい」
  「ドキュメント用に画面を撮影して」「localhost の画面を保存して」など、
  WebページのUIを画像として記録したいときは必ずこのスキルを使うこと。
  単一URLでもURLリストでも対応可能。Playwright を使って自動撮影する。
---

# Screenshot Skill

Playwright を使ってWebページのスクリーンショットを自動撮影する。

---

## 基本の使い方

スクリプトは `.claude/skills/screenshot/scripts/capture.mjs` にある。
`playwright` パッケージが必要。プロジェクト内に入っていない場合は `npm install playwright` で追加し、
`npx playwright install chromium` でブラウザをインストールする。

### 単一ページ

```bash
node .claude/skills/screenshot/scripts/capture.mjs \
  --url http://localhost:3000/ \
  --name dashboard \
  --out docs/screenshots
```

### 複数ページ（バッチ）

```bash
node .claude/skills/screenshot/scripts/capture.mjs \
  --urls '[
    {"name":"dashboard",       "url":"http://localhost:3000/"},
    {"name":"article-detail",  "url":"http://localhost:3000/items/1"},
    {"name":"saved",           "url":"http://localhost:3000/saved"},
    {"name":"login",           "url":"http://localhost:3000/login"}
  ]' \
  --out docs/screenshots
```

---

## オプション一覧

| オプション | デフォルト | 説明 |
|---|---|---|
| `--url <url>` | — | 単一URLを指定 |
| `--urls <json>` | — | `[{name, url}]` の JSON 配列 |
| `--name <name>` | `screenshot` | `--url` 使用時のファイル名（拡張子なし） |
| `--out <dir>` | `./screenshots` | 出力ディレクトリ |
| `--width <px>` | `1440` | ビューポート幅 |
| `--height <px>` | `900` | ビューポート高さ |
| `--no-full-page` | （なし） | フルページ撮影を無効化（ビューポートサイズのみ） |
| `--wait <ms>` | `500` | ページ読み込み後の待機時間（ms） |
| `--wait-selector <sel>` | — | 指定CSSセレクタが現れるまで待機してから撮影 |

---

## 手順

1. **dev サーバーが起動しているか確認する**
   - 起動していない場合は `cd mock && npm run dev &` などで起動し、Ready が出るまで待つ
   - 既に起動中なら `curl -s http://localhost:3000 | head -1` で確認できる

2. **スキルの依存パッケージを確認する**
   - `.claude/skills/screenshot/node_modules/` がなければ `cd .claude/skills/screenshot && npm install` を実行する
   - ブラウザが未インストールなら同ディレクトリで `npx playwright install chromium` を実行する

3. **スクリプトを実行する**
   - スクリプトは **`.claude/skills/screenshot/` ディレクトリから実行する**（node_modules の解決のため）
   - 上記の「基本の使い方」コマンドをそのまま実行する

4. **出力を確認してユーザーに伝える**
   - 出力ディレクトリとファイル名をリストアップして報告する
   - ドキュメントに埋め込む場合は相対パスで `![alt](screenshots/foo.png)` の形式を使う

---

## このプロジェクトでの典型的な使い方

このプロジェクトでは `mock/` に Next.js のモックアップがあり、
スクリーンショットは `docs/screenshots/` に保存する慣習になっている。

```bash
# スキルディレクトリから実行する（node_modules の解決のため）
cd /Users/sugiura/shinbun/.claude/skills/screenshot

node scripts/capture.mjs \
  --urls '[
    {"name":"dashboard",              "url":"http://localhost:3000/"},
    {"name":"article-detail",         "url":"http://localhost:3000/items/1"},
    {"name":"article-detail-security","url":"http://localhost:3000/items/7"},
    {"name":"saved",                  "url":"http://localhost:3000/saved"},
    {"name":"login",                  "url":"http://localhost:3000/login"}
  ]' \
  --out ../../docs/screenshots
```

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `Cannot find module 'playwright'` | `npm install playwright` を実行 |
| `Executable doesn't exist` | `npx playwright install chromium` を実行 |
| タイムアウトエラー | dev サーバーが起動しているか確認。`--wait 1000` で待機時間を増やす |
| 画像が真っ白 | JS の描画が間に合っていない可能性。`--wait 1500` を試す |
| 要素が欠けている | `--wait-selector ".main-content"` など特定要素が出るまで待機する |
