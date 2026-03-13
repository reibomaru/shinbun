import { extract } from "@extractus/article-extractor";
import type { RawEventInput } from "../models/raw-event.js";

const MAX_CONTENT_LENGTH = 10_000;
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;

/** 記事本文を抽出する関数の型 */
export type ExtractFn = (
  url: string,
  options?: { signal?: AbortSignal },
) => Promise<{ content?: string } | null>;

/** HTMLタグを除去してプレーンテキスト化 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** 1記事の本文を抽出。失敗時は null を返す */
export async function extractArticleText(
  url: string,
  extractFn: ExtractFn = extract,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const article = await extractFn(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!article?.content) return null;

      const text = stripHtmlTags(article.content);
      return text.slice(0, MAX_CONTENT_LENGTH) || null;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  } catch (err) {
    console.warn(
      `[extract-content] Failed to extract ${url}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/** バッチで events に content を付与（並列度制限付き） */
export async function enrichEventsWithContent(
  events: RawEventInput[],
  extractFn: ExtractFn = extract,
): Promise<RawEventInput[]> {
  const results: RawEventInput[] = [];

  for (let i = 0; i < events.length; i += CONCURRENCY) {
    const chunk = events.slice(i, i + CONCURRENCY);
    const enriched = await Promise.all(
      chunk.map(async (event) => {
        if (!event.url) return event;
        const content = await extractArticleText(event.url, extractFn);
        return { ...event, content };
      }),
    );
    results.push(...enriched);
  }

  return results;
}
