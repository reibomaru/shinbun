---
name: shinbun-design-system
description: AI Tech Daily（Shinbun）プロジェクトのデザインシステムガイド。UIコンポーネントの作成・修正、スタイリング、レイアウト実装時に必ず使うこと。カラー、タイポグラフィ、スペーシング、コンポーネントパターンの仕様を提供する。フロントエンドの見た目に関わる作業（新しい画面の作成、既存コンポーネントの修正、カードやバッジの追加、レスポンシブ対応、色やフォントの調整）では常にこのスキルをトリガーすること。mock/ や frontend/ ディレクトリのコンポーネントを触る場合も対象。
---

# Shinbun デザインシステムスキル

このスキルは AI Tech Daily（Shinbun）プロジェクトのデザインシステムに準拠したUI実装を行うためのガイドライン。

UI実装時は、このスキルのルールに加えて、プロジェクト内の詳細設計書も参照すること：
- **デザインシステム全体:** `docs/design-system.md`
- **画面レイアウト仕様:** `docs/ui_screen_design.md`
- **ビジュアルリファレンス:** `docs/design-system.html`（ブラウザで開いて視覚的に確認できる）
- **カラーOK/NGパターン集:** このスキルの `references/color-usage-examples.md`（迷ったら必ず参照）

---

## 最重要ルール：カラーの使い方

このデザインシステムで最も間違えやすいポイントがカラーの使い方。以下を必ず守ること。

### カラーを使っていい場所（ホワイトリスト方式）

色を使えるのは以下の **4つだけ**。それ以外はすべてグレースケール。

1. **Topic バッジ** — `bg-{color}-100 text-{color}-700` の pill 型バッジ
2. **Format バッジ** — 同上
3. **カテゴリセクションのドット（●）** — `bg-{color}-500` の小さな丸
4. **緊急アラートバナー** — 赤系（`bg-red-50 border-red-300`）。安全上の視認性のため

### よくある間違い（これらは全てグレースケールにすること）

| やりがちなこと | 正しい実装 |
|---|---|
| ボタンのホバーに `hover:text-blue-600` 等 | `hover:text-gray-900` に統一 |
| 重要度の星に `text-amber-400 fill-amber-400` | `text-gray-400 fill-gray-400` |
| "Why it matters" に `bg-amber-50 border-amber-200` | `bg-gray-50 border-gray-200` |
| 緊急カードに `border-red-400 bg-red-50` | 通常カードと同じ。タグで識別 |
| 成功メッセージに `text-green-600` | `text-gray-700`（下記「フィードバック色」参照） |
| フィルターボタンのアクティブ状態に `bg-purple-600` | グレースケールで表現（下記参照） |

### フィルター・トグル等のインタラクティブUI要素

カテゴリフィルターやトグルボタンなど「バッジではないがカテゴリを表現するUI」では、**アクティブ/非アクティブをグレースケールで表現**する。カテゴリの色はボタン内のバッジやドットで補助的に示す。

```tsx
// OK: フィルターボタン — グレースケール + ドットで色を補助
<Button
  variant={isActive ? "secondary" : "outline"}
  className="rounded-full text-xs font-medium"
>
  <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
  GenAI
</Button>

// NG: ボタン自体にカテゴリカラーを使う
<Button className="bg-purple-600 text-white">GenAI</Button>
<Button className="bg-purple-100 text-purple-700 ring-2 ring-purple-500">GenAI</Button>
```

### フィードバック色（成功・エラー等の状態表示）

操作結果のフィードバック表示もグレースケール基調にする。ユーザーが直感的に理解できるよう、アイコンで補助する。

```tsx
// OK: 成功メッセージ — グレー + チェックアイコン
<span className="text-sm text-gray-700 flex items-center gap-1">
  <Check className="w-4 h-4" />
  保存しました
</span>

// OK: エラーメッセージ — グレー + 注意アイコン
<span className="text-sm text-gray-700 flex items-center gap-1">
  <AlertCircle className="w-4 h-4" />
  エラーが発生しました
</span>

// NG
<span className="text-green-600">保存しました</span>
<span className="text-red-500">エラーが発生しました</span>
```

唯一の例外: フォームのバリデーションエラーは `text-red-500` を許容する（入力フィールド直下の短いエラーメッセージのみ）。

