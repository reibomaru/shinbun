import { loadSources } from "../lib/config.js";
import { prisma } from "../lib/db/client.js";
import { fetchSource } from "../lib/fetchers/index.js";
import { syncSources, deduplicateEvents, saveEvents } from "../lib/sources.js";
import { classifyEvents } from "../lib/usecases/classify-events.js";
import { summarizeItems } from "../lib/usecases/summarize-items.js";
import { checkCost } from "../lib/usecases/check-cost.js";

/**
 * Stage 1: HN ソースのフェッチ + 重複排除 + raw_event 保存
 */
async function stage1Fetch() {
  const allConfigs = loadSources();
  const hnConfigs = allConfigs.filter((c) => c.type === "hackernews");

  if (hnConfigs.length === 0) {
    console.log("No HN sources configured, skipping");
    return { savedCount: 0 };
  }

  const sourcesWithConfig = await syncSources(hnConfigs);
  let totalSaved = 0;

  for (const { source, config } of sourcesWithConfig) {
    const label = `[${source.type}] ${source.name}`;
    console.log(`  Fetching ${label}...`);

    const result = await fetchSource(config, source.lastFetchedAt);

    if (!result.ok) {
      console.error(`  ✗ ${label}: ${result.error}`);
      await prisma.source.update({
        where: { id: source.id },
        data: { errorCount: { increment: 1 }, lastError: result.error },
      });
      continue;
    }

    console.log(`  ✓ ${label}: ${result.events.length} events fetched`);

    const unique = await deduplicateEvents(source.id, result.events);
    console.log(`    → ${unique.length} new (after dedup)`);

    const savedCount = await saveEvents(source.id, unique);
    totalSaved += savedCount;

    await prisma.source.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date(), errorCount: 0, lastError: null },
    });
  }

  return { savedCount: totalSaved };
}

/** stage2Classify: 共通モジュール classifyEvents のラッパー */
async function stage2Classify() {
  return classifyEvents(prisma);
}

/** stage3Summarize: 共通モジュール summarizeItems のラッパー */
async function stage3Summarize() {
  return summarizeItems(prisma);
}

/** checkCostAlert: 共通モジュール checkCost のラッパー */
async function checkCostAlert(totalCost: number) {
  return checkCost(prisma, totalCost);
}

/**
 * メイン処理
 */
async function main() {
  console.log("=== fetch-hn started ===");
  const startTime = Date.now();

  // Stage 1: Fetch
  console.log("\n--- Stage 1: Fetch ---");
  const { savedCount } = await stage1Fetch();
  console.log(`  Saved ${savedCount} new raw events`);

  // Stage 2: Classify
  console.log("\n--- Stage 2: Classify (Gemini Flash Lite) ---");
  const { classified, relevant, totalCost: classifyCost } = await stage2Classify();
  console.log(
    `  Classified ${classified}, relevant: ${relevant}, cost: $${classifyCost.toFixed(4)}`,
  );

  // Stage 3: Summarize
  console.log("\n--- Stage 3: Summarize (Gemini Flash) ---");
  const { summarized, totalCost: summarizeCost } = await stage3Summarize();
  console.log(`  Summarized ${summarized}, cost: $${summarizeCost.toFixed(4)}`);

  // Cost alert check
  const totalCost = classifyCost + summarizeCost;
  await checkCostAlert(totalCost);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n=== fetch-hn completed in ${elapsed}s (total LLM cost: $${totalCost.toFixed(4)}) ===`,
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

export { stage1Fetch, stage2Classify, stage3Summarize, main };
