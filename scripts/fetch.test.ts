import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/db/client.js", () => ({
  prisma: {
    source: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    rawEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import { prisma } from "../lib/db/client.js";
import { syncSources, deduplicateEvents, saveEvents } from "./fetch.js";

const mockSource = prisma.source as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

const mockRawEvent = prisma.rawEvent as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

describe("syncSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("新規ソースを作成する", async () => {
    mockSource.findFirst.mockResolvedValue(null);
    mockSource.upsert.mockResolvedValue({
      id: "new-id",
      type: "rss",
      name: "Test RSS",
      config: { url: "https://example.com/feed" },
      pollingInterval: 1800,
      enabled: true,
      lastFetchedAt: null,
      errorCount: 0,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await syncSources([
      {
        type: "rss" as const,
        name: "Test RSS",
        config: { url: "https://example.com/feed" },
        polling_interval: 1800,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new-id");
    expect(mockSource.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "00000000-0000-0000-0000-000000000000" },
        create: expect.objectContaining({ name: "Test RSS" }),
      }),
    );
  });

  it("既存ソースを更新する", async () => {
    mockSource.findFirst.mockResolvedValue({ id: "existing-id" });
    mockSource.upsert.mockResolvedValue({
      id: "existing-id",
      type: "rss",
      name: "Test RSS",
      config: { url: "https://example.com/feed-v2" },
      pollingInterval: 3600,
      enabled: true,
      lastFetchedAt: null,
      errorCount: 0,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await syncSources([
      {
        type: "rss" as const,
        name: "Test RSS",
        config: { url: "https://example.com/feed-v2" },
        polling_interval: 3600,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(mockSource.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "existing-id" },
        update: expect.objectContaining({
          config: { url: "https://example.com/feed-v2" },
        }),
      }),
    );
  });
});

describe("deduplicateEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("既存 externalId を持つイベントを除外する", async () => {
    mockRawEvent.findMany
      .mockResolvedValueOnce([{ externalId: "existing-1" }])
      .mockResolvedValueOnce([]);

    const events = [
      {
        externalId: "existing-1",
        url: "https://example.com/1",
        title: "Existing",
        publishedAt: null,
        payload: { key: "val1" },
      },
      {
        externalId: "new-1",
        url: "https://example.com/2",
        title: "New",
        publishedAt: null,
        payload: { key: "val2" },
      },
    ];

    const result = await deduplicateEvents("source-1", events);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("new-1");
  });

  it("既存 contentHash を持つイベントを除外する", async () => {
    const { contentHash } = await import("../lib/url.js");
    const existingHash = contentHash({ key: "val1" });

    mockRawEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ contentHash: existingHash }]);

    const events = [
      {
        externalId: "id-1",
        url: "https://example.com/1",
        title: "Dup Hash",
        publishedAt: null,
        payload: { key: "val1" },
      },
      {
        externalId: "id-2",
        url: "https://example.com/2",
        title: "Unique",
        publishedAt: null,
        payload: { key: "val2" },
      },
    ];

    const result = await deduplicateEvents("source-1", events);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("id-2");
  });

  it("空配列には空配列を返す", async () => {
    const result = await deduplicateEvents("source-1", []);
    expect(result).toEqual([]);
    expect(mockRawEvent.findMany).not.toHaveBeenCalled();
  });
});

describe("saveEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常にイベントを保存する", async () => {
    mockRawEvent.create.mockResolvedValue({});

    const events = [
      {
        externalId: "id-1",
        url: "https://example.com/1",
        title: "Event 1",
        publishedAt: new Date("2025-01-15T00:00:00Z"),
        payload: { key: "val1" },
      },
    ];

    const saved = await saveEvents("source-1", events);
    expect(saved).toBe(1);
    expect(mockRawEvent.create).toHaveBeenCalledTimes(1);
  });

  it("Unique constraint エラーはスキップする", async () => {
    mockRawEvent.create
      .mockRejectedValueOnce(new Error("Unique constraint failed"))
      .mockResolvedValueOnce({});

    const events = [
      {
        externalId: "dup",
        url: "https://example.com/dup",
        title: "Dup",
        publishedAt: null,
        payload: { key: "dup" },
      },
      {
        externalId: "ok",
        url: "https://example.com/ok",
        title: "OK",
        publishedAt: null,
        payload: { key: "ok" },
      },
    ];

    const saved = await saveEvents("source-1", events);
    expect(saved).toBe(1);
  });
});
