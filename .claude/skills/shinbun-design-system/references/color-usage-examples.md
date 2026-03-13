# カラー使用例リファレンス

このファイルは、デザインシステムのカラールールの具体的なOK/NGパターンを示す。
迷った場合はこのファイルを参照すること。

---

## OK パターン

### Topic バッジ
```tsx
<span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
  GenAI
</span>
```

### Format バッジ
```tsx
<span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">
  Release
</span>
```

### カテゴリセクションのドット
```tsx
<div className="flex items-center gap-2">
  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">GenAI</h2>
  <span className="text-xs text-gray-500">12件</span>
</div>
```

### 緊急アラートバナー（唯一の例外）
```tsx
<div className="bg-red-50 border border-red-300 rounded-lg p-4">
  <span className="text-red-600 font-bold text-xs">緊急アラート</span>
  <p className="text-red-900 font-semibold">...</p>
  <p className="text-red-700 text-sm">...</p>
</div>
```

### カード（正しいグレースケール）
```tsx
<Card className="cursor-pointer transition-all hover:shadow-md hover:border-gray-300">
  <CardContent className="p-4">
    {/* ... */}
  </CardContent>
</Card>
```

### アクションボタン（グレー統一）
```tsx
<Button variant="ghost" size="sm" className="h-11 sm:h-8 text-xs text-gray-500 hover:text-gray-900">
  <Bookmark className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
  保存
</Button>
```

### 重要度スコア（グレー）
```tsx
<div className="flex items-center gap-1">
  <Star className="w-3 h-3 text-gray-400 fill-gray-400" />
  <span className="text-xs font-medium text-gray-700">85</span>
</div>
```

### "Why it matters" セクション（グレー背景）
```tsx
<div className="bg-gray-50 border border-gray-200 rounded-md p-3">
  <p className="text-xs font-semibold text-gray-700 mb-1">Why it matters</p>
  <p className="text-sm text-gray-600">...</p>
</div>
```

### カテゴリフィルターボタン（グレースケール + ドット）
```tsx
// アクティブ状態: secondary バリアント + カテゴリドットで色を補助
<Button variant="secondary" size="sm" className="rounded-full text-xs font-medium">
  <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
  GenAI
</Button>

// 非アクティブ状態: outline バリアント + カテゴリドット
<Button variant="outline" size="sm" className="rounded-full text-xs font-medium">
  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
  Frontend
</Button>

// 「すべて」ボタン（ドットなし）
<Button variant={isActive ? "secondary" : "outline"} size="sm" className="rounded-full text-xs font-medium">
  すべて
</Button>
```

### 成功メッセージ（グレー + アイコン）
```tsx
<span className="text-sm text-gray-700 flex items-center gap-1">
  <Check className="w-4 h-4" />
  保存しました
</span>
```

### エラーメッセージ（グレー + アイコン）
```tsx
<span className="text-sm text-gray-700 flex items-center gap-1">
  <AlertCircle className="w-4 h-4" />
  エラーが発生しました
</span>
```

### フォームバリデーションエラー（唯一の赤テキスト許容）
```tsx
<p className="text-xs text-red-500 mt-1">
  少なくとも1つのカテゴリを選択してください
</p>
```

### カテゴリ選択カード（設定画面等）
```tsx
// グレースケールの選択状態 + バッジで色を表示
<div className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
  isSelected
    ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
}`}>
  <Checkbox checked={isSelected} onCheckedChange={onToggle} />
  <Label className="font-medium text-gray-900">GenAI</Label>
  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
    GenAI
  </span>
</div>
```

---

## NG パターン（やりがちな間違い）

### NG: カードに色付きボーダー
```tsx
// NG: 緊急カードでも色付きボーダーは使わない
<Card className="border-red-400 bg-red-50">

// OK: 通常のグレーボーダー。Security + Incident タグの色で識別する
<Card className="border-gray-200 bg-white">
```

### NG: ボタンホバーにカラー
```tsx
// NG
<Button className="text-gray-500 hover:text-blue-600">保存</Button>
<Button className="text-gray-500 hover:text-green-600">役立った</Button>
<Button className="text-gray-500 hover:text-red-500">不要</Button>

// OK: すべて gray-900 に統一
<Button className="text-gray-500 hover:text-gray-900">保存</Button>
<Button className="text-gray-500 hover:text-gray-900">役立った</Button>
<Button className="text-gray-500 hover:text-gray-900">不要</Button>
```

### NG: 星に黄色
```tsx
// NG
<Star className="text-yellow-400 fill-yellow-400" />
<Star className="text-amber-400 fill-amber-400" />

// OK
<Star className="text-gray-400 fill-gray-400" />
```

### NG: "Why it matters" に黄色背景
```tsx
// NG
<div className="bg-amber-50 border border-amber-200">
<div className="bg-yellow-50 border border-yellow-200">
<div className="bg-gradient-to-r from-amber-50 to-orange-50">

// OK
<div className="bg-gray-50 border border-gray-200">
```

### NG: フィルターボタンにカテゴリカラーを直接使用
```tsx
// NG: ボタン自体がカテゴリカラーで塗られている
<Button className="bg-purple-600 text-white hover:bg-purple-700">GenAI</Button>
<Button className="bg-purple-100 text-purple-700 ring-2 ring-purple-500">GenAI</Button>

// OK: グレースケール + ドットで色を補助
<Button variant="secondary" className="rounded-full">
  <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
  GenAI
</Button>
```

### NG: 成功/エラーメッセージにカラーテキスト
```tsx
// NG
<span className="text-green-600">保存しました</span>
<span className="text-red-500">エラーが発生しました</span>

// OK: グレー + アイコン
<span className="text-gray-700"><Check className="w-4 h-4" /> 保存しました</span>
<span className="text-gray-700"><AlertCircle className="w-4 h-4" /> エラーが発生しました</span>
```

### NG: カテゴリ選択ボタンにカテゴリカラーの active 状態
```tsx
// NG: 選択状態をカテゴリカラーで表現
<button className={isSelected ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-700"}>
  GenAI
</button>

// OK: 選択状態はグレースケール、カテゴリの識別はバッジで
<div className={isSelected ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900" : "border-gray-200"}>
  <Checkbox checked={isSelected} />
  <span>GenAI</span>
  <span className="bg-purple-100 text-purple-700 rounded-full px-2.5 py-1 text-xs font-medium">GenAI</span>
</div>
```

### NG: 独自カラーの追加
```tsx
// NG: 定義外のカラーを追加する
const NEW_COLORS = {
  premium: "bg-gold-100 text-gold-700",  // 存在しない
  trending: "bg-pink-100 text-pink-700", // 定義外
};

// OK: 既存の Topic/Format カラーのみ使用
```
