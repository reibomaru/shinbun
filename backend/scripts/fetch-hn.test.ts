import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("../lib/db/client.js", () => {
  const p = {
    source: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    rawEvent: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    item: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    itemLabel: {
      createMany: vi.fn(),
    },
    entity: {
      upsert: vi.fn(),
    },
    itemEntity: {
      upsert: vi.fn(),
    },
    // $transaction はコールバックに prisma 自身を渡す
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(p)),
    $disconnect: vi.fn(),
  };
  return { prisma: p };
});

vi.mock("../lib/config.js", () => ({
  loadSources: vi.fn().mockReturnValue([
    {
      type: "hackernews",
      name: "HN Top Stories",
      config: { mode: "top", min_score: 50 },
      polling_interval: 1800,
    },
  ]),
  loadSettings: vi.fn().mockReturnValue({
    digest: { time: "08:00", timezone: "Asia/Tokyo", top_count: 5, total_count: 20 },
    cost_alert: { daily_usd: 5 },
  }),
  loadWatchlist: vi.fn().mockReturnValue({ entities: [], keywords: [] }),
}));

vi.mock("../lib/processors/classify.js", () => ({
  classifyBatch: vi.fn(),
}));

vi.mock("../lib/processors/summarize.js", () => ({
  summarizeItem: vi.fn(),
}));

vi.mock("../lib/slack.js", () => ({
  sendUrgentAlert: vi.fn(),
  sendCostAlert: vi.fn(),
}));

vi.mock("../lib/fetchers/index.js", () => ({
  fetchSource: vi.fn(),
}));

vi.mock("../lib/sources.js", () => ({
  syncSources: vi.fn(),
  deduplicateEvents: vi.fn(),
  saveEvents: vi.fn(),
}));

import { prisma } from "../lib/db/client.js";
import { classifyBatch } from "../lib/processors/classify.js";
import { summarizeItem } from "../lib/processors/summarize.js";
import { sendUrgentAlert, sendCostAlert } from "../lib/slack.js";
import { fetchSource } from "../lib/fetchers/index.js";
import { syncSources, deduplicateEvents, saveEvents } from "../lib/sources.js";
import { stage1Fetch, stage2Classify, stage3Summarize } from "./fetch-hn.js";

const mockSyncSources = syncSources as ReturnType<typeof vi.fn>;
const mockFetchSource = fetchSource as ReturnType<typeof vi.fn>;
const mockDedup = deduplicateEvents as ReturnType<typeof vi.fn>;
const mockSaveEvents = saveEvents as ReturnType<typeof vi.fn>;
const mockClassifyBatch = classifyBatch as ReturnType<typeof vi.fn>;
const mockSummarizeItem = summarizeItem as ReturnType<typeof vi.fn>;

const mockRawEvent = prisma.rawEvent as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
const mockItem = prisma.item as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  aggregate: ReturnType<typeof vi.fn>;
};
const mockItemLabel = prisma.itemLabel as unknown as {
  createMany: ReturnType<typeof vi.fn>;
};
const mockEntity = prisma.entity as unknown as {
  upsert: ReturnType<typeof vi.fn>;
};
const mockItemEntity = prisma.itemEntity as unknown as {
  upsert: ReturnType<typeof vi.fn>;
};

describe("stage1Fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("HN ソースをフェッチして保存する", async () => {
    const source = {
      id: "src-1",
      type: "hackernews",
      name: "HN Top Stories",
      lastFetchedAt: null,
    };
    mockSyncSources.mockResolvedValue([
      { source, config: { type: "hackernews", name: "HN Top Stories", config: { mode: "top", min_score: 50 }, polling_interval: 1800 } },
    ]);
    mockFetchSource.mockResolvedValue({
      ok: true,
      events: [{ externalId: "hn-1", url: "https://example.com", title: "Test", publishedAt: null, payload: {} }],
    });
    mockDedup.mockResolvedValue([
      { externalId: "hn-1", url: "https://example.com", title: "Test", publishedAt: null, payload: {} },
    ]);
    mockSaveEvents.mockResolvedValue(1);

    const result = await stage1Fetch();

    expect(result.savedCount).toBe(1);
    expect(mockSyncSources).toHaveBeenCalledTimes(1);
    expect(mockFetchSource).toHaveBeenCalledTimes(1);
    expect(mockSaveEvents).toHaveBeenCalledTimes(1);
  });
});

