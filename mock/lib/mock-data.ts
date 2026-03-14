export type Topic = "genai" | "frontend" | "backend" | "devtools" | "security";
export type Format = "release" | "tutorial" | "benchmark" | "incident" | "announcement";

export interface Article {
  id: string;
  title: string;
  summaryShort: string;
  summaryMedium: string;
  keyPoints: string[];
  whyItMatters: string;
  topic: Topic;
  format: Format;
  source: string;
  publishedAt: string;
  publishedAtAbsolute: string;
  language: "EN" | "JA";
  importanceScore: number;
  isRead: boolean;
  isSaved: boolean;
  isUrgent?: boolean;
  url: string;
  entities: string[];
  relatedArticles: string[];
}

export const ARTICLES: Article[] = [
  {
    id: "1",
    title: "Claude 3.7 Sonnet リリース",
    summaryShort:
      "拡張思考モードとAPIコスト20%削減を実現。コンテキストウィンドウは200Kトークンに拡張。",
    summaryMedium:
      "Anthropicが新モデルClaude 3.7 Sonnetを公開。拡張思考モードにより複雑な推論タスクの精度が向上し、APIコストは前モデル比20%削減。コンテキストウィンドウは200Kトークンに拡張された。エージェント用途でのコスト障壁が下がり、実用化がさらに加速する見込み。",
    keyPoints: [
      "拡張思考モード（Extended Thinking）が正式サポート",
      "入力$3/MTok・出力$15/MTok（Sonnet 3.5比-20%）",
      "コンテキストウィンドウ 200K トークン",
    ],
    whyItMatters: "エージェント用途のコスト障壁が下がり、実用化がさらに加速する。",
    topic: "genai",
    format: "release",
    source: "Anthropic",
    publishedAt: "2時間前",
    publishedAtAbsolute: "2026/03/05 14:00",
    language: "EN",
    importanceScore: 98,
    isRead: false,
    isSaved: false,
    url: "#",
    entities: ["Anthropic", "Claude", "LLM"],
    relatedArticles: ["Claude Code v1.2リリース", "Sonnet 3.5 ベンチマーク"],
  },
  {
    id: "2",
    title: "Next.js 15.2 リリース",
    summaryShort: "Turbopack stable化、React Server Componentsのキャッシュ戦略が改善。",
    summaryMedium:
      "VercelがNext.js 15.2をリリース。Turbopackが安定版となり、ビルド速度が大幅に向上。React Server Componentsのキャッシュ戦略が改善され、パフォーマンスとDX（開発者体験）が向上。また、新しいルーティングAPIも追加された。",
    keyPoints: [
      "Turbopack が安定版（stable）に昇格",
      "RSC キャッシュ戦略の改善でパフォーマンス向上",
      "新しい parallel routes API の追加",
    ],
    whyItMatters: "Turbopackの安定化により、大規模プロジェクトでも安心して採用できるようになった。",
    topic: "frontend",
    format: "release",
    source: "Vercel",
    publishedAt: "5時間前",
    publishedAtAbsolute: "2026/03/05 11:00",
    language: "EN",
    importanceScore: 85,
    isRead: false,
    isSaved: true,
    url: "#",
    entities: ["Next.js", "Vercel", "React"],
    relatedArticles: ["Turbopack ベンチマーク比較", "React 19.1 リリース"],
  },
  {
    id: "3",
    title: "LLaMA 4 公開 — Metaがオープンウェイト最強モデルを投入",
    summaryShort: "Metaが最新の大規模言語モデルLLaMA 4を公開。商用利用可のオープンウェイト。",
    summaryMedium:
      "MetaがLLaMA 4シリーズを公開。最大405Bパラメータのモデルが利用可能になり、多くのベンチマークでGPT-4oを凌駕。商用利用可能なライセンスで提供され、セルフホスティングの選択肢が広がった。",
    keyPoints: [
      "最大405Bパラメータのフラッグシップモデル",
      "GPT-4oを超えるベンチマーク結果",
      "商用利用可能なライセンス",
    ],
    whyItMatters:
      "オープンウェイトの選択肢が大幅に広がり、プロプライエタリモデルへの依存を減らせる。",
    topic: "genai",
    format: "release",
    source: "Meta",
    publishedAt: "8時間前",
    publishedAtAbsolute: "2026/03/05 08:00",
    language: "EN",
    importanceScore: 72,
    isRead: true,
    isSaved: false,
    url: "#",
    entities: ["Meta", "LLaMA", "LLM"],
    relatedArticles: ["LLaMA 3.1 vs GPT-4o ベンチマーク"],
  },
  {
    id: "4",
    title: "Gemini 2.5 Pro — Googleの最新マルチモーダルモデル",
    summaryShort: "Googleが2.5 Proを発表。動画理解とコード生成で大幅な性能向上を実現。",
    summaryMedium:
      "GoogleがGemini 2.5 Proを発表。動画の長時間理解能力が向上し、1時間以上の動画を解析可能に。コード生成ベンチマークでも新記録を達成。",
    keyPoints: [
      "1時間以上の長時間動画を理解・解析可能",
      "コード生成ベンチマークで業界最高スコア",
      "APIは既存Gemini利用者に優先提供",
    ],
    whyItMatters: "動画コンテンツの自動解析・要約ユースケースが大幅に拡大する。",
    topic: "genai",
    format: "release",
    source: "Google",
    publishedAt: "12時間前",
    publishedAtAbsolute: "2026/03/05 04:00",
    language: "EN",
    importanceScore: 68,
    isRead: false,
    isSaved: false,
    url: "#",
    entities: ["Google", "Gemini", "LLM"],
    relatedArticles: [],
  },
  {
    id: "5",
    title: "React 19.1 — 新しいフォームAPIとサーバーアクション改善",
    summaryShort:
      "Metaがリリース。フォームのプログレッシブエンハンスメントがより簡単に実装可能に。",
    summaryMedium:
      "React 19.1がリリース。新しいuseFormStatusフックによりフォームの状態管理が改善。サーバーアクションのエラーハンドリングも強化され、フルスタックアプリ開発がより直感的になった。",
    keyPoints: [
      "useFormStatus フックの追加でフォーム状態管理が改善",
      "サーバーアクションのエラーバウンダリ対応",
      "TypeScript 5.5 との型推論改善",
    ],
    whyItMatters:
      "サーバーコンポーネントとクライアントの境界がより明確になり、設計しやすくなった。",
    topic: "frontend",
    format: "release",
    source: "Meta",
    publishedAt: "1日前",
    publishedAtAbsolute: "2026/03/04 10:00",
    language: "EN",
    importanceScore: 61,
    isRead: true,
    isSaved: false,
    url: "#",
    entities: ["React", "Meta"],
    relatedArticles: ["Next.js 15.2 リリース"],
  },
  {
    id: "6",
    title: "Supabase v2.8 — Edge Functions の大幅改善",
    summaryShort: "Edge Functionsのコールドスタートが50%改善。新しいストリーミングAPIも追加。",
    summaryMedium:
      "Supabase v2.8でEdge Functionsのパフォーマンスが大幅改善。コールドスタート時間が50%短縮され、新しいストリーミングAPIにより長時間処理もサポート可能になった。",
    keyPoints: [
      "Edge Functions コールドスタート 50% 削減",
      "新しいストリーミングAPIでリアルタイム処理対応",
      "Deno 2.0 ランタイムに更新",
    ],
    whyItMatters: "サーバーレス環境での本番運用の信頼性が向上した。",
    topic: "backend",
    format: "release",
    source: "Supabase",
    publishedAt: "2日前",
    publishedAtAbsolute: "2026/03/03 15:00",
    language: "EN",
    importanceScore: 55,
    isRead: true,
    isSaved: true,
    url: "#",
    entities: ["Supabase", "Edge Functions", "Deno"],
    relatedArticles: [],
  },
  {
    id: "7",
    title: "Next.js に SSRF 脆弱性 — 即時アップデート推奨",
    summaryShort: "CVE-2026-XXXX / CVSS 9.1 / 全バージョン影響。v15.2.1で修正済み。",
    summaryMedium:
      "Next.jsの全バージョンに影響するSSRF（サーバーサイドリクエストフォージェリ）脆弱性が発見された。攻撃者が内部ネットワークへのリクエストを強制できる可能性がある。v15.2.1で修正済みのため即時アップデートを推奨。",
    keyPoints: [
      "CVSS スコア 9.1（Critical）",
      "全バージョンが影響を受ける",
      "v15.2.1 で修正済み — 即時アップデート推奨",
    ],
    whyItMatters: "本番環境での悪用リスクが高く、早急な対応が必要。",
    topic: "security",
    format: "incident",
    source: "CVE Database",
    publishedAt: "30分前",
    publishedAtAbsolute: "2026/03/05 15:30",
    language: "EN",
    importanceScore: 99,
    isRead: false,
    isSaved: false,
    isUrgent: true,
    url: "#",
    entities: ["Next.js", "Vercel"],
    relatedArticles: ["Next.js 15.2 リリース"],
  },
  {
    id: "8",
    title: "Claude Code v1.2 リリース",
    summaryShort: "マルチエージェント協調機能と新しいツール利用APIを追加。",
    summaryMedium:
      "Anthropicがclaude-code v1.2をリリース。複数のサブエージェントが協調して作業できる新機能を追加。また、カスタムツール定義のAPIも改善され、より複雑なワークフローの自動化が可能になった。",
    keyPoints: [
      "マルチエージェント協調機能の追加",
      "カスタムツール定義APIの改善",
      "GitHub Actions との統合が改善",
    ],
    whyItMatters: "複雑なコードベースの自動化・リファクタリングタスクが大幅に効率化される。",
    topic: "devtools",
    format: "release",
    source: "Anthropic",
    publishedAt: "3時間前",
    publishedAtAbsolute: "2026/03/05 13:00",
    language: "EN",
    importanceScore: 92,
    isRead: false,
    isSaved: false,
    url: "#",
    entities: ["Anthropic", "Claude Code"],
    relatedArticles: ["Claude 3.7 Sonnet リリース"],
  },
];

