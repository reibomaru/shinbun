# PRD: AI / Web開発 Daily 情報アグリゲータ

## 1. 概要

### 1.1 プロダクト名（仮）
AI Tech Daily Aggregator

### 1.2 目的
- 生成AIおよびWeb開発領域の最新アップデートを取り逃さない
- 日々登場する有用ライブラリ・ツールの情報を体系的に蓄積する
- 日経新聞の一面のように、Dailyで全体像を俯瞰できる体験を提供する

### 1.3 成功指標（KPI）
- 毎日のダイジェストで「重要なアップデートを見逃さない」状態を実現
- 1日10分以内で主要トピックを把握できる
- 主要ツールのchangelog取り逃しゼロ

---

## 2. スコープ

### 2.1 対象領域
- 生成AI（LLM、エージェント、ツール、推論最適化など）
- Web開発（フロントエンド / バックエンド / DevTools）
- グローバル情報（英語・日本語中心）

### 2.2 対象情報源（MVP）

#### 必須
- GitHub Releases
- RSS（Zenn / Qiita / はてな / 企業ブログ）
- 主要ツールの公式Changelog
- YouTubeチャンネル（開発系）

#### 後回し
- X（API制約のためPhase2以降）
- Notion連携

---

## 3. 主要機能要件

## 3.1 Dailyダイジェスト

### 3.1.1 配信時間
- ユーザーが設定可能
- タイムゾーン対応
- デフォルト: JST 08:00

### 3.1.2 件数設定
- Top件数：ユーザー設定可能（例: 5 / 10）
- 全体件数：ユーザー設定可能（例: 20 / 30）

### 3.1.3 配信形式
- Webダッシュボード
- Slack通知

---

## 3.2 一面Webダッシュボード

### 3.2.1 レイアウト

#### 上段: Topセクション
- 重要度順
- ユーザー設定件数

#### 中段: カテゴリ別セクション
- GenAI
- Frontend
- Backend
- Tools / DevTools

#### 右カラム: Release / Changelog専用列
- 公式アップデートのみ表示

### 3.2.2 各カード表示項目
- タイトル
- Short要約（1〜2行）
- ラベル（topic / format）
- 発行元
- 公開日時
- 保存ボタン

### 3.2.3 詳細表示
- Medium要約
- Key Points（3つ）
- Why it matters（重要性理由）
- 関連アイテム
- 関連エンティティ

---

## 3.3 Changelog監視対象（初期設定）

### 必須
- claude code

### 推奨追加候補
- OpenAI API
- Anthropic API
- Vercel
- Next.js
- React
- Supabase
- LangChain
- LlamaIndex
- Cloudflare Workers
- GitHub Copilot

※ 管理画面からノーコードで追加可能にする

---

## 4. データ設計

## 4.1 主なテーブル

### source
- id
- type (github_repo / rss / youtube_channel / changelog)
- config (JSON)
- polling_interval
- enabled

### raw_event
- id
- source_id
- external_id
- payload (JSON)
- content_hash
- fetched_at

### item
- id
- item_type (release / article / video)
- title
- url
- published_at
- language
- summary_short
- summary_medium
- importance_score
- importance_reason
- status

### entity
- id
- entity_type (library / model / company / repo)
- name
- official_url

### item_entity
- item_id
- entity_id
- role
- confidence

### embedding
- item_id
- vector
- embedding_model

---

## 5. LLM処理仕様

### 5.1 要約生成
- Short（1〜2行）
- Medium（3〜5行）
- Key Points（箇条書き3つ）
- Why it matters（1行）

### 5.2 ラベル付け
- topic（genai / frontend / backend / devtools 等）
- format（release / tutorial / benchmark / incident 等）
- difficulty（beginner / intermediate / advanced）

### 5.3 エンティティ抽出
- ライブラリ名
- モデル名
- 会社
- リポジトリ

### 5.4 重要度スコアリング
スコアは以下を基準に算出：
- ソース重み（公式 > GitHub > 大手ブログ > 個人ブログ > SNS）
- 鮮度
- スター数 / 影響度
- ユーザー閲覧履歴（将来的に）

---

## 6. 通知仕様（Slack）

### Daily Digest
- Top N
- カテゴリ別ハイライト
- Webへのリンク

### Release Alert（将来）
- watch対象エンティティの更新を即時通知

---

## 7. 情報源追加仕様

### 管理画面で追加可能
- RSS URL貼り付け
- GitHub repo指定
- YouTube channel指定
- Changelog URL指定

開発なしで拡張可能な設計とする

---

## 8. 非機能要件

- 再処理可能なRawデータ保存
- 重複排除（ハッシュ＋意味類似度）
- スケーラブルな構成
- 将来的なX連携を想定した拡張性

---

## 9. MVP範囲

### Phase 1
- RSS + GitHub Releases
- Web一面UI
- Daily Slack通知
- claude code監視

### Phase 2
- YouTube追加
- 意味検索
- クラスタリング

### Phase 3
- X連携
- パーソナライズ
- Notion連携

---

## 10. 今後の拡張構想

- レコメンドエンジン
- 保存記事の自動整理
- 週次レポート自動生成
- トレンド可視化ダッシュボード

---

End of PRD v1

