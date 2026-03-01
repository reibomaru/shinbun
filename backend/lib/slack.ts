import { withRetry } from "./retry.js";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface UrgentAlertItem {
  title: string;
  url: string;
  topic: string;
  summaryShort?: string | null;
  importanceScore?: number | null;
}

/**
 * Slack webhook にペイロードを送信（リトライ付き）
 */
async function postToSlack(payload: object): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.log("[Slack] SLACK_WEBHOOK_URL not set, skipping notification");
    return;
  }

  await withRetry(
    async () => {
      const res = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Slack webhook failed: ${res.status} ${res.statusText}`);
      }
    },
    { maxRetries: 3, baseDelayMs: 500 },
  );
}

/**
 * 緊急記事の即時通知（Block Kit 形式）
 */
export async function sendUrgentAlert(item: UrgentAlertItem): Promise<void> {
  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 Urgent: AI/Tech Alert",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${item.url}|${item.title}>*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Topic:* ${item.topic}` },
          { type: "mrkdwn", text: `*Score:* ${item.importanceScore ?? "N/A"}` },
        ],
      },
      ...(item.summaryShort
        ? [
            {
              type: "section",
              text: { type: "mrkdwn", text: item.summaryShort },
            },
          ]
        : []),
    ],
  };
  await postToSlack(payload);
}

/**
 * 日額コスト超過アラート
 */
export async function sendCostAlert(dailyCost: number, threshold: number): Promise<void> {
  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "⚠️ LLM Cost Alert",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Daily LLM cost *$${dailyCost.toFixed(4)}* exceeds threshold *$${threshold.toFixed(2)}*`,
        },
      },
    ],
  };
  await postToSlack(payload);
}
