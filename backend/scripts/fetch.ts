import { loadSources } from "../lib/config.js";
import { rawEventRepository, sourceRepository } from "../lib/container.js";
import { prisma } from "../lib/db/client.js";
import { fetchSource } from "../lib/fetchers/index.js";
import { checkCost } from "../lib/usecases/check-cost.js";
import { classifyEvents } from "../lib/usecases/classify-events.js";
import { deduplicateEvents } from "../lib/usecases/deduplicate-events.js";
import { saveEvents } from "../lib/usecases/save-events.js";
import { summarizeItems } from "../lib/usecases/summarize-items.js";
import { syncSources } from "../lib/usecases/sync-sources.js";

/**
 * メイン処理
 */
async function main() {
  console.log("=== Fetch started ===");
  const startTime = Date.now();

  // Stage 1: Fetch
  console.log("\n--- Stage 1: Fetch ---");

  const sourceConfigs = loadSources();
  console.log(`Loaded ${sourceConfigs.length} source configs`);

  const sourcesWithConfig = await syncSources(sourceRepository, sourceConfigs);
  console.log(`Synced ${sourcesWithConfig.length} sources to DB`);

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

      const unique = await deduplicateEvents(rawEventRepository, source.id, result.events);
      console.log(`    → ${unique.length} new (after dedup)`);

      const savedCount = await saveEvents(rawEventRepository, source.id, unique);

      await sourceRepository.updateLastFetched(source.id);

      return { source: label, fetched: result.events.length, saved: savedCount };
    }),
  );

  let totalSaved = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      console.log(`  ${r.value.source}: ${r.value.fetched} fetched, ${r.value.saved} saved`);
      totalSaved += r.value.saved;
    } else {
      console.error(`  FAILED: ${r.reason}`);
    }
  }
  console.log(`  Saved ${totalSaved} new raw events`);

  // Stage 2: Classify
  console.log("\n--- Stage 2: Classify (Gemini Flash Lite) ---");
  const { classified, relevant, totalCost: classifyCost } = await classifyEvents(prisma);
  console.log(
    `  Classified ${classified}, relevant: ${relevant}, cost: $${classifyCost.toFixed(4)}`,
  );

  // Stage 3: Summarize
  console.log("\n--- Stage 3: Summarize (Gemini Flash) ---");
  const { summarized, totalCost: summarizeCost } = await summarizeItems(prisma);
  console.log(`  Summarized ${summarized}, cost: $${summarizeCost.toFixed(4)}`);

  // Cost alert check
  const totalCost = classifyCost + summarizeCost;
  await checkCost(prisma, totalCost);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n=== Fetch completed in ${elapsed}s (total LLM cost: $${totalCost.toFixed(4)}) ===`,
  );
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
