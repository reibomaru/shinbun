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

import { anthropic } from "../anthropic.js";
import { classifyItem, classifyBatch } from "./classify.js";

const mockCreate = anthropic.messages.create as ReturnType<typeof vi.fn>;

function makeClassifyResponse(overrides = {}) {
  return {
    isRelevant: true,
    topic: "genai",
    format: "announcement",
    isUrgent: false,
    contentQuality: 0.8,
    ...overrides,
  };
}

describe("classifyItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常な分類結果を返す", async () => {
    const responseData = makeClassifyResponse();
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(responseData) }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await classifyItem({
      title: "Anthropic launches Claude 4",
      url: "https://example.com/claude4",
      hnScore: 500,
      commentCount: 200,
    });

    expect(result.isRelevant).toBe(true);
    expect(result.topic).toBe("genai");
    expect(result.format).toBe("announcement");
    expect(result.llmCost).toBeGreaterThan(0);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("不正な JSON の場合はエラーを throw する", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    await expect(
      classifyItem({
        title: "Test",
        url: "https://example.com",
        hnScore: 10,
        commentCount: 0,
      }),
    ).rejects.toThrow();
  });
});

describe("classifyBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("複数アイテムをバッチ処理する", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(makeClassifyResponse()) },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const items = Array.from({ length: 3 }, (_, i) => ({
      title: `Article ${i}`,
      url: `https://example.com/${i}`,
      hnScore: 100,
      commentCount: 10,
    }));

    const results = await classifyBatch(items, 2);

    expect(results).toHaveLength(3);
    expect(results.every((r) => !("error" in r))).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("一部失敗時もエラーオブジェクトを返す", async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(makeClassifyResponse()) }],
        usage: { input_tokens: 100, output_tokens: 50 },
      })
      .mockRejectedValueOnce(new Error("API error"));

    const items = [
      { title: "Good", url: "https://example.com/1", hnScore: 100, commentCount: 10 },
      { title: "Bad", url: "https://example.com/2", hnScore: 100, commentCount: 10 },
    ];

    const results = await classifyBatch(items, 5);

    expect(results).toHaveLength(2);
    expect("error" in results[1]).toBe(true);
  });
});
