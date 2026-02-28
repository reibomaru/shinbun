# PRD: AI / Web開発 Daily 情報アグリゲータ v2

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
- LLM処理コストが月額予算内に収まる（目標: $30以下/月）
- ユーザーの「役に立った」フィードバック率 > 60%

### 1.4 競合との差別化
| サービス | 特徴 | 本プロダクトとの違い |
|---|---|---|
| Feedly | 汎用RSSリーダー | AI要約・重要度スコアリングなし |
| daily.dev | 開発者向けニュース | GenAI領域の深さ不足、Changelog監視なし |
| TLDR Newsletter | メール配信 | パーソナライズ不可、情報源追加不可 |
| 本プロダクト | AI特化+Changelog監視+パーソナライズ | — |

---

## 2. スコープ

### 2.1 対象領域
- 生成AI（LLM、エージェント、ツール、推論最適化など）
- Web開発（フロントエンド / バックエンド / DevTools）
- グローバル情報（英語・日本語中心）

### 2.2 対象情報源

#### Phase 1（MVP）
| 情報源 | ポーリング間隔 | 優先度 |
|---|---|---|
| GitHub Releases（監視対象リポジトリ） | 1時間 | 必須 |
| RSS（Zenn / Qiita / はてな / 企業ブログ） | 1時間 | 必須 |
| 主要ツールの公式Changelog | 6時間 | 必須 |
| Hacker News（Top / Best） | 30分 | 必須 |

#### Phase 2
| 情報源 | ポーリング間隔 | 優先度 |
|---|---|---|
| YouTubeチャンネル（開発系） | 6時間 | 推奨 |
| Reddit（r/MachineLearning, r/webdev） | 1時間 | 推奨 |
| arXiv（cs.AI, cs.CL） | 12時間 | 推奨 |

#### Phase 3
- X（API制約のため後回し）
- Notion連携

### 2.3 多言語対応方針
- 英語記事 → 日本語で要約を生成（デフォルト）
- 日本語記事 → 日本語のまま要約
- ダッシュボード表示言語: 日本語
- 原文リンクは常に保持

---

## 3. 主要機能要件

## 3.1 Dailyダイジェスト

### 3.1.1 配信時間
- ユーザーが設定可能
- タイムゾーン対応
- デフォルト: JST 08:00

### 3.1.2 件数設定
- Top件数：ユーザー設定可能（デフォルト: 5）
- 全体件数：ユーザー設定可能（デフォルト: 20）

### 3.1.3 配信形式
- Slack通知（Phase 1のメイン配信手段）
- Webダッシュボード（Phase 1後半〜）

---

## 3.2 Slack通知（Phase 1 メイン）

### 3.2.1 Daily Digest
- Top N件の要約付きリスト
- カテゴリ別ハイライト（GenAI / Frontend / Backend / Tools）
- 各項目に原文リンク
- 「詳細を見る」でWebダッシュボードへ遷移（Web実装後）

### 3.2.2 緊急アラート（Phase 1から実装）
以下に該当するものはDaily Digestを待たずリアルタイム通知:
- **セキュリティアドバイザリ**（CVE、脆弱性情報）
- **Breaking Change**を含むメジャーリリース
- ウォッチリスト対象のリリース

### 3.2.3 フィードバック機能
各通知に以下のリアクションボタンを付与:
- 👍 役に立った
- 👎 不要だった
- 🔖 後で読む（保存）

---

## 3.3 一面Webダッシュボード

### 3.3.1 レイアウト

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

### 3.3.2 各カード表示項目
- タイトル
- Short要約（1〜2行）
- ラベル（topic / format）
- 発行元
- 公開日時
- 言語バッジ（EN / JA）
- 保存ボタン
- フィードバックボタン（👍 / 👎）

### 3.3.3 詳細表示
- Medium要約
- Key Points（3つ）
- Why it matters（重要性理由）
- 関連アイテム
- 関連エンティティ
- 既読/未読ステータス

### 3.3.4 既読管理
- 一覧画面でクリック済みアイテムをグレーアウト
- 「未読のみ表示」フィルタ
- 既読状態はユーザー単位で保持

