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

/**
 * 未閉じの括弧を閉じる
 */
function closeBrackets(text: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (const ch of text) {
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if ((ch === "}" || ch === "]") && stack.length > 0 && stack[stack.length - 1] === ch) {
      stack.pop();
    }
  }

  return text + stack.reverse().join("");
}

/**
 * LLM 応答の JSON をサニタイズ
 * - マークダウンコードブロック除去
 * - 末尾の不完全 JSON 修復（maxOutputTokens による切り詰め対応）
 *   配列内で切り詰められたケースにも対応
 */
export function sanitizeLlmJson(raw: string): string {
  let text = raw.trim();

  // マークダウンコードブロック除去: ```json ... ``` or ``` ... ```
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  text = text.trim();

  // そのままパースできればそのまま返す
  try { JSON.parse(text); return text; } catch { /* 修復を試みる */ }

  // 最初の '{' を探す
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in LLM response");
  text = text.slice(start);

  // 末尾から '}' を探し、未閉じの括弧を閉じてパースを試みる
  let pos = text.length;
  while (pos > 0) {
    const bracePos = text.lastIndexOf("}", pos - 1);
    if (bracePos === -1) break;

    const candidate = closeBrackets(text.slice(0, bracePos + 1));
    try { JSON.parse(candidate); return candidate; } catch { /* 次の位置を試す */ }

    pos = bracePos;
  }

  throw new Error("Failed to repair truncated JSON from LLM response");
}

async function callSummarize(
  input: SummarizeInput,
  model: string,
): Promise<SummaryResult> {
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

  const text = sanitizeLlmJson(response.text ?? "");
  const parsed = SummarySchema.parse(JSON.parse(text));

  // Gemini 無料枠なのでコスト 0
  return { ...parsed, llmCost: 0, modelUsed: model };
}

export interface BatchProgress {
  completed: number;
  total: number;
  succeeded: number;
  failed: number;
}

/**
 * バッチ要約（並列度制限付き）
 */
export async function summarizeBatch(
  items: SummarizeInput[],
  concurrency = 3,
  onProgress?: (progress: BatchProgress) => void,
): Promise<(SummaryResult | { error: string })[]> {
  const results: (SummaryResult | { error: string })[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map((item) => summarizeItem(item)),
    );

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
        succeeded++;
      } else {
        results.push({ error: String(result.reason) });
        failed++;
      }
    }

    onProgress?.({ completed: results.length, total: items.length, succeeded, failed });
  }

  return results;
}