describe("stage2Classify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未処理 raw_event を分類して item + item_label を作成する（retryCount < 3 のみ）", async () => {
    mockRawEvent.findMany.mockResolvedValue([
      {
        id: "re-1",
        sourceId: "src-1",
        payload: { _title: "AI News", _url: "https://example.com/ai", score: 200, descendants: 50, _publishedAt: "2025-06-01T00:00:00Z" },
        source: { type: "hackernews" },
      },
    ]);

    mockClassifyBatch.mockResolvedValue([
      {
        isRelevant: true,
        topic: "genai",
        format: "announcement",
        isUrgent: false,
        contentQuality: 0.8,
        llmCost: 0.001,
      },
    ]);

    mockItem.create.mockResolvedValue({ id: "item-1" });
    mockItemLabel.createMany.mockResolvedValue({ count: 2 });
    mockRawEvent.update.mockResolvedValue({});

    const result = await stage2Classify();

    expect(result.classified).toBe(1);
    expect(result.relevant).toBe(1);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(mockItem.create).toHaveBeenCalledTimes(1);
    expect(mockItemLabel.createMany).toHaveBeenCalledTimes(1);
    expect(mockRawEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "re-1" }, data: { processed: true } }),
    );

    // retryCount < 3 フィルタが適用されていることを検証
    expect(mockRawEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          processed: false,
          retryCount: { lt: 3 },
        }),
      }),
    );
  });

  it("isRelevant=false のイベントは item を作成しない", async () => {
    mockRawEvent.findMany.mockResolvedValue([
      {
        id: "re-1",
        sourceId: "src-1",
        payload: { _title: "Off topic", _url: "https://example.com", score: 10, descendants: 0 },
        source: { type: "hackernews" },
      },
    ]);

    mockClassifyBatch.mockResolvedValue([
      {
        isRelevant: false,
        topic: "backend",
        format: "tutorial",
        isUrgent: false,
        contentQuality: 0.3,
        llmCost: 0.0005,
      },
    ]);

    mockRawEvent.update.mockResolvedValue({});

    const result = await stage2Classify();

    expect(result.relevant).toBe(0);
    expect(mockItem.create).not.toHaveBeenCalled();
  });

  it("isUrgent=true の記事は Slack 通知を送信する", async () => {
    mockRawEvent.findMany.mockResolvedValue([
      {
        id: "re-1",
        sourceId: "src-1",
        payload: { _title: "Critical CVE", _url: "https://example.com/cve", score: 500, descendants: 100, _publishedAt: "2025-06-01T00:00:00Z" },
        source: { type: "hackernews" },
      },
    ]);

    mockClassifyBatch.mockResolvedValue([
      {
        isRelevant: true,
        topic: "security",
        format: "incident",
        isUrgent: true,
        contentQuality: 0.9,
        llmCost: 0.001,
      },
    ]);

    mockItem.create.mockResolvedValue({ id: "item-1" });
    mockItemLabel.createMany.mockResolvedValue({ count: 2 });
    mockRawEvent.update.mockResolvedValue({});

    await stage2Classify();

    expect(sendUrgentAlert).toHaveBeenCalledTimes(1);
    expect(sendUrgentAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Critical CVE", topic: "security" }),
    );
  });

  it("分類失敗時に retryCount をインクリメントし lastError を記録する", async () => {
    mockRawEvent.findMany.mockResolvedValue([
      {
        id: "re-1",
        sourceId: "src-1",
        payload: { _title: "Broken Item", _url: "https://example.com/broken", score: 10, descendants: 0 },
        source: { type: "hackernews" },
      },
    ]);

    mockClassifyBatch.mockResolvedValue([
      { error: "SyntaxError: Unexpected end of JSON input" },
    ]);

    mockRawEvent.update.mockResolvedValue({});

    const result = await stage2Classify();

    expect(result.relevant).toBe(0);
    expect(mockItem.create).not.toHaveBeenCalled();
    expect(mockRawEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "re-1" },
        data: expect.objectContaining({
          retryCount: { increment: 1 },
          lastError: expect.stringContaining("SyntaxError"),
        }),
      }),
    );
  });
});

describe("stage3Summarize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未要約の item を要約して entity を作成する", async () => {
    mockItem.findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "AI News",
        url: "https://example.com/ai",
        rawEvent: { payload: {} },
        labels: [{ labelType: "topic", labelValue: "genai" }],
      },
    ]);

    mockSummarizeItem.mockResolvedValue({
      summaryShort: "AI ニュース要約",
      summaryMedium: "詳細な要約テキスト",
      keyPoints: ["ポイント1", "ポイント2", "ポイント3"],
      whyItMatters: "重要な理由",
      entities: [
        { name: "Claude", type: "model", role: "AIモデル", confidence: 0.95 },
      ],
      llmCost: 0.005,
      modelUsed: "gemini-2.5-flash",
    });

    mockItem.update.mockResolvedValue({});
    mockEntity.upsert.mockResolvedValue({ id: "entity-1" });
    mockItemEntity.upsert.mockResolvedValue({});

    const result = await stage3Summarize();

    expect(result.summarized).toBe(1);
    expect(result.totalCost).toBe(0.005);
    expect(mockSummarizeItem).toHaveBeenCalledTimes(1);
    expect(mockItem.update).toHaveBeenCalledTimes(1);
    expect(mockEntity.upsert).toHaveBeenCalledTimes(1);
    expect(mockItemEntity.upsert).toHaveBeenCalledTimes(1);
  });

  it("status: pending でクエリすることを検証", async () => {
    mockItem.findMany.mockResolvedValue([]);

    await stage3Summarize();

    expect(mockItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending",
        }),
      }),
    );
  });

  it("要約するアイテムがない場合はスキップする", async () => {
    mockItem.findMany.mockResolvedValue([]);

    const result = await stage3Summarize();

    expect(result.summarized).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(mockSummarizeItem).not.toHaveBeenCalled();
  });

  it("要約失敗時に status を llm_error に設定する", async () => {
    mockItem.findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "Broken Summary",
        url: "https://example.com/broken",
        rawEvent: { payload: {} },
        labels: [{ labelType: "topic", labelValue: "genai" }],
      },
    ]);

    mockSummarizeItem.mockRejectedValue(
      new SyntaxError("Unexpected end of JSON input"),
    );

    mockItem.update.mockResolvedValue({});

    const result = await stage3Summarize();

    expect(result.summarized).toBe(0);
    expect(mockItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: { status: "llm_error" },
      }),
    );
  });
});
