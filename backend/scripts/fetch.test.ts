import { beforeEach, describe, expect, it, vi } from "vitest";

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
      createMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import { prisma } from "../lib/db/client.js";
import { deduplicateEvents, saveEvents, syncSources } from "../lib/sources.js";

const mockSource = prisma.source as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

const mockRawEvent = prisma.rawEvent as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createMany: ReturnType<typeof vi.fn>;
};

describe("syncSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("@@unique([type, name]) を使った upsert でソースを同期する", async () => {
    const sourceData = {
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
    };
    mockSource.upsert.mockResolvedValue(sourceData);

    const config = {
      type: "rss" as const,
      name: "Test RSS",
      config: { url: "https://example.com/feed" },
      polling_interval: 1800,
    };
    const result = await syncSources([config]);

    expect(result).toHaveLength(1);
    expect(result[0].source.id).toBe("new-id");
    expect(result[0].config).toBe(config);
    expect(mockSource.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type_name: { type: "rss", name: "Test RSS" } },
        create: expect.objectContaining({ name: "Test RSS" }),
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

  it("createMany + skipDuplicates で一括保存する", async () => {
    mockRawEvent.createMany.mockResolvedValue({ count: 2 });

    const events = [
      {
        externalId: "id-1",
        url: "https://example.com/1",
        title: "Event 1",
        publishedAt: new Date("2025-01-15T00:00:00Z"),
        payload: { key: "val1" },
      },
      {
        externalId: "id-2",
        url: "https://example.com/2",
        title: "Event 2",
        publishedAt: null,
        payload: { key: "val2" },
      },
    ];

    const saved = await saveEvents("source-1", events);
    expect(saved).toBe(2);
    expect(mockRawEvent.createMany).toHaveBeenCalledTimes(1);
    expect(mockRawEvent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: expect.arrayContaining([
          expect.objectContaining({ sourceId: "source-1", externalId: "id-1" }),
          expect.objectContaining({ sourceId: "source-1", externalId: "id-2" }),
        ]),
      }),
    );
  });

  it("空配列には0を返しDBアクセスしない", async () => {
    const saved = await saveEvents("source-1", []);
    expect(saved).toBe(0);
    expect(mockRawEvent.createMany).not.toHaveBeenCalled();
  });
});
