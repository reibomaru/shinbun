import { z } from "zod";
import { gemini, MODELS } from "../gemini.js";
import { withRetry } from "../retry.js";

/** 分類結果スキーマ */
const ClassificationSchema = z.object({
  isRelevant: z.boolean(),
  topic: z.string(),
  format: z.string(),
  isUrgent: z.boolean(),
  contentQuality: z.number().min(0).max(1),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema> & {
  llmCost: number;
};

export interface ClassifyInput {
  title: string;
  url: string;
  hnScore: number;
  commentCount: number;
}

const CLASSIFY_SYSTEM_PROMPT = `You are a tech news classifier for an AI/Web development news aggregator.
Classify the given article based on its title, URL, HN score, and comment count.
Respond with ONLY a JSON object (no markdown, no explanation).`;

function buildClassifyUserPrompt(input: ClassifyInput): string {
  return `Classify this article:
Title: ${input.title}
URL: ${input.url}
HN Score: ${input.hnScore}
Comments: ${input.commentCount}

Return JSON with these fields:
- isRelevant (boolean): Is this about AI, machine learning, web development, DevOps, or software engineering?
- topic (string): One of "genai", "frontend", "backend", "devtools", "infra", "security", "other"
- format (string): One of "release", "tutorial", "benchmark", "incident", "paper", "announcement", "other"
- isUrgent (boolean): Is this a security vulnerability, major breaking change, or critical incident?
- contentQuality (number 0-1): Estimated quality/importance based on signals`;
}

/**
 * 単一記事を分類
 */
export async function classifyItem(
  input: ClassifyInput,
): Promise<ClassificationResult> {
  const response = await withRetry(
    () =>
      gemini.models.generateContent({
        model: MODELS.FLASH_LITE,
        contents: buildClassifyUserPrompt(input),
        config: {
          systemInstruction: CLASSIFY_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 256,
        },
      }),
    { maxRetries: 3, baseDelayMs: 1000 },
  );

  const text = response.text ?? "";
  const parsed = ClassificationSchema.parse(JSON.parse(text));

  // Gemini 無料枠なのでコスト 0
  return { ...parsed, llmCost: 0 };
}

/**
 * バッチ分類（並列度制限付き）
 */
export async function classifyBatch(
  items: ClassifyInput[],
  concurrency = 5,
): Promise<(ClassificationResult | { error: string })[]> {
  const results: (ClassificationResult | { error: string })[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map((item) => classifyItem(item)),
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