export const RELEASES = [
  {
    name: "Claude Code v1.2",
    source: "Anthropic",
    publishedAt: "2時間前",
    publishedAtAbsolute: "2026/03/05 14:00",
    score: 92,
  },
  {
    name: "Next.js 15.2",
    source: "Vercel",
    publishedAt: "5時間前",
    publishedAtAbsolute: "2026/03/05 11:00",
    score: 85,
  },
  {
    name: "React 19.1",
    source: "Meta",
    publishedAt: "1日前",
    publishedAtAbsolute: "2026/03/04 10:00",
    score: 61,
  },
  {
    name: "Supabase v2.8",
    source: "Supabase",
    publishedAt: "2日前",
    publishedAtAbsolute: "2026/03/03 15:00",
    score: 55,
  },
  {
    name: "Tailwind CSS v4.1",
    source: "Tailwind Labs",
    publishedAt: "3日前",
    publishedAtAbsolute: "2026/03/02 09:00",
    score: 48,
  },
];

export const CATEGORY_COUNTS = {
  GenAI: 12,
  Frontend: 8,
  Backend: 5,
  Tools: 9,
};

export interface ArchiveDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  articleCount: number;
  topTitle: string;
}

export const ARCHIVE_DAYS: ArchiveDay[] = [
  { date: "2026-03-05", dayOfWeek: "木", articleCount: 24, topTitle: "Claude 3.7 Sonnet リリース" },
  { date: "2026-03-04", dayOfWeek: "水", articleCount: 18, topTitle: "GPT-5 APIベータ公開" },
  { date: "2026-03-03", dayOfWeek: "火", articleCount: 22, topTitle: "Deno 2.1 リリース" },
  { date: "2026-03-02", dayOfWeek: "月", articleCount: 15, topTitle: "Tailwind CSS v4.1 リリース" },
  {
    date: "2026-03-01",
    dayOfWeek: "日",
    articleCount: 20,
    topTitle: "React Server Components 実践ガイド",
  },
  {
    date: "2026-02-28",
    dayOfWeek: "土",
    articleCount: 16,
    topTitle: "Supabase v2.8 Edge Functions改善",
  },
  { date: "2026-02-27", dayOfWeek: "金", articleCount: 19, topTitle: "Bun 1.3 リリース" },
  { date: "2026-02-26", dayOfWeek: "木", articleCount: 21, topTitle: "LangChain v0.4 リリース" },
  { date: "2026-02-25", dayOfWeek: "水", articleCount: 14, topTitle: "Vercel AI SDK 4.0" },
  { date: "2026-02-24", dayOfWeek: "火", articleCount: 17, topTitle: "Rust 1.85 安定版リリース" },
  {
    date: "2026-02-23",
    dayOfWeek: "月",
    articleCount: 23,
    topTitle: "Next.js 15.1 セキュリティ修正",
  },
  { date: "2026-02-22", dayOfWeek: "日", articleCount: 12, topTitle: "Prisma 6.0 リリース" },
];

export const SAVED_ARTICLES = [
  {
    date: "2026/03/01",
    items: [
      {
        id: "1",
        title: "Claude 3.7 Sonnet リリース",
        source: "Anthropic",
        publishedAt: "2時間前",
        tags: ["llm", "api"],
      },
      {
        id: "2",
        title: "Next.js 15.2 リリース",
        source: "Vercel",
        publishedAt: "5時間前",
        tags: ["frontend"],
      },
    ],
  },
  {
    date: "2026/02/28",
    items: [
      {
        id: "6",
        title: "Supabase v2.8 — Edge Functions の大幅改善",
        source: "Supabase",
        publishedAt: "2日前",
        tags: ["backend", "serverless"],
      },
    ],
  },
  {
    date: "2026/02/25",
    items: [
      {
        id: "5",
        title: "React 19.1 — 新しいフォームAPI",
        source: "Meta",
        publishedAt: "4日前",
        tags: ["react", "frontend"],
      },
    ],
  },
];
