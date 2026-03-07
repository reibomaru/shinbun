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
  language: "EN" | "JA";
  importanceScore: number;
  isRead: boolean;
  isSaved: boolean;
  isUrgent?: boolean;
  url: string;
  entities: string[];
  relatedArticles: string[];
}

export interface Release {
  name: string;
  source: string;
  publishedAt: string;
  score: number;
}

export interface SavedArticleSummary {
  id: string;
  savedItemId: string;
  title: string;
  source: string;
  publishedAt: string;
  tags: string[];
}

export interface SavedGroup {
  date: string;
  items: SavedArticleSummary[];
}

export interface CategoryCounts {
  [key: string]: number;
}

export interface ArchiveDay {
  date: string; // "2026-03-05"
  dayOfWeek: string; // "木"
  articleCount: number;
  topTitle: string;
}
