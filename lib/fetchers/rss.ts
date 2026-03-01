import Parser from "rss-parser";
import type { FetchResult, RawEventInput } from "./types.js";

const parser = new Parser();

/**
 * rss-parser で RSS/Atom フィードを取得
 * last_fetched_at 以降のエントリのみ返す
 */
export async function fetchRSS(
  config: { url: string },
  lastFetchedAt: Date | null,
): Promise<FetchResult> {
  try {
    const feed = await parser.parseURL(config.url);

    const events: RawEventInput[] = (feed.items ?? [])
      .filter((item) => {
        if (!lastFetchedAt) return true;
        const pubDate = item.pubDate ? new Date(item.pubDate) : null;
        if (!pubDate) return true;
        return pubDate > lastFetchedAt;
      })
      .map((item) => ({
        externalId: item.guid || item.link || item.title || "",
        url: item.link || "",
        title: item.title || "(no title)",
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
        payload: item as unknown as Record<string, unknown>,
      }));

    return { ok: true, events };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
