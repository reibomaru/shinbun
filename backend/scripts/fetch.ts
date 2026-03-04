import { prisma } from "../lib/db/client.js";
import { loadSources } from "../lib/config.js";
import { sourceRepository, rawEventRepository } from "../lib/container.js";
import { fetchSource } from "../lib/usecases/fetch-source.js";
import { syncSources } from "../lib/usecases/sync-sources.js";
import { deduplicateEvents } from "../lib/usecases/deduplicate-events.js";
import { saveEvents } from "../lib/usecases/save-events.js";

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
  const sourcesWithConfig = await syncSources(sourceRepository, sourceConfigs);
  console.log(`Synced ${sourcesWithConfig.length} sources to DB`);

  // 3. 各ソースを並列でフェッチ
  const results = await Promise.allSettled(
    sourcesWithConfig.map(async ({ source, config: cfg }) => {
      const label = `[${source.type}] ${source.name}`;

      console.log(`  Fetching ${label}...`);
      const result = await fetchSource(cfg, source.lastFetchedAt);

      if (!result.ok) {
        console.error(`  ✗ ${label}: ${result.error}`);
        await sourceRepository.incrementErrorCount(source.id, result.error);
        return { source: label, fetched: 0, saved: 0 };
      }

      console.log(`  ✓ ${label}: ${result.events.length} events fetched`);

      // 4. Stage 1 フィルタ: 重複排除
      const unique = await deduplicateEvents(rawEventRepository, source.id, result.events);
      console.log(`    → ${unique.length} new (after dedup)`);

      // 5. raw_event に保存
      const savedCount = await saveEvents(rawEventRepository, source.id, unique);

      // 6. last_fetched_at を更新、エラーカウントリセット
      await sourceRepository.updateLastFetched(source.id);

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
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isDirectRun) {
  main()
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
