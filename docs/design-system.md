# デザインシステム — AI Tech Daily

対応 Issue: [#58 デザインシステムの策定（カラーガイド含む）](https://github.com/reibomaru/shinbun/issues/58)

---

## 基本原則

1. **カラーはタグ（Topic / Format バッジ）のみ**に使用する
2. タグ以外のUI要素は**グレースケール基調**で統一する
3. **唯一の例外**: 緊急アラートバナーのみ赤系を許容する（安全上の視認性確保）

---

## 1. カラーシステム

### 1.1 Topic カラー（5色）

タグバッジおよびカテゴリセクションのドット（●）に使用する。

| Topic | 表示名 | バッジ背景 | バッジ文字 | ドット |
|---|---|---|---|---|
| genai | GenAI | `bg-purple-100` | `text-purple-700` | `bg-purple-500` |
| frontend | Frontend | `bg-blue-100` | `text-blue-700` | `bg-blue-500` |
| backend | Backend | `bg-green-100` | `text-green-700` | `bg-green-500` |
| devtools | DevTools | `bg-orange-100` | `text-orange-700` | `bg-orange-500` |
| security | Security | `bg-red-100` | `text-red-700` | `bg-red-500` |

### 1.2 Format カラー（5色）

タグバッジにのみ使用する。

| Format | 表示名 | バッジ背景 | バッジ文字 |
|---|---|---|---|
| release | Release | `bg-emerald-100` | `text-emerald-700` |
| tutorial | Tutorial | `bg-sky-100` | `text-sky-700` |
| benchmark | Benchmark | `bg-amber-100` | `text-amber-700` |
| incident | Incident | `bg-red-100` | `text-red-700` |
| announcement | Announcement | `bg-violet-100` | `text-violet-700` |

### 1.3 ベースカラー（グレースケール）

タグ以外の全UI要素に使用する。

**テキスト階層:**

| 用途 | クラス | 使用例 |
|---|---|---|
| Primary | `text-gray-900` | 記事タイトル、見出し |
| Secondary | `text-gray-700` | セクションヘッダー、本文 |
| Tertiary | `text-gray-500` | ソース名、日時、メタデータ |
| Disabled | `text-gray-400` | アイコン初期状態、プレースホルダ |

**背景・ボーダー:**

| 用途 | クラス | 使用例 |
|---|---|---|
| Surface | `bg-white` | カード、ページ背景 |
| Subtle | `bg-gray-50` | 入力フィールド、セクション背景 |
| Border | `border-gray-200` | カード枠線、区切り線 |
| Border (強調) | `border-gray-300` | ホバー時のカード枠線 |

**アクション要素:**

| 状態 | クラス |
|---|---|
| アイコン初期 | `text-gray-400` |
| ホバー | `text-gray-900` |
| アクティブ | `text-gray-900` |

### 1.4 緊急アラート（例外カラー）

緊急アラートバナーのみ、安全上の理由で赤系カラーを使用する。

| 要素 | クラス |
|---|---|
| バナー背景 | `bg-red-50` |
| バナーボーダー | `border-red-300` |
| バナーテキスト | `text-red-900` / `text-red-700` |
| バナーラベル | `text-red-600` |
| バナーアイコン | `text-red-500` |
| バナーホバー | `hover:bg-red-100` |

**注意:** 緊急カードのスタイル（`border-red-400 bg-red-50`）は使用しない。緊急記事カードは通常カードと同じグレーボーダーで表示し、`Security` + `Incident` タグの色で識別する。

### 1.5 カラー使用ルール

**OK:**
- Topic / Format バッジに定義済みカラーを使う
- カテゴリセクション見出しのドット（●）に Topic カラーを使う
- 緊急アラートバナーに赤系を使う

**NG:**
- カード背景・ボーダーにカラーを付ける（緊急カード含む）
- アクションボタンのホバーにカラーを使う（blue/green/red → gray-900 に統一）
- 重要度スコアの星に黄色を使う（`text-gray-400` / `fill-gray-400` を使用）
- "Why it matters" セクションに黄色背景を使う（`bg-gray-50` / `border-gray-200` を使用）
- 定義外の新しいカラーを独自に追加する

---

## 2. タイポグラフィ

### 2.1 フォントファミリー

| 用途 | フォント | CSS変数 |
|---|---|---|
| 本文・UI | Geist Sans | `--font-geist-sans` |
| コード | Geist Mono | `--font-geist-mono` |

### 2.2 テキストスタイル

| 用途 | サイズ | ウェイト | 追加 |
|---|---|---|---|
| ページタイトル | `text-xl` | `font-bold` | — |
| セクションヘッダー | `text-sm` | `font-bold` | `uppercase tracking-wide` |
| 記事タイトル | `text-base` | `font-semibold` | `leading-snug` |
| 本文 | `text-sm` | normal | `leading-relaxed` |
| バッジ・ラベル | `text-xs` | `font-medium` | — |
| メタデータ | `text-xs` | normal | `text-gray-500` |
| ランキング番号 | `text-2xl` | `font-bold` | `text-gray-200 leading-none` |

### 2.3 テキスト処理

| パターン | クラス | 用途 |
|---|---|---|
| 1行切り詰め | `truncate` | カードタイトル（compact） |
| 複数行切り詰め | `line-clamp-2` | 要約テキスト |

---

## 3. コンポーネントパターン

### 3.1 カード

**共通スタイル:**
```
bg-white border border-gray-200 rounded-lg
hover: shadow-md border-gray-300
```

| バリアント | padding | 用途 |
|---|---|---|
| 通常 | `p-4` | Top Stories |
| コンパクト | `p-3` | カテゴリセクション |
| 展開 | `p-4` | 要約・Key Points 表示 |

**状態:**

| 状態 | スタイル |
|---|---|
| 既読 | `opacity-50` |
| 緊急 | 通常カードと同じ（タグで識別） |

### 3.2 バッジ・タグ

**カラーバッジ（Topic / Format）:**
```
text-xs px-2.5 py-1 rounded-full font-medium
+ TOPIC_COLORS[topic] または FORMAT_COLORS[format]
```

**言語タグ:**
```
Badge variant="outline"  （グレーボーダー）
```

### 3.3 ボタン

| バリアント | 用途 | 例 |
|---|---|---|
| `variant="ghost"` | ナビゲーション、アクションボタン | 保存、役立った |
| `variant="secondary"` | アクティブ状態のナビ | 現在のページ |
| `variant="outline"` | フィルター、ドロップダウン | 未読のみ |
| `variant="default"` | プライマリアクション | ログインボタン |

**アクションボタンのホバー:** すべて `hover:text-gray-900` に統一。

### 3.4 セクションヘッダー

```
text-sm font-bold text-gray-700 uppercase tracking-wide
```

カテゴリセクションの場合、左端に Topic カラーのドット（`w-2.5 h-2.5 rounded-full`）を付与。

---

## 4. スペーシング・レイアウト

### 4.1 コンテナ幅

| 画面 | 最大幅 |
|---|---|
| ダッシュボード | `max-w-7xl` |
| アーカイブ一覧 | `max-w-4xl` |
| 記事詳細 / 保存一覧 | `max-w-3xl` |

### 4.2 グリッド

| 画面 | デフォルト | sm: | lg: |
|---|---|---|---|
| ダッシュボード | 1カラム | — | `grid-cols-[1fr_280px]` |
| カテゴリカード | 1カラム | `grid-cols-2` | — |
| アーカイブ | 1カラム | `grid-cols-2` | `grid-cols-3` |

### 4.3 レスポンシブブレークポイント

| BP | 幅 | 主な変化 |
|---|---|---|
| デフォルト | < 640px | モバイルレイアウト |
| `sm:` | >= 640px | カードグリッド2列化、フィルタバー横並び |
| `md:` | >= 768px | ハンバーガー → インラインナビ |
| `lg:` | >= 1024px | 2カラムレイアウト、サイドバー表示 |

### 4.4 間隔

4px ベースの倍数体系。

| クラス | 値 | 主な用途 |
|---|---|---|
| `gap-1` / `gap-1.5` | 4px / 6px | バッジ間 |
| `gap-2` | 8px | カード内要素間 |
| `gap-3` | 12px | リスト項目間 |
| `gap-4` | 16px | セクション内パディング |
| `gap-6` | 24px | セクション間 |

### 4.5 タッチターゲット

WCAG 準拠の最小 44px。

| 要素 | モバイル | デスクトップ |
|---|---|---|
| ナビメニュー項目 | `h-11` (44px) | 通常 |
| アクションボタン | `h-11` (44px) | `h-8` (32px) |

---

## 5. CSS変数・テーマ

`globals.css` で OKLCH カラー空間の CSS 変数を定義。shadcn/ui のテーマシステムと統合。

- `:root` — ライトモード（現在のデフォルト）
- `.dark` — ダークモード（準備済み、未使用）
- `@theme inline` ブロックで Tailwind トークンにマッピング

Tailwind v4 の CSS ベース設定を使用（`tailwind.config.js` なし）。
