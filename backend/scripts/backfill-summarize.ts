/**
 * content未設定の過去記事をClaude CLIで再要約するスクリプト
 *
 * Usage:
 *   bun backend/scripts/backfill-summarize.ts              # 全件処理
 *   bun backend/scripts/backfill-summarize.ts --dry-run    # 対象一覧のみ表示
 *   bun backend/scripts/backfill-summarize.ts --limit 5    # 最大5件のみ処理
 */
import { $ } from "bun";
import { prisma } from "../lib/db/client.js";
import { extractArticleText } from "../lib/fetchers/extract-content.js";

// --- CLI args ---
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0;
const sleepIdx = args.indexOf("--sleep");
const SLEEP_SEC = sleepIdx >= 0 ? Number(args[sleepIdx + 1]) : 2;

const _SYSTEM_PROMPT = `You are a tech news summarizer for a Japanese audience.
Summarize the given article in Japanese.
Respond with ONLY a JSON object (no markdown, no explanation).`;

function buildPrompt(title: string, url: string, topic: string, content: string | null): string {
  const contentSection = content ? `Content excerpt: ${content.slice(0, 2000)}` : "";

  return `Summarize this ${topic} article in Japanese:
Title: ${title}
URL: ${url}
${contentSection}

Return JSON with these fields:
- summaryShort (string): 1-2 sentence summary in Japanese
- summaryMedium (string): 3-5 sentence summary in Japanese
- keyPoints (string[]): 3 bullet points in Japanese
- whyItMatters (string): 1 sentence explaining why this matters, in Japanese
- entities (array): Mentioned tech entities with { name, type ("library"|"model"|"company"|"repo"|"other"), role (brief description), confidence (0-1) }`;
}

interface SummaryResult {
  summaryShort: string;
  summaryMedium: string;
  keyPoints: string[];
  whyItMatters: string;
  entities: { name: string; type: string; role: string; confidence: number }[];
}

async function main() {
  // Step 1: 対象アイテム一覧を取得
  console.log("=== Fetching items without content... ===");

  const items = await prisma.item.findMany({
    where: {
      status: "processed",
      rawEvent: { content: null },
    },
    include: {
      rawEvent: { select: { id: true, url: true } },
      labels: { where: { labelType: "topic" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const total = items.length;
  console.log(`Found ${total} items to process`);

  if (total === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (DRY_RUN) {
    console.log("\n--- Items (dry-run) ---");
    for (const item of items) {
      console.log(`  - ${item.title}`);
      console.log(`    ${item.url}`);
    }
    return;
  }

  // Step 2: ループ処理
  let success = 0;
  let fail = 0;
  const processCount = LIMIT > 0 ? Math.min(LIMIT, total) : total;

  for (let i = 0; i < processCount; i++) {
    const item = items[i];
    const topic = item.labels[0]?.labelValue ?? "unknown";

    console.log(`\n[${i + 1}/${processCount}] ${item.title}`);

    // Step 2a: コンテンツ抽出
    let content: string | null = null;
    if (item.rawEvent.url) {
      console.log("  Extracting content...");
      try {
        content = await extractArticleText(item.rawEvent.url);
        if (content) {
          await prisma.rawEvent.update({
            where: { id: item.rawEvent.id },
            data: { content },
          });
          console.log(`  Content extracted (${content.length} chars)`);
        } else {
          console.log("  Content extraction returned null, continuing with title only");
        }
      } catch (_err) {
        console.log("  Content extraction failed, continuing with title only");
      }
    }

    // Step 2b: Claude CLIで要約
    console.log("  Summarizing with Claude...");
    const prompt = buildPrompt(item.title, item.url, topic, content);

    let summary: SummaryResult;
    try {
      const result = await $`claude -p --model claude-sonnet-4-6 ${prompt}`.text();

      // claude -p の出力からJSONを抽出
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }
      summary = JSON.parse(jsonMatch[0]);

      if (!summary.summaryShort) {
        throw new Error("Invalid summary: missing summaryShort");
      }
      console.log("  Summary generated successfully");
    } catch (err) {
      console.log(`  ✗ Claude CLI failed: ${err}`);
      fail++;
      continue;
    }

    // Step 2c: DB更新（Entity + Item）
    console.log("  Updating database...");
    try {
      for (const entity of summary.entities ?? []) {
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
          summaryShort: summary.summaryShort,
          summaryMedium: summary.summaryMedium,
          keyPoints: summary.keyPoints,
          whyItMatters: summary.whyItMatters,
          llmModelUsed: "claude-sonnet-4-6",
          status: "processed",
        },
      });

      console.log("  ✓ Done");
      success++;
    } catch (err) {
      console.log(`  ✗ DB update failed: ${err}`);
      fail++;
    }

    // レート制限対策
    if (i < processCount - 1) {
      await Bun.sleep(SLEEP_SEC * 1000);
    }
  }

  console.log(`\n=== Backfill complete ===`);
  console.log(`  Total: ${processCount}, Success: ${success}, Failed: ${fail}`);
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
