import { prisma } from "../lib/db/client.js";
import { loadSources } from "../lib/config.js";
import { fetchGitHubReleases } from "../lib/fetchers/github.js";
import { fetchRSS } from "../lib/fetchers/rss.js";
import { fetchHackerNews } from "../lib/fetchers/hackernews.js";
import { normalizeUrl, contentHash } from "../lib/url.js";
import type { SourceConfig, FetchResult, RawEventInput } from "../lib/fetchers/types.js";
import type { Source } from "@prisma/client";

/**
 * ソース設定に応じてフェッチャーを呼び分ける
 */
async function fetchSource(
  sourceConfig: SourceConfig,
  lastFetchedAt: Date | null,
): Promise<FetchResult> {
  const cfg = sourceConfig.config;
  switch (sourceConfig.type) {
    case "github_repo":
      return fetchGitHubReleases(
        cfg as { owner: string; repo: string },
        lastFetchedAt,
      );
    case "rss":
      return fetchRSS(cfg as { url: string }, lastFetchedAt);
    case "hackernews":
      return fetchHackerNews(
        cfg as { mode: "top" | "best" | "new"; min_score: number },
        lastFetchedAt,
      );
    default:
      return { ok: false, error: `Unsupported source type: ${sourceConfig.type}` };
  }
}

/**
 * DB の source テーブルと YAML 設定を同期（なければ作成、あれば更新）
 */
async function syncSources(configs: SourceConfig[]): Promise<Source[]> {
  const sources: Source[] = [];
  for (const cfg of configs) {
    const source = await prisma.source.upsert({
      where: {
        // type + name でユニーク識別（DB側にuniqueがないので findFirst + create/update）
        id: (
          await prisma.source.findFirst({
            where: { type: cfg.type, name: cfg.name },
          })
        )?.id ?? "00000000-0000-0000-0000-000000000000",
      },
      create: {
        type: cfg.type,
        name: cfg.name,
        config: cfg.config as object,
        pollingInterval: cfg.polling_interval,
        enabled: true,
      },
      update: {
        config: cfg.config as object,
        pollingInterval: cfg.polling_interval,
      },
    });
    sources.push(source);
  }
  return sources;
}

/**
 * Stage 1 フィルタ: content_hash / externalId で重複排除
 */
async function deduplicateEvents(
  sourceId: string,
  events: RawEventInput[],
): Promise<RawEventInput[]> {
  if (events.length === 0) return [];

  // content_hash を計算
  const eventsWithHash = events.map((e) => ({
    ...e,
    hash: contentHash(e.payload),
    urlNorm: normalizeUrl(e.url),
  }));

  // 既存の externalId を取得
  const existingByExternalId = await prisma.rawEvent.findMany({
    where: {
      sourceId,
      externalId: { in: eventsWithHash.map((e) => e.externalId) },
    },
    select: { externalId: true },
  });
  const existingIds = new Set(existingByExternalId.map((e) => e.externalId));

  // 既存の content_hash を取得
  const existingByHash = await prisma.rawEvent.findMany({
    where: {
      sourceId,
      contentHash: { in: eventsWithHash.map((e) => e.hash) },
    },
    select: { contentHash: true },
  });
  const existingHashes = new Set(existingByHash.map((e) => e.contentHash));

  return eventsWithHash.filter(
    (e) => !existingIds.has(e.externalId) && !existingHashes.has(e.hash),
  );
}

/**
 * raw_event テーブルに保存
 */
async function saveEvents(sourceId: string, events: RawEventInput[]): Promise<number> {
  let saved = 0;
  for (const event of events) {
    const hash = contentHash(event.payload);
    const urlNorm = normalizeUrl(event.url);
    try {
      await prisma.rawEvent.create({
        data: {
          sourceId,
          externalId: event.externalId,
          payload: {
            ...event.payload,
            _url: event.url,
            _title: event.title,
            _publishedAt: event.publishedAt?.toISOString() ?? null,
            _urlNormalized: urlNorm,
          } as object,
          contentHash: hash,
        },
      });
      saved++;
    } catch (err) {
      // unique constraint violation（重複）はスキップ
      if (
        err instanceof Error &&
        err.message.includes("Unique constraint")
      ) {
        continue;
      }
      throw err;
    }
  }
  return saved;
}

/**
 * メイン処理
 */
async function main() {
  console.log("=== Fetch started ===");
  const startTime = Date.now();

  // 1. sources.yaml からソース一覧を読み込み
  const sourceConfigs = loadSources();
  console.log(`Loaded ${sourceConfigs.length} source configs`);

  // 2. DB の source テーブルと同期
  const sources = await syncSources(sourceConfigs);
  console.log(`Synced ${sources.length} sources to DB`);

  // 3. 各ソースを並列でフェッチ
  const results = await Promise.allSettled(
    sources.map(async (source, i) => {
      const cfg = sourceConfigs[i];
      const label = `[${source.type}] ${source.name}`;

      console.log(`  Fetching ${label}...`);
      const result = await fetchSource(cfg, source.lastFetchedAt);

      if (!result.ok) {
        console.error(`  ✗ ${label}: ${result.error}`);
        // エラー時: error_count インクリメント
        await prisma.source.update({
          where: { id: source.id },
          data: {
            errorCount: { increment: 1 },
            lastError: result.error,
          },
        });
        return { source: label, fetched: 0, saved: 0 };
      }

      console.log(`  ✓ ${label}: ${result.events.length} events fetched`);

      // 4. Stage 1 フィルタ: 重複排除
      const unique = await deduplicateEvents(source.id, result.events);
      console.log(`    → ${unique.length} new (after dedup)`);

      // 5. raw_event に保存
      const savedCount = await saveEvents(source.id, unique);

      // 6. last_fetched_at を更新、エラーカウントリセット
      await prisma.source.update({
        where: { id: source.id },
        data: {
          lastFetchedAt: new Date(),
          errorCount: 0,
          lastError: null,
        },
      });

      return { source: label, fetched: result.events.length, saved: savedCount };
    }),
  );

  // 結果サマリー
  console.log("\n=== Results ===");
  for (const r of results) {
    if (r.status === "fulfilled") {
      console.log(`  ${r.value.source}: ${r.value.fetched} fetched, ${r.value.saved} saved`);
    } else {
      console.error(`  FAILED: ${r.reason}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Fetch completed in ${elapsed}s ===`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
