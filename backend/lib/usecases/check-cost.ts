import type { PrismaClient } from "@prisma/client";
import { loadSettings } from "../config.js";
import { sendCostAlert } from "../slack.js";

/**
 * 日額 LLM コストをチェックし、閾値超過時にアラート送信
 */
export async function checkCost(
  prisma: PrismaClient,
  totalCost: number,
): Promise<void> {
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