### カテゴリ選択UI（設定画面等での複数選択）

設定画面などでカテゴリを複数選択するUIでは、選択状態の表現にグレースケールを使い、カテゴリの識別にはバッジを併用する。

```tsx
// OK: 選択カード — グレースケール + バッジで色を表示
<div className={`rounded-lg border p-4 ${
  isSelected ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900" : "border-gray-200"
}`}>
  <Checkbox checked={isSelected} />
  <span className="font-medium text-gray-900">GenAI</span>
  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
    GenAI
  </span>
</div>

// NG: 選択状態にカテゴリカラーを使う
<button className={isSelected ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-700"}>
```

---

## カラートークン

### Topic カラー（5色）— バッジ＋カテゴリドットに使用

```typescript
const TOPIC_COLORS: Record<string, string> = {
  genai:    "bg-purple-100 text-purple-700",   // ドット: bg-purple-500
  frontend: "bg-blue-100 text-blue-700",       // ドット: bg-blue-500
  backend:  "bg-green-100 text-green-700",     // ドット: bg-green-500
  devtools: "bg-orange-100 text-orange-700",   // ドット: bg-orange-500
  security: "bg-red-100 text-red-700",         // ドット: bg-red-500
};
```

### Format カラー（5色）— バッジにのみ使用

```typescript
const FORMAT_COLORS: Record<string, string> = {
  release:      "bg-emerald-100 text-emerald-700",
  tutorial:     "bg-sky-100 text-sky-700",
  benchmark:    "bg-amber-100 text-amber-700",
  incident:     "bg-red-100 text-red-700",
  announcement: "bg-violet-100 text-violet-700",
};
```

### グレースケールベース — タグ以外の全UI要素

| 用途 | クラス |
|---|---|
| テキスト Primary | `text-gray-900`（タイトル、見出し） |
| テキスト Secondary | `text-gray-700`（本文、セクションヘッダー） |
| テキスト Tertiary | `text-gray-500`（ソース名、日時、メタデータ） |
| テキスト Disabled | `text-gray-400`（アイコン初期状態） |
| 背景 Surface | `bg-white`（カード、ページ背景） |
| 背景 Subtle | `bg-gray-50`（入力フィールド、セクション背景） |
| ボーダー | `border-gray-200`（カード枠線、区切り線） |
| ボーダー（強調） | `border-gray-300`（ホバー時） |
| アクション hover | `text-gray-900` / `hover:text-gray-900` |

---

## タイポグラフィ

フォント: **Geist Sans**（UI）/ **Geist Mono**（コード）

| 用途 | サイズ | ウェイト | 追加クラス |
|---|---|---|---|
| ページタイトル | `text-xl` | `font-bold` | — |
| セクションヘッダー | `text-sm` | `font-bold` | `uppercase tracking-wide text-gray-700` |
| 記事タイトル | `text-base` | `font-semibold` | `leading-snug text-gray-900` |
| 本文 | `text-sm` | normal | `leading-relaxed` |
| バッジ・ラベル | `text-xs` | `font-medium` | — |
| メタデータ | `text-xs` | normal | `text-gray-500` |

テキスト処理：
- 1行切り詰め: `truncate`
- 複数行切り詰め: `line-clamp-2`

---

## コンポーネントパターン

### カード
```
共通: bg-white border border-gray-200 rounded-lg
ホバー: hover:shadow-md hover:border-gray-300
通常: p-4 / コンパクト: p-3
既読: opacity-50
緊急: 通常カードと同じ（カラーボーダーは使わない。タグで識別）
```

### バッジ（カラー）
```
text-xs px-2.5 py-1 rounded-full font-medium + TOPIC_COLORS[topic] or FORMAT_COLORS[format]
```

### バッジ（言語タグ）
```tsx
<Badge variant="outline">{language}</Badge>
```

### ボタン
| variant | 用途 |
|---|---|
| `ghost` | ナビゲーション、アクションボタン |
| `secondary` | アクティブ状態のナビ、選択済みフィルター |
| `outline` | フィルター、ドロップダウン |
| `default` | プライマリアクション（ログイン、保存等） |

### セクションヘッダー
```
text-sm font-bold text-gray-700 uppercase tracking-wide
```
カテゴリの場合、左端にドット: `w-2.5 h-2.5 rounded-full bg-{topic}-500`

