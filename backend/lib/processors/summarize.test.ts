import { describe, it, expect, vi, beforeEach } from "vitest";

// withRetry をリトライなしでパススルー（テスト高速化）
vi.mock("../retry.js", () => ({
  withRetry: vi.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../anthropic.js", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
  MODELS: {
    HAIKU: "claude-haiku-4-5-20250315",
    SONNET: "claude-sonnet-4-6-20250514",
  },
}));

import { anthropic, MODELS } from "../anthropic.js";
import { summarizeItem, summarizeBatch } from "./summarize.js";

const mockCreate = anthropic.messages.create as ReturnType<typeof vi.fn>;

function makeSummaryResponse(overrides = {}) {
  return {
    summaryShort: "Claude 4がリリースされました。",
    summaryMedium:
      "Anthropicが最新のAIモデルClaude 4をリリースしました。性能が大幅に向上しています。",
    keyPoints: ["高性能化", "コスト削減", "新機能追加"],
    whyItMatters: "AI開発の新しいスタンダードになる可能性があります。",
    entities: [
      {
        name: "Claude",
        type: "model",
        role: "新しくリリースされたAIモデル",
        confidence: 0.95,
      },
    ],
    ...overrides,
  };
}

describe("summarizeItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Sonnet で正常に要約する", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(makeSummaryResponse()) }],
      usage: { input_tokens: 500, output_tokens: 300 },
    });

    const result = await summarizeItem({
      title: "Claude 4 released",
      url: "https://example.com",
      topic: "genai",
      payload: {},
    });

    expect(result.summaryShort).toContain("Claude 4");
    expect(result.keyPoints).toHaveLength(3);
    expect(result.entities).toHaveLength(1);
    expect(result.modelUsed).toBe(MODELS.SONNET);
    expect(result.llmCost).toBeGreaterThan(0);
    // Sonnet で1回だけ呼ばれる
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: MODELS.SONNET }),
    );
  });

  it("Sonnet 失敗時に Haiku にフォールバックする", async () => {
    mockCreate
      .mockRejectedValueOnce(new Error("Sonnet overloaded"))
      .mockResolvedValue({
        content: [
          { type: "text", text: JSON.stringify(makeSummaryResponse()) },
        ],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

    const result = await summarizeItem({
      title: "Test fallback",
      url: "https://example.com",
      topic: "frontend",
      payload: {},
    });

    expect(result.modelUsed).toBe(MODELS.HAIKU);
    // withRetry モック済み: Sonnet 1回失敗 + Haiku 1回成功 = 2回
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("エンティティ抽出結果を正しくパースする", async () => {
    const response = makeSummaryResponse({
      entities: [
        { name: "React", type: "library", role: "UIフレームワーク", confidence: 0.9 },
        { name: "Vercel", type: "company", role: "ホスティング", confidence: 0.85 },
      ],
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(response) }],
      usage: { input_tokens: 500, output_tokens: 300 },
    });

    const result = await summarizeItem({
      title: "React + Vercel news",
      url: "https://example.com",
      topic: "frontend",
      payload: {},
    });

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].name).toBe("React");
    expect(result.entities[1].name).toBe("Vercel");
  });
});

describe("summarizeBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("バッチ処理で複数アイテムを要約する", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(makeSummaryResponse()) }],
      usage: { input_tokens: 500, output_tokens: 300 },
    });

    const items = Array.from({ length: 4 }, (_, i) => ({
      title: `Article ${i}`,
      url: `https://example.com/${i}`,
      topic: "genai",
      payload: {},
    }));

    const results = await summarizeBatch(items, 2);

    expect(results).toHaveLength(4);
    expect(results.every((r) => !("error" in r))).toBe(true);
  });

  it("一部失敗時もエラーオブジェクトを返す", async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [
          { type: "text", text: JSON.stringify(makeSummaryResponse()) },
        ],
        usage: { input_tokens: 500, output_tokens: 300 },
      })
      // 2つ目: Sonnet失敗 → Haiku も失敗
      .mockRejectedValue(new Error("All models failed"));

    const items = [
      { title: "Good", url: "https://example.com/1", topic: "genai", payload: {} },
      { title: "Bad", url: "https://example.com/2", topic: "genai", payload: {} },
    ];

    const results = await summarizeBatch(items, 5);

    expect(results).toHaveLength(2);
    expect("error" in results[1]).toBe(true);
  });
});