---

## 3.4 保存機能

### 3.4.1 保存一覧
- 保存したアイテムの一覧ページ
- 日付順 / カテゴリ別の表示切り替え

### 3.4.2 タグ付け
- ユーザー定義タグ（自由入力）
- 自動タグ候補の提示（LLMラベルを流用）

### 3.4.3 データエクスポート（Phase 2）
- Markdown形式でエクスポート
- Notion連携（Phase 3）

---

## 3.5 ウォッチリスト（関心トピック設定）

### 3.5.1 概要
ユーザーが特に関心のあるエンティティ・トピックを登録し、スコアリングや通知に反映する。

### 3.5.2 登録対象
- ライブラリ / フレームワーク（例: Next.js, LangChain）
- 企業 / プロジェクト（例: Anthropic, OpenAI）
- トピックキーワード（例: "RAG", "Edge Runtime"）

### 3.5.3 ウォッチリストの効果
- 該当アイテムの重要度スコアにブースト（+20%）
- 緊急アラートの対象になる
- Daily Digestで優先表示

---

## 3.6 Changelog監視対象（初期設定）

### 必須
- Claude Code

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
- Cursor

※ 管理画面からノーコードで追加可能にする

---

## 4. データ設計

## 4.1 主なテーブル

### source
| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| type | ENUM | github_repo / rss / youtube_channel / changelog / hackernews / reddit / arxiv |
| name | TEXT | 表示名 |
| config | JSONB | ソース固有の設定 |
| polling_interval | INTEGER | ポーリング間隔（秒） |
| enabled | BOOLEAN | 有効/無効 |
| last_fetched_at | TIMESTAMP | 最終取得日時 |
| last_error | TEXT | 最終エラーメッセージ |
| error_count | INTEGER | 連続エラー回数 |
| created_at | TIMESTAMP | 作成日時 |

### raw_event
| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| source_id | UUID | FK → source |
| external_id | TEXT | 外部サービス側のID |
| payload | JSONB | 生データ |
| content_hash | TEXT | 重複排除用ハッシュ |
| fetched_at | TIMESTAMP | 取得日時 |
| processed | BOOLEAN | 処理済みフラグ |

### item
| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| raw_event_id | UUID | FK → raw_event |
| item_type | ENUM | release / article / video / paper / changelog |
| title | TEXT | タイトル |
| url | TEXT | 原文URL |
| url_normalized | TEXT | 正規化済みURL（重複検知用） |
| published_at | TIMESTAMP | 公開日時 |
| language | TEXT | 原文言語 (en / ja) |
| summary_short | TEXT | 短い要約（1-2行） |
| summary_medium | TEXT | 中程度の要約（3-5行） |
| key_points | JSONB | キーポイント（3つ） |
| why_it_matters | TEXT | 重要性理由（1行） |
| importance_score | FLOAT | 重要度スコア（0-100） |
| importance_reason | TEXT | スコア算出理由 |
| is_urgent | BOOLEAN | 緊急アラート対象か |
| status | ENUM | pending / processed / archived |
| llm_model_used | TEXT | 処理に使用したモデル |
| llm_cost | FLOAT | 処理コスト（USD） |
| created_at | TIMESTAMP | 作成日時 |

### item_label
| カラム | 型 | 説明 |
|---|---|---|
| item_id | UUID | FK → item |
| label_type | ENUM | topic / format / difficulty |
| label_value | TEXT | ラベル値 |

### entity
| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| entity_type | ENUM | library / model / company / repo |
| name | TEXT | 正式名称 |
| aliases | JSONB | 別名リスト |
| official_url | TEXT | 公式URL |

### item_entity
| カラム | 型 | 説明 |
|---|---|---|
| item_id | UUID | FK → item |
| entity_id | UUID | FK → entity |
| role | TEXT | 関連の種類 |
| confidence | FLOAT | 確信度 |