### フォーム要素
shadcn/ui の標準コンポーネントを優先して使うこと:
- ラジオ選択: `RadioGroup` + `RadioGroupItem`
- チェックボックス: `Checkbox`
- テキスト入力: `Input`
- ラベル: `Label`

カスタムUIを一から作るのではなく、shadcn/ui コンポーネントをベースにスタイリングする。

---

## レイアウト・スペーシング

### コンテナ幅
| 画面 | 最大幅 |
|---|---|
| ダッシュボード | `max-w-7xl` |
| アーカイブ一覧 | `max-w-4xl` |
| 記事詳細 / 保存一覧 | `max-w-3xl` |
| 設定等のフォーム画面 | `max-w-3xl` |

### グリッド
| 画面 | デフォルト | sm: | lg: |
|---|---|---|---|
| ダッシュボード | 1列 | — | `grid-cols-[1fr_280px]` |
| カテゴリカード | 1列 | `grid-cols-2` | — |
| アーカイブ | 1列 | `grid-cols-2` | `grid-cols-3` |

### レスポンシブ（モバイルファースト）
| BP | 幅 | 変化 |
|---|---|---|
| default | < 640px | モバイル |
| `sm:` | >= 640px | カード2列化 |
| `md:` | >= 768px | ハンバーガー → インラインナビ |
| `lg:` | >= 1024px | 2カラム + サイドバー |

### 間隔（4px ベース）
| クラス | 用途 |
|---|---|
| `gap-1` / `gap-1.5` | バッジ間 |
| `gap-2` | カード内要素間 |
| `gap-3` | リスト項目間、フォーム項目間 |
| `gap-4` | セクション内パディング |
| `gap-6` | セクション間 |

### タッチターゲット（WCAG 44px）
| 要素 | モバイル | デスクトップ |
|---|---|---|
| ナビ項目 | `h-11` | 通常 |
| アクションボタン | `h-11` | `h-8` |

---

## 技術スタック

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **shadcn/ui** (new-york スタイル) + **Tailwind CSS v4** + **Lucide Icons**
- クライアントコンポーネントは先頭に `"use client"` を記述
- パスエイリアス: `@/`（例: `@/components/Header`）
- CSS変数は OKLCH カラー空間（`globals.css` で定義）

---

## 既存コードの既知の違反

現在のコードベースには以下のデザインシステム違反が残っている。新規実装ではこれらを踏襲せず、正しいパターンを使うこと。修正タスクが来た場合はこれらも合わせて修正する。

| ファイル | 違反内容 | 正しい実装 |
|---|---|---|
| `mock/components/ArticleCard.tsx` L55 | 緊急カードに `border-red-400 bg-red-50` | 通常のグレーボーダー |
| `mock/components/ArticleCard.tsx` L93-97 | "Why it matters" に `bg-amber-50 border-amber-200` | `bg-gray-50 border-gray-200` |
| `mock/components/ArticleCard.tsx` L113 | 星に `text-amber-400 fill-amber-400` | `text-gray-400 fill-gray-400` |
| `mock/components/ArticleCard.tsx` L121-133 | ボタンホバーに `hover:text-blue-600` 等 | `hover:text-gray-900` |

---

## 実装時のチェックリスト

新しいコンポーネントやページを作成する前に確認すること：

1. **カラー:** バッジ/ドット/緊急バナー以外に色を使っていないか？（フィルター、ボタン、星、背景、ホバー含む）
2. **インタラクティブ要素:** フィルターやトグルの選択状態をグレースケール + ドット/バッジで表現しているか？
3. **フィードバック:** 成功/エラーメッセージにカラーではなくアイコンを使っているか？
4. **タイポグラフィ:** テキスト階層（xl → base → sm → xs）が正しいか？
5. **スペーシング:** 4px ベースの倍数（gap-1〜gap-6）を使っているか？
6. **レスポンシブ:** モバイルファースト → sm: → md: → lg: の順か？
7. **コンポーネント:** shadcn/ui の標準コンポーネント（RadioGroup, Checkbox等）を活用しているか？
8. **タッチターゲット:** モバイルで h-11 (44px) を確保しているか？
9. **既知の違反:** 既存コードの違反パターンを踏襲していないか？（上記テーブル参照）

画面ごとの詳細レイアウトは `docs/ui_screen_design.md` を参照すること。
