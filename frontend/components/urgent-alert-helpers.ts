/**
 * Pure helper functions for UrgentAlertBanner, extracted for testability.
 */

import type { Article } from "@/lib/types";

/**
 * Filter articles by removing dismissed ones.
 */
export function getVisibleAlerts(
  articles: Article[],
  dismissedIds: Set<string>,
): Article[] {
  return articles.filter((a) => !dismissedIds.has(a.id));
}

/**
 * Add an article ID to the dismissed set (immutable).
 */
export function dismissArticle(
  dismissedIds: Set<string>,
  articleId: string,
): Set<string> {
  return new Set(dismissedIds).add(articleId);
}

/**
 * Check whether a URL is safe for use in an href attribute.
 * Only allows http: and https: protocols.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
