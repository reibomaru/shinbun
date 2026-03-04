import { fetchGitHubReleases } from "./github.js";
import { fetchHackerNews } from "./hackernews.js";
import { fetchRSS } from "./rss.js";
import type { FetchResult, SourceConfig } from "./types.js";

/**
 * ソース設定に応じてフェッチャーを呼び分ける
 */
export async function fetchSource(
  sourceConfig: SourceConfig,
  lastFetchedAt: Date | null,
): Promise<FetchResult> {
  const cfg = sourceConfig.config;
  switch (sourceConfig.type) {
    case "github_repo":
      return fetchGitHubReleases(cfg as { owner: string; repo: string }, lastFetchedAt);
    case "rss":
      return fetchRSS(cfg as { url: string }, lastFetchedAt);
    case "hackernews":
      return fetchHackerNews(
        cfg as { mode: "top" | "best" | "new"; min_score: number },
        lastFetchedAt,
      );
    default:
      return {
        ok: false,
        error: `Unsupported source type: ${sourceConfig.type}`,
      };
  }
}