### embedding
| カラム | 型 | 説明 |
|---|---|---|
| item_id | UUID | FK → item |
| vector | VECTOR(1536) | 埋め込みベクトル |
| embedding_model | TEXT | 使用モデル |

### user_preference
| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → user |
| digest_time | TIME | 配信時間 |
| timezone | TEXT | タイムゾーン |
| top_count | INTEGER | Top表示件数 |
| total_count | INTEGER | 全体表示件数 |

### user_watchlist
| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → user |
| target_type | ENUM | entity / keyword |
| target_value | TEXT | エンティティIDまたはキーワード |
| notify_realtime | BOOLEAN | リアルタイム通知するか |

### user_saved_item
| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → user |
| item_id | UUID | FK → item |
| tags | JSONB | ユーザー定義タグ |
| saved_at | TIMESTAMP | 保存日時 |

### user_read_status
| カラム | 型 | 説明 |
|---|---|---|
| user_id | UUID | FK → user |
| item_id | UUID | FK → item |
| read_at | TIMESTAMP | 閲覧日時 |

### user_feedback
| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → user |
| item_id | UUID | FK → item |
| feedback_type | ENUM | helpful / not_helpful / saved |
| created_at | TIMESTAMP | 作成日時 |

### 4.2 データ保持ポリシー
| データ | 保持期間 | アーカイブ先 |
|---|---|---|
| raw_event | 30日 | S3 / GCS（冷蔵ストレージ） |
| item | 無期限 | — |
| embedding | 90日（検索頻度で延長） | 削除 |
| user_read_status | 90日 | 削除 |
| user_feedback | 無期限 | — |

---

## 5. LLM処理仕様

### 5.1 処理パイプライン（段階的フィルタリング）

```
情報取得
  ↓
[Stage 1] ルールベースフィルタ（コスト: $0）
  - content_hashによる完全重複排除
  - URL正規化による重複排除
  - ソースごとの最低品質フィルタ（例: HN score > 10）
  ↓
[Stage 2] 軽量LLM分類（Haiku）
  - 関連度判定（AI/Web開発に関係あるか）
  - 基本ラベル付け（topic / format）
  - 緊急度判定（セキュリティ / Breaking Change）
  ↓ 関連度が高いもののみ通過
[Stage 3] 高品質LLM処理（Sonnet）
  - 要約生成（Short / Medium / Key Points / Why it matters）
  - エンティティ抽出
  - 重要度スコアリング
  ↓
[Stage 4] 埋め込み生成
  - 意味的重複排除（類似度 > 0.92 → マージ）
  - 関連アイテム紐付け
```

### 5.2 モデル使い分け

| 処理 | モデル | 想定コスト/件 |
|---|---|---|
| 関連度フィルタ・分類 | Claude Haiku | ~$0.001 |
| 要約・スコアリング | Claude Sonnet | ~$0.01 |
| 埋め込み生成 | Voyage AI / OpenAI | ~$0.0001 |

### 5.3 コスト試算（月額）

| 項目 | 想定件数/日 | 通過率 | 処理件数/日 | 単価 | 月額 |
|---|---|---|---|---|---|
| Stage 1 通過 | 500 | 80% | 400 | — | $0 |
| Stage 2 Haiku | 400 | 50% | 400 | $0.001 | $12 |
| Stage 3 Sonnet | 200 | — | 200 | $0.01 | $60 |
| Stage 4 埋め込み | 200 | — | 200 | $0.0001 | $0.6 |
| **合計** | | | | | **~$73** |

※ Sonnet処理件数を絞る（上位100件のみ等）ことで$30-40に抑制可能

### 5.4 コスト管理
- 日次のLLMコストを`item.llm_cost`に記録
- 日次コストが閾値（$5）を超えた場合、管理者にアラート
- 月次予算超過時はStage 3をHaikuにフォールバック

### 5.5 要約生成
- Short（1〜2行）
- Medium（3〜5行）
- Key Points（箇条書き3つ）
- Why it matters（1行）
- 英語記事は日本語で要約を生成

### 5.6 ラベル付け
- topic（genai / frontend / backend / devtools / infra / security）
- format（release / tutorial / benchmark / incident / paper / announcement）
- difficulty（beginner / intermediate / advanced）

