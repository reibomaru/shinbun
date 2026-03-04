import type { PrismaClient } from "@prisma/client";
import { normalizeUrl } from "../url.js";
import { classifyBatch } from "../processors/classify.js";
import { calculateImportanceScore } from "../scoring.js";
import { sendUrgentAlert } from "../slack.js";
import type { ClassifyInput } from "../processors/classify.js";

/** ソースタイプごとの信頼度マッピング */
const SOURCE_TRUST: Record<string, number> = {
  hackernews: 0.8,
  rss: 0.7,
  github_release: 0.9,
};

/**
 * 全ソースの未処理 raw_event を Haiku で分類 → item + item_label 作成
 */
export async function classifyEvents(
  prisma: PrismaClient,
): Promise<{ classified: number; relevant: number; totalCost: number }> {
  // 全ソースの未処理 raw_event を取得（リトライ上限 3 回を超えたものはスキップ）
  const unprocessed = await prisma.rawEvent.findMany({
    where: {
      processed: false,
      retryCount: { lt: 3 },
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

  const results = await classifyBatch(classifyInputs, 5, (p) => {
    process.stdout.write(`\r  Classifying... [${p.completed}/${p.total}] (✓${p.succeeded} ✗${p.failed})`);
  });
  process.stdout.write("\n");

  let relevantCount = 0;
  let totalCost = 0;
  const urgentItems: Array<{ title: string; url: string; topic: string; importanceScore: number }> = [];

  for (let i = 0; i < unprocessed.length; i++) {
    const rawEvent = unprocessed[i];
    const result = results[i];

    if ("error" in result) {
      console.warn(`  ✗ Classification failed for ${classifyInputs[i].title}: ${result.error}`);
      await prisma.rawEvent.update({
        where: { id: rawEvent.id },
        data: {
          retryCount: { increment: 1 },
          lastError: String(result.error).slice(0, 500),
        },
      });
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

    // ソース信頼度を動的に決定
    const sourceTrust = SOURCE_TRUST[rawEvent.source.type] ?? 0.5;

    // 重要度スコア計算
    const { score, reason } = calculateImportanceScore({
      sourceTrust,
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
