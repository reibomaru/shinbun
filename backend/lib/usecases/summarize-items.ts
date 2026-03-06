import type { PrismaClient } from "@prisma/client";
import type { SummarizeInput } from "../processors/summarize.js";
import { summarizeItem } from "../processors/summarize.js";

/**
 * 未要約の item を1件ずつ要約 → 即座に DB へ永続化
 * LLM コストを無駄にしないため、バッチ完了を待たず都度コミットする
 */
export async function summarizeItems(
  prisma: PrismaClient,
): Promise<{ summarized: number; totalCost: number }> {
  const BATCH_SIZE = 10;
  let summarizedCount = 0;
  let failedCount = 0;
  let totalCost = 0;
  let totalProcessed = 0;

  // 10件ずつ取得して処理。コネクション確保のオーバーヘッドを抑える
  for (;;) {
    const items = await prisma.item.findMany({
      where: {
        status: "pending",
      },
      include: {
        rawEvent: true,
        labels: true,
      },
      orderBy: { importanceScore: "desc" },
      take: BATCH_SIZE,
    });

    if (items.length === 0) {
      if (totalProcessed === 0) {
        console.log("  No items to summarize, skipping Stage 3");
      }
      break;
    }

    if (totalProcessed === 0) {
      const pendingCount = await prisma.item.count({ where: { status: "pending" } });
      console.log(`  Summarizing ${pendingCount} items (batch size: ${BATCH_SIZE})...`);
    }

    for (const item of items) {
      totalProcessed++;
      const topicLabel = item.labels.find((l) => l.labelType === "topic");
      const input: SummarizeInput = {
        title: item.title,
        url: item.url,
        topic: topicLabel?.labelValue ?? "unknown",
        payload: item.rawEvent.payload as Record<string, unknown>,
      };

      process.stdout.write(
        `\r  Summarizing... [${totalProcessed}] (✓${summarizedCount} ✗${failedCount})`,
      );

      // 1件ずつ要約 → DB書き込み（トランザクション不使用でコネクション確保のオーバーヘッドを排除）
      // entity upsert → item update の順で書き込み、全て成功してから processed にする
      try {
        const result = await summarizeItem(input);
        totalCost += result.llmCost;

        for (const entity of result.entities) {
          const dbEntity = await prisma.entity.upsert({
            where: {
              entityType_name: {
                entityType: entity.type,
                name: entity.name,
              },
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
  }

  if (totalProcessed > 0) {
    process.stdout.write(
      `\r  Summarizing... done (✓${summarizedCount} ✗${failedCount})\n`,
    );
  }

  return { summarized: summarizedCount, totalCost };
}