### 5.7 エンティティ抽出
- ライブラリ名
- モデル名
- 会社
- リポジトリ
- entityテーブルのaliasesとマッチングし、既存エンティティに紐付け

### 5.8 重要度スコアリング（0-100）

#### ベーススコア算出
| 要素 | 重み | 説明 |
|---|---|---|
| ソース信頼度 | 30% | 公式(1.0) > GitHub(0.8) > 大手ブログ(0.6) > 個人ブログ(0.4) > SNS(0.2) |
| 鮮度 | 20% | 24h以内(1.0)、48h(0.7)、1週間(0.3) |
| エンゲージメント | 20% | スター数 / HNスコア / はてブ数（正規化） |
| コンテンツ品質 | 30% | LLMによる品質判定（独自性、深さ、実用性） |

#### スコア補正
- ウォッチリスト対象: +20%
- セキュリティ関連: +15%
- Breaking Change: +10%
- ユーザーフィードバック反映（将来）: 「役に立った」率が高いソース/トピックをブースト

---

## 6. 重複排除仕様

### 6.1 多段重複排除

| レイヤー | 手法 | タイミング |
|---|---|---|
| 完全一致 | content_hash（SHA-256） | Stage 1 |
| URL一致 | url_normalized（クエリパラメータ除去、www統一、末尾スラッシュ統一） | Stage 1 |
| タイトル類似 | タイトル正規化+Levenshtein距離 < 0.2 | Stage 2 |
| 意味的重複 | embedding cosine similarity > 0.92 | Stage 4 |

### 6.2 マージ処理
意味的に重複するアイテムが検出された場合:
- より信頼度の高いソースを「プライマリ」とする
- 他ソースの情報は「関連ソース」として紐付け
- 複数ソースで言及されている事実はスコアをブースト

---

## 7. 情報源追加仕様

### 管理画面で追加可能
- RSS URL貼り付け
- GitHub repo指定（owner/repo形式）
- YouTube channel指定
- Changelog URL指定
- ポーリング間隔のカスタマイズ

開発なしで拡張可能な設計とする

---

## 8. 非機能要件

### 8.1 データ
- 再処理可能なRawデータ保存（30日間）
- 重複排除（多段方式: Section 6参照）
- スケーラブルな構成（キュー+ワーカー方式）
- 将来的なX連携を想定した拡張性

### 8.2 エラーハンドリング・監視

#### ソースフェッチ障害
- 指数バックオフによるリトライ（最大5回、間隔: 1min → 2min → 4min → 8min → 16min）
- 連続エラー5回でソースを自動無効化し、管理者にアラート
- source.last_error / error_count で状態追跡

#### LLM API障害
- プライマリモデル障害時のフォールバック:
  - Sonnet → Haiku（品質低下を許容し配信継続）
  - Haiku → ルールベース分類のみ（要約なしで配信）
- APIレートリミット対策: キューイングで処理を平準化

#### 監視項目
| 項目 | 閾値 | アクション |
|---|---|---|
| ソースフェッチ失敗率 | > 20% | 管理者Slackアラート |
| LLM処理エラー率 | > 10% | フォールバック切り替え |
| 日次LLMコスト | > $5 | 管理者アラート |
| Daily Digest未配信 | 配信時刻+30分 | 管理者アラート |
| キュー滞留 | > 1時間 | ワーカースケールアップ |

### 8.3 セキュリティ
- APIキーは環境変数で管理（コードに含めない）
- 外部データの表示時はサニタイズ処理
- 管理画面へのアクセス制限

---

## 9. 技術スタック

