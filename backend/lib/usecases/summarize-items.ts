import type { PrismaClient } from "@prisma/client";
import { summarizeBatch } from "../processors/summarize.js";
import type { SummarizeInput } from "../processors/summarize.js";

/**
 * 未要約の item を Sonnet で要約 → item 更新 + entity / item_entity 作成
 */
export async function summarizeItems(
  prisma: PrismaClient,
): Promise<{ summarized: number; totalCost: number }> {
  // summaryShort が null の item を重要度順で最大100件取得
  const items = await prisma.item.findMany({
    where: {
      summaryShort: null,
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
