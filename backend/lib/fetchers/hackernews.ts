import { z } from "zod";
import type { FetchResult, RawEventInput } from "./types.js";

const HN_API = "https://hacker-news.firebaseio.com/v0";

const HNItemSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    url: z.string().optional(),
    score: z.number(),
    time: z.number(),
    by: z.string(),
    type: z.string(),
    descendants: z.number().optional(),
  })
  .passthrough();

type HNItem = z.infer<typeof HNItemSchema>;

/**
 * Hacker News API (topstories/beststories) を取得
 * min_score フィルタ適用、last_fetched_at 以降のみ
 */
export async function fetchHackerNews(
  config: { mode: "top" | "best" | "new"; min_score: number },
  lastFetchedAt: Date | null,
): Promise<FetchResult> {
  try {
    const endpoint = `${HN_API}/${config.mode}stories.json`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      return { ok: false, error: `HN API ${res.status}: ${res.statusText}` };
    }

    const ids = z.array(z.number()).parse(await res.json());
    // 上位50件のみ取得（API負荷軽減）
    const topIds = ids.slice(0, 50);

    // 10件ずつチャンクに分割して並列実行（API負荷軽減）
    const CONCURRENCY = 10;
    const items: (HNItem | null)[] = [];
    for (let i = 0; i < topIds.length; i += CONCURRENCY) {
      const chunk = topIds.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (id): Promise<HNItem | null> => {
          try {
            const r = await fetch(`${HN_API}/item/${id}.json`);
            if (!r.ok) return null;
            const parsed = HNItemSchema.safeParse(await r.json());
            return parsed.success ? parsed.data : null;
          } catch {
            return null;
          }
        }),
      );
      items.push(...results);
    }

    const events: RawEventInput[] = items
      .filter((item): item is HNItem => item !== null)
      .filter((item) => item.type === "story")
      .filter((item) => item.score >= config.min_score)
      .filter((item) => {
        if (!lastFetchedAt) return true;
        const itemDate = new Date(item.time * 1000);
        return itemDate > lastFetchedAt;
      })
      .map((item) => ({
        externalId: `hn-${item.id}`,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        title: item.title,
        publishedAt: new Date(item.time * 1000),
        payload: item as unknown as Record<string, unknown>,
      }));

    return { ok: true, events };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