| レイヤー | 技術 | 理由 |
|---|---|---|
| フロントエンド | Next.js (App Router) | SSR対応、React Server Components |
| UIライブラリ | shadcn/ui + Tailwind CSS | 高速開発、カスタマイズ性 |
| バックエンド | Next.js API Routes + Cron | フロントと統合、Vercelデプロイ容易 |
| キュー/バッチ | Inngest or BullMQ | ジョブスケジューリング、リトライ |
| DB | Supabase (PostgreSQL) | pgvector対応、リアルタイム |
| ベクトル検索 | pgvector (Supabase) | 別サービス不要 |
| LLM | Anthropic API (Claude) | 日本語品質、コスト効率 |
| 埋め込み | Voyage AI or OpenAI | 高品質ベクトル |
| ホスティング | Vercel | Next.jsとの親和性 |
| 通知 | Slack Bolt SDK | Slack連携、インタラクティブUI |
| 監視 | Vercel Analytics + Sentry | エラー追跡、パフォーマンス |

---

## 10. MVP範囲（フェーズ定義）

### Phase 1a: Slack-first MVP（2-3週間）
最小限で価値検証を行う。Webダッシュボードは後回し。
- [ ] RSS + GitHub Releases フェッチャー
- [ ] Hacker News フェッチャー
- [ ] ルールベースフィルタ（Stage 1）
- [ ] Haiku分類（Stage 2）
- [ ] Sonnet要約（Stage 3、上位件数のみ）
- [ ] Daily Slack通知（Top N + カテゴリ別）
- [ ] 緊急アラート（セキュリティ / Breaking Change）
- [ ] Claude Code Changelog監視
- [ ] Slackリアクションによるフィードバック収集
- [ ] LLMコスト追跡・アラート

### Phase 1b: Webダッシュボード（2-3週間）
- [ ] 一面レイアウト（Top / カテゴリ別 / Changelog列）
- [ ] 詳細表示
- [ ] 既読管理
- [ ] 保存機能（一覧 + タグ付け）
- [ ] ウォッチリスト設定画面
- [ ] 情報源管理画面

### Phase 2: 情報拡充・検索（3-4週間）
- [ ] YouTube追加
- [ ] Reddit / arXiv追加
- [ ] 埋め込み生成・意味的重複排除
- [ ] 意味検索
- [ ] クラスタリング（同一トピックのグルーピング）
- [ ] フィードバックに基づくスコア補正

### Phase 3: パーソナライズ・連携（4-5週間）
- [ ] X連携
- [ ] パーソナライズスコアリング（閲覧履歴ベース）
- [ ] Notion連携
- [ ] Markdownエクスポート
- [ ] 週次レポート自動生成

---

## 11. 今後の拡張構想

- レコメンドエンジン（協調フィルタリング）
- 保存記事の自動整理・ナレッジグラフ
- トレンド可視化ダッシュボード（週次/月次のトピック推移）
- チーム機能（組織内での情報共有）
- モバイルアプリ（PWA）

---

## 12. v1 → v2 変更点サマリー

| 項目 | v1 | v2 |
|---|---|---|
| 情報源 | RSS / GitHub / YouTube / Changelog | + Hacker News / Reddit / arXiv（段階的） |
| LLMコスト | 言及なし | 段階的フィルタ + モデル使い分け + 月額試算 |
| 重要度スコア | 定性的な基準のみ | 定量的な重み付け + ウォッチリスト補正 |
| 重複排除 | ハッシュ + 意味類似度（概要のみ） | 4段階の多段重複排除 |
| 通知 | Daily Digest のみ | + 緊急アラート（セキュリティ / Breaking Change） |
| フィードバック | なし | Slackリアクション + Web UI |
| 保存機能 | ボタンのみ | 一覧 + タグ付け + エクスポート |
| 既読管理 | なし | 追加 |
| ウォッチリスト | なし | 追加（エンティティ / キーワード） |
| エラー監視 | なし | リトライ戦略 + フォールバック + アラート |
| 技術スタック | 未記載 | Next.js / Supabase / Vercel / Inngest |
| MVP戦略 | Phase 1が広範 | Phase 1をa/bに分割、Slack-firstで価値検証 |
| 多言語 | 未記載 | 英語記事の日本語要約方針 |
| データ保持 | 未記載 | テーブル別保持期間定義 |
| 競合分析 | なし | Feedly / daily.dev / TLDR との差別化 |

---

End of PRD v2
