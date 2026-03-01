import type { Source } from "@prisma/client";
import { loadSources } from "../lib/config.js";
import { prisma } from "../lib/db/client.js";
import { fetchGitHubReleases } from "../lib/fetchers/github.js";
import { fetchHackerNews } from "../lib/fetchers/hackernews.js";
import { fetchRSS } from "../lib/fetchers/rss.js";
import type { FetchResult, RawEventInput, SourceConfig } from "../lib/fetchers/types.js";
import { contentHash, normalizeUrl } from "../lib/url.js";

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
      return { ok: false, error: `Unsupported source type: ${sourceConfig.type}` };
  }
}

/**
 * DB の source テーブルと YAML 設定を同期（なければ作成、あれば更新）
 * @@unique([type, name]) を利用した正しい upsert で race condition を回避
 */
export async function syncSources(
  configs: SourceConfig[],
): Promise<Array<{ source: Source; config: SourceConfig }>> {
  return Promise.all(
    configs.map(async (cfg) => {
      const source = await prisma.source.upsert({
        where: {
          type_name: { type: cfg.type, name: cfg.name },
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
      return { source, config: cfg };
    }),
  );
}

/**
 * Stage 1 フィルタ: content_hash / externalId で重複排除
 */
export async function deduplicateEvents(
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
 * raw_event テーブルに一括保存（createMany + skipDuplicates）
 */
export async function saveEvents(sourceId: string, events: RawEventInput[]): Promise<number> {
  if (events.length === 0) return 0;

  const data = events.map((event) => {
    const hash = contentHash(event.payload);
    const urlNorm = normalizeUrl(event.url);
    return {
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
    };
  });

  const result = await prisma.rawEvent.createMany({
    data,
    skipDuplicates: true,
  });

  return result.count;
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
  const sourcesWithConfig = await syncSources(sourceConfigs);
  console.log(`Synced ${sourcesWithConfig.length} sources to DB`);

  // 3. 各ソースを並列でフェッチ
  const results = await Promise.allSettled(
    sourcesWithConfig.map(async ({ source, config: cfg }) => {
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

const isDirectRun =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isDirectRun) {
  main()
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
