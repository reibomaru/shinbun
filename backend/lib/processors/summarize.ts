import { z } from "zod";
import { anthropic, MODELS } from "../anthropic.js";
import { withRetry } from "../retry.js";

const EntitySchema = z.object({
  name: z.string(),
  type: z.enum(["library", "model", "company", "repo"]),
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

/** Sonnet の入出力トークンから USD コストを計算 */
function calculateSonnetCost(inputTokens: number, outputTokens: number): number {
  // Claude Sonnet 4.6: $3.00/MTok input, $15.00/MTok output
  return (inputTokens * 3.0 + outputTokens * 15.0) / 1_000_000;
}

/** Haiku の入出力トークンから USD コストを計算 */
function calculateHaikuCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 0.8 + outputTokens * 4.0) / 1_000_000;
}

const SUMMARIZE_SYSTEM_PROMPT = `You are a tech news summarizer for a Japanese audience.
Summarize the given article in Japanese.
Respond with ONLY a JSON object (no markdown, no explanation).`;

function buildSummarizeUserPrompt(input: SummarizeInput): string {
  const payloadText = input.payload._text
    ? String(input.payload._text).slice(0, 2000)
    : "";

  return `Summarize this ${input.topic} article in Japanese:
Title: ${input.title}
URL: ${input.url}
${payloadText ? `Content excerpt: ${payloadText}` : ""}

Return JSON with these fields:
- summaryShort (string): 1-2 sentence summary in Japanese
- summaryMedium (string): 3-5 sentence summary in Japanese
- keyPoints (string[]): 3 bullet points in Japanese
- whyItMatters (string): 1 sentence explaining why this matters, in Japanese
- entities (array): Mentioned tech entities with { name, type ("library"|"model"|"company"|"repo"), role (brief description), confidence (0-1) }`;
}

/**
 * 単一記事を要約（Sonnet → Haiku フォールバック）
 */
export async function summarizeItem(input: SummarizeInput): Promise<SummaryResult> {
  // Sonnet で試行
  try {
    return await callSummarize(input, MODELS.SONNET, calculateSonnetCost);
  } catch (sonnetErr) {
    console.warn(
      `[Summarize] Sonnet failed for "${input.title}", falling back to Haiku:`,
      sonnetErr,
    );
  }

  // Haiku にフォールバック
  return await callSummarize(input, MODELS.HAIKU, calculateHaikuCost);
}

async function callSummarize(
  input: SummarizeInput,
  model: string,
  costFn: (input: number, output: number) => number,
): Promise<SummaryResult> {
  const response = await withRetry(
    () =>
      anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: SUMMARIZE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildSummarizeUserPrompt(input) }],
      }),
    { maxRetries: 3, baseDelayMs: 1000 },
  );

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = SummarySchema.parse(JSON.parse(text));
  const llmCost = costFn(
    response.usage.input_tokens,
    response.usage.output_tokens,
  );

  return { ...parsed, llmCost, modelUsed: model };
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
    const chunkResults = await Promise.allSettled(
      chunk.map((item) => summarizeItem(item)),
    );

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
