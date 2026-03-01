import type { Watchlist } from "./config.js";
import { loadWatchlist } from "./config.js";

export interface ScoreInput {
  /** ソース信頼度 (0-1) */
  sourceTrust: number;
  /** 公開日時 */
  publishedAt: Date | null;
  /** HN score 等のエンゲージメント指標 */
  engagementScore: number;
  /** LLM が判定したコンテンツ品質 (0-1) */
  contentQuality: number;
  /** タイトル + URL（ウォッチリスト照合用） */
  title: string;
  url: string;
  /** トピック */
  topic?: string;
  /** フォーマット */
  format?: string;
}

export interface ScoreResult {
  score: number;
  reason: string;
}

/**
 * エンゲージメントスコアを 0-1 に正規化（対数スケール）
 */
export function normalizeEngagement(rawScore: number): number {
  if (rawScore <= 0) return 0;
  return Math.min(1, Math.log10(rawScore + 1) / Math.log10(1000));
}

/**
 * 鮮度スコア (0-1)
 */
export function calculateFreshness(publishedAt: Date | null, now: Date = new Date()): number {
  if (!publishedAt) return 0.5;
  const hoursAgo = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) return 1.0;
  if (hoursAgo <= 48) return 0.7;
  if (hoursAgo <= 168) return 0.3; // 1 week
  return 0.1;
}

/**
 * ウォッチリストによるブースト倍率を計算
 */
export function calculateWatchlistBoost(
  title: string,
  url: string,
  watchlist: Watchlist,
): { boost: number; matched: string[] } {
  const text = `${title} ${url}`.toLowerCase();
  let boost = 1.0;
  const matched: string[] = [];

  for (const entity of watchlist.entities) {
    if (text.includes(entity.name.toLowerCase())) {
      boost = Math.max(boost, entity.score_boost);
      matched.push(entity.name);
    }
  }

  for (const keyword of watchlist.keywords) {
    if (text.includes(keyword.value.toLowerCase())) {
      boost = Math.max(boost, keyword.score_boost);
      matched.push(keyword.value);
    }
  }

  return { boost, matched };
}

/**
 * 重要度スコアを計算
 *
 * 重み: ソース信頼度30% + 鮮度20% + エンゲージメント20% + コンテンツ品質30%
 * ボーナス: security +15, breaking change +10, watchlist ×boost
 */
export function calculateImportanceScore(input: ScoreInput): ScoreResult {
  const freshness = calculateFreshness(input.publishedAt);
  const engagement = normalizeEngagement(input.engagementScore);

  const baseScore =
    input.sourceTrust * 0.3 + freshness * 0.2 + engagement * 0.2 + input.contentQuality * 0.3;

  let bonus = 0;
  const reasons: string[] = [];

  // トピックボーナス
  if (input.topic === "security") {
    bonus += 0.15;
    reasons.push("security +15");
  }

  // フォーマットボーナス
  if (input.format === "incident") {
    bonus += 0.1;
    reasons.push("breaking change +10");
  }

  let score = Math.min(1, baseScore + bonus);

  // ウォッチリストブースト
  let watchlist: Watchlist;
  try {
    watchlist = loadWatchlist();
  } catch {
    watchlist = { entities: [], keywords: [] };
  }
  const { boost, matched } = calculateWatchlistBoost(input.title, input.url, watchlist);
  if (boost > 1.0) {
    score = Math.min(1, score * boost);
    reasons.push(`watchlist(${matched.join(",")}) ×${boost}`);
  }

  const reason = [
    `trust=${input.sourceTrust}`,
    `fresh=${freshness.toFixed(2)}`,
    `engage=${engagement.toFixed(2)}`,
    `quality=${input.contentQuality}`,
    ...reasons,
  ].join(", ");

  return { score: Math.round(score * 1000) / 1000, reason };
}
