import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ISourceRepository } from "../lib/repositories/source-repository.js";
import type { IRawEventRepository } from "../lib/repositories/raw-event-repository.js";
import { syncSources } from "../lib/usecases/sync-sources.js";
import { deduplicateEvents } from "../lib/usecases/deduplicate-events.js";
import { saveEvents } from "../lib/usecases/save-events.js";

const mockSourceData = {
  id: "new-id",
  type: "rss" as const,
  name: "Test RSS",
  config: { url: "https://example.com/feed" },
  pollingInterval: 1800,
  enabled: true,
  lastFetchedAt: null,
  errorCount: 0,
  lastError: null,
  createdAt: new Date(),
};

function makeSourceRepo(overrides: Partial<ISourceRepository> = {}): ISourceRepository {
  return {
    upsert: vi.fn().mockResolvedValue(mockSourceData),
    updateLastFetched: vi.fn().mockResolvedValue(undefined),
    incrementErrorCount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeRawEventRepo(overrides: Partial<IRawEventRepository> = {}): IRawEventRepository {
  return {
    findExternalIds: vi.fn().mockResolvedValue([]),
    findContentHashes: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("syncSources", () => {
  it("@@unique([type, name]) を使った upsert でソースを同期する", async () => {
    const repo = makeSourceRepo();
    const config = {
      type: "rss" as const,
      name: "Test RSS",
      config: { url: "https://example.com/feed" },
      polling_interval: 1800,
    };

    const result = await syncSources(repo, [config]);

    expect(result).toHaveLength(1);
    expect(result[0].source.id).toBe("new-id");
    expect(result[0].config).toBe(config);
    expect(repo.upsert).toHaveBeenCalledWith(config);
  });
});

describe("deduplicateEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("既存 externalId を持つイベントを除外する", async () => {
    const repo = makeRawEventRepo({
      findExternalIds: vi.fn().mockResolvedValue(["existing-1"]),
    });

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

    const result = await deduplicateEvents(repo, "source-1", events);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("new-1");
  });

  it("既存 contentHash を持つイベントを除外する", async () => {
    const { contentHash } = await import("../lib/url.js");
    const existingHash = contentHash({ key: "val1" });

    const repo = makeRawEventRepo({
      findContentHashes: vi.fn().mockResolvedValue([existingHash]),
    });

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

    const result = await deduplicateEvents(repo, "source-1", events);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("id-2");
  });

  it("空配列には空配列を返す", async () => {
    const repo = makeRawEventRepo();

    const result = await deduplicateEvents(repo, "source-1", []);
    expect(result).toEqual([]);
    expect(repo.findExternalIds).not.toHaveBeenCalled();
    expect(repo.findContentHashes).not.toHaveBeenCalled();
  });
});

describe("saveEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("リポジトリの createMany に委譲する", async () => {
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
    const repo = makeRawEventRepo({ createMany: vi.fn().mockResolvedValue(2) });

    const saved = await saveEvents(repo, "source-1", events);
    expect(saved).toBe(2);
    expect(repo.createMany).toHaveBeenCalledWith("source-1", events);
  });

  it("空配列には0を返す", async () => {
    const repo = makeRawEventRepo({ createMany: vi.fn().mockResolvedValue(0) });

    const saved = await saveEvents(repo, "source-1", []);
    expect(saved).toBe(0);
    expect(repo.createMany).toHaveBeenCalledWith("source-1", []);
  });
});
