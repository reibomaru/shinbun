import type { PrismaClient } from "@prisma/client";
import { summarizeItem } from "../processors/summarize.js";
import type { SummarizeInput } from "../processors/summarize.js";

/**
 * 未要約の item を1件ずつ要約 → 即座に DB へ永続化
 * LLM コストを無駄にしないため、バッチ完了を待たず都度コミットする
 */
export async function summarizeItems(
  prisma: PrismaClient,
): Promise<{ summarized: number; totalCost: number }> {
  // pending ステータスの item を重要度順で最大100件取得
  const items = await prisma.item.findMany({
    where: {
      status: "pending",
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

  let summarizedCount = 0;
  let failedCount = 0;
  let totalCost = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const topicLabel = item.labels.find((l) => l.labelType === "topic");
    const input: SummarizeInput = {
      title: item.title,
      url: item.url,
      topic: topicLabel?.labelValue ?? "unknown",
      payload: item.rawEvent.payload as Record<string, unknown>,
    };

    process.stdout.write(
      `\r  Summarizing... [${i + 1}/${items.length}] (✓${summarizedCount} ✗${failedCount})`,
    );

    // 1件ずつ要約 → 即永続化
    try {
      const result = await summarizeItem(input);
      totalCost += result.llmCost;

      // item 更新 + entity 作成をトランザクションで永続化
      await prisma.$transaction(async (tx) => {
        await tx.item.update({
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

        for (const entity of result.entities) {
          const dbEntity = await tx.entity.upsert({
            where: {
              entityType_name: { entityType: entity.type, name: entity.name },
            },
            create: { entityType: entity.type, name: entity.name },
            update: {},
          });

          await tx.itemEntity.upsert({
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
      });

      summarizedCount++;
    } catch (err) {
      failedCount++;
      console.warn(`\n  ✗ Failed for "${item.title}": ${err}`);
      await prisma.item.update({
        where: { id: item.id },
        data: { status: "llm_error" },
      });
    }
  }

  process.stdout.write(
    `\r  Summarizing... [${items.length}/${items.length}] (✓${summarizedCount} ✗${failedCount})\n`,
  );

  return { summarized: summarizedCount, totalCost };
}
