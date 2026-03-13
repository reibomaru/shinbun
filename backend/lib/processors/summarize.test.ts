import { beforeEach, describe, expect, it, vi } from "vitest";

// withRetry をリトライなしでパススルー（テスト高速化）
vi.mock("../retry.js", () => ({
  withRetry: vi.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../gemini.js", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
  MODELS: {
    FLASH_LITE: "gemini-2.5-flash-lite",
    FLASH: "gemini-2.5-flash",
  },
}));

import { gemini, MODELS } from "../gemini.js";
import { summarizeBatch, summarizeItem } from "./summarize.js";

const mockGenerateContent = gemini.models.generateContent as ReturnType<typeof vi.fn>;

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

  it("Flash で正常に要約する", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(makeSummaryResponse()),
    });

    const result = await summarizeItem({
      title: "Claude 4 released",
      url: "https://example.com",
      topic: "genai",
      content: null,
    });

    expect(result.summaryShort).toContain("Claude 4");
    expect(result.keyPoints).toHaveLength(3);
    expect(result.entities).toHaveLength(1);
    expect(result.modelUsed).toBe(MODELS.FLASH);
    expect(result.llmCost).toBe(0);
    // Flash で1回だけ呼ばれる
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: MODELS.FLASH }),
    );
  });

  it("Flash 失敗時に Flash Lite にフォールバックする", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("Flash overloaded")).mockResolvedValue({
      text: JSON.stringify(makeSummaryResponse()),
    });

    const result = await summarizeItem({
      title: "Test fallback",
      url: "https://example.com",
      topic: "frontend",
      content: null,
    });

    expect(result.modelUsed).toBe(MODELS.FLASH_LITE);
    // withRetry モック済み: Flash 1回失敗 + Flash Lite 1回成功 = 2回
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("エンティティ抽出結果を正しくパースする", async () => {
    const response = makeSummaryResponse({
      entities: [
        { name: "React", type: "library", role: "UIフレームワーク", confidence: 0.9 },
        { name: "Vercel", type: "company", role: "ホスティング", confidence: 0.85 },
      ],
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(response),
    });

    const result = await summarizeItem({
      title: "React + Vercel news",
      url: "https://example.com",
      topic: "frontend",
      content: null,
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
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(makeSummaryResponse()),
    });

    const items = Array.from({ length: 4 }, (_, i) => ({
      title: `Article ${i}`,
      url: `https://example.com/${i}`,
      topic: "genai",
      content: null,
    }));

    const results = await summarizeBatch(items, 2);

    expect(results).toHaveLength(4);
    expect(results.every((r) => !("error" in r))).toBe(true);
  });

  it("一部失敗時もエラーオブジェクトを返す", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        text: JSON.stringify(makeSummaryResponse()),
      })
      // 2つ目: Flash失敗 → Flash Lite も失敗
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
