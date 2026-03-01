import { loadSettings, loadSources } from "../lib/config.js";
import { prisma } from "../lib/db/client.js";
import { fetchSource } from "../lib/fetchers/index.js";
import type { ClassifyInput } from "../lib/processors/classify.js";
import { classifyBatch } from "../lib/processors/classify.js";
import type { SummarizeInput } from "../lib/processors/summarize.js";
import { summarizeBatch } from "../lib/processors/summarize.js";
import { calculateImportanceScore } from "../lib/scoring.js";
import { sendCostAlert, sendUrgentAlert } from "../lib/slack.js";
import { deduplicateEvents, saveEvents, syncSources } from "../lib/sources.js";
import { normalizeUrl } from "../lib/url.js";

const HN_SOURCE_TRUST = 0.8;

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

/**
 * Stage 2: 未処理 raw_event を Haiku で分類 → item + item_label 作成
 */
async function stage2Classify() {
  // HN ソースの未処理 raw_event を取得
  const unprocessed = await prisma.rawEvent.findMany({
    where: {
      processed: false,
      source: { type: "hackernews" },
    },
    include: { source: true },
    orderBy: { fetchedAt: "desc" },
  });

  if (unprocessed.length === 0) {
    console.log("  No unprocessed events, skipping Stage 2");
    return { classified: 0, relevant: 0, totalCost: 0 };
  }

  console.log(`  Classifying ${unprocessed.length} events...`);

  // ClassifyInput に変換
  const classifyInputs: ClassifyInput[] = unprocessed.map((re) => ({
    title: String((re.payload as Record<string, unknown>)._title ?? ""),
    url: String((re.payload as Record<string, unknown>)._url ?? ""),
    hnScore: Number((re.payload as Record<string, unknown>).score ?? 0),
    commentCount: Number((re.payload as Record<string, unknown>).descendants ?? 0),
  }));

  const results = await classifyBatch(classifyInputs);

  let relevantCount = 0;
  let totalCost = 0;
  const urgentItems: Array<{ title: string; url: string; topic: string; importanceScore: number }> =
    [];

  for (let i = 0; i < unprocessed.length; i++) {
    const rawEvent = unprocessed[i];
    const result = results[i];

    if ("error" in result) {
      console.warn(`  ✗ Classification failed for ${classifyInputs[i].title}: ${result.error}`);
      // processed を true にしない → 再実行時にリトライされる
      continue;
    }

    // 分類成功時のみ processed に更新
    await prisma.rawEvent.update({
      where: { id: rawEvent.id },
      data: { processed: true },
    });

    totalCost += result.llmCost;

    if (!result.isRelevant) continue;
    relevantCount++;

    const payload = rawEvent.payload as Record<string, unknown>;
    const title = String(payload._title ?? "");
    const url = String(payload._url ?? "");
    const publishedAtStr = payload._publishedAt as string | null;
    const publishedAt = publishedAtStr ? new Date(publishedAtStr) : null;

    // 重要度スコア計算
    const { score, reason } = calculateImportanceScore({
      sourceTrust: HN_SOURCE_TRUST,
      publishedAt,
      engagementScore: Number(payload.score ?? 0),
      contentQuality: result.contentQuality,
      title,
      url,
      topic: result.topic,
      format: result.format,
    });

    // item 作成
    const item = await prisma.item.create({
      data: {
        rawEventId: rawEvent.id,
        itemType: "article",
        title,
        url,
        urlNormalized: normalizeUrl(url),
        publishedAt,
        language: "en",
        importanceScore: score,
        importanceReason: reason,
        isUrgent: result.isUrgent,
        llmModelUsed: "gemini-2.5-flash-lite",
        llmCost: result.llmCost,
      },
    });

    // item_label: topic + format
    await prisma.itemLabel.createMany({
      data: [
        { itemId: item.id, labelType: "topic", labelValue: result.topic },
        { itemId: item.id, labelType: "format", labelValue: result.format },
      ],
    });

    if (result.isUrgent) {
      urgentItems.push({ title, url, topic: result.topic, importanceScore: score });
    }
  }

  // 緊急アラート送信
  for (const item of urgentItems) {
    await sendUrgentAlert(item);
  }

  return { classified: unprocessed.length, relevant: relevantCount, totalCost };
}

/**
 * Stage 3: 上位記事を Sonnet で要約 → item 更新 + entity / item_entity 作成
 */
async function stage3Summarize() {
  // summaryShort が null の item を重要度順で最大100件取得
  const items = await prisma.item.findMany({
    where: {
      summaryShort: null,
      rawEvent: { source: { type: "hackernews" } },
    },
    include: {
      rawEvent: true,
      labels: true,
    },
    orderBy: { importanceScore: "desc" },
    take: 100,
  });

  if (items.length === 0) {
    console.log("  No items to summarize, skipping Stage 3");
    return { summarized: 0, totalCost: 0 };
  }

  console.log(`  Summarizing ${items.length} items...`);

  const summarizeInputs: SummarizeInput[] = items.map((item) => {
    const topicLabel = item.labels.find((l) => l.labelType === "topic");
    return {
      title: item.title,
      url: item.url,
      topic: topicLabel?.labelValue ?? "unknown",
      payload: item.rawEvent.payload as Record<string, unknown>,
    };
  });

  const results = await summarizeBatch(summarizeInputs);

  let summarizedCount = 0;
  let totalCost = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = results[i];

    if ("error" in result) {
      console.warn(`  ✗ Summarization failed for "${item.title}": ${result.error}`);
      continue;
    }

    totalCost += result.llmCost;
    summarizedCount++;

    // item 更新
    await prisma.item.update({
      where: { id: item.id },
      data: {
        summaryShort: result.summaryShort,
        summaryMedium: result.summaryMedium,
        keyPoints: result.keyPoints,
        whyItMatters: result.whyItMatters,
        llmModelUsed: result.modelUsed,
        llmCost: { increment: result.llmCost },
        status: "processed",
      },
    });

    // entity + item_entity 作成
    for (const entity of result.entities) {
      const dbEntity = await prisma.entity.upsert({
        where: {
          entityType_name: { entityType: entity.type, name: entity.name },
        },
        create: { entityType: entity.type, name: entity.name },
        update: {},
      });

      await prisma.itemEntity.upsert({
        where: {
          itemId_entityId: { itemId: item.id, entityId: dbEntity.id },
        },
        create: {
          itemId: item.id,
          entityId: dbEntity.id,
          role: entity.role,
          confidence: entity.confidence,
        },
        update: {
          role: entity.role,
          confidence: entity.confidence,
        },
      });
    }
  }

  return { summarized: summarizedCount, totalCost };
}

/**
 * 日額 LLM コストをチェックし、閾値超過時にアラート送信
 */
async function checkCostAlert(totalCost: number) {
  const settings = loadSettings();
  const threshold = settings.cost_alert.daily_usd;

  // 今日の全 item の llmCost を集計
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const aggregate = await prisma.item.aggregate({
    where: { createdAt: { gte: today } },
    _sum: { llmCost: true },
  });

  const dailyCost = (aggregate._sum.llmCost ?? 0) + totalCost;

  if (dailyCost > threshold) {
    console.warn(`  ⚠ Daily LLM cost $${dailyCost.toFixed(4)} exceeds threshold $${threshold}`);
    await sendCostAlert(dailyCost, threshold);
  }
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
