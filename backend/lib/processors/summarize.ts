import { z } from "zod";
import { gemini, MODELS } from "../gemini.js";
import { withRetry } from "../retry.js";

const EntitySchema = z.object({
  name: z.string(),
  type: z.string(),
  role: z.string(),
  confidence: z.number().min(0).max(1),
});

const SummarySchema = z.object({
  summaryShort: z.string(),
  summaryMedium: z.string(),
  keyPoints: z.array(z.string()).min(1).max(5),
  whyItMatters: z.string(),
  entities: z.array(EntitySchema),
});

export type SummaryResult = z.infer<typeof SummarySchema> & {
  llmCost: number;
  modelUsed: string;
};

export type EntityResult = z.infer<typeof EntitySchema>;

export interface SummarizeInput {
  title: string;
  url: string;
  topic: string;
  payload: Record<string, unknown>;
}

const SUMMARIZE_SYSTEM_PROMPT = `You are a tech news summarizer for a Japanese audience.
Summarize the given article in Japanese.
Respond with ONLY a JSON object (no markdown, no explanation).`;

function buildSummarizeUserPrompt(input: SummarizeInput): string {
  const payloadText = input.payload._text ? String(input.payload._text).slice(0, 2000) : "";

  return `Summarize this ${input.topic} article in Japanese:
Title: ${input.title}
URL: ${input.url}
${payloadText ? `Content excerpt: ${payloadText}` : ""}

Return JSON with these fields:
- summaryShort (string): 1-2 sentence summary in Japanese
- summaryMedium (string): 3-5 sentence summary in Japanese
- keyPoints (string[]): 3 bullet points in Japanese
- whyItMatters (string): 1 sentence explaining why this matters, in Japanese
- entities (array): Mentioned tech entities with { name, type ("library"|"model"|"company"|"repo"|"other"), role (brief description), confidence (0-1) }`;
}

/**
 * 単一記事を要約（Flash → Flash Lite フォールバック）
 */
export async function summarizeItem(input: SummarizeInput): Promise<SummaryResult> {
  // Flash で試行
  try {
    return await callSummarize(input, MODELS.FLASH);
  } catch (flashErr) {
    console.warn(
      `[Summarize] Flash failed for "${input.title}", falling back to Flash Lite:`,
      flashErr,
    );
  }

  // Flash Lite にフォールバック
  return await callSummarize(input, MODELS.FLASH_LITE);
}

async function callSummarize(input: SummarizeInput, model: string): Promise<SummaryResult> {
  const response = await withRetry(
    () =>
      gemini.models.generateContent({
        model,
        contents: buildSummarizeUserPrompt(input),
        config: {
          systemInstruction: SUMMARIZE_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
        },
      }),
    { maxRetries: 3, baseDelayMs: 1000 },
  );

  const text = response.text ?? "";
  const parsed = SummarySchema.parse(JSON.parse(text));

  // Gemini 無料枠なのでコスト 0
  return { ...parsed, llmCost: 0, modelUsed: model };
}

/**
 * バッチ要約（並列度制限付き）
 */
export async function summarizeBatch(
  items: SummarizeInput[],
  concurrency = 3,
): Promise<(SummaryResult | { error: string })[]> {
  const results: (SummaryResult | { error: string })[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(chunk.map((item) => summarizeItem(item)));

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({ error: String(result.reason) });
      }
    }
  }

  return results;
}
