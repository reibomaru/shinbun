import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchHackerNews } from "./hackernews.js";

const config = { mode: "top" as const, min_score: 50 };

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    title: "Test HN Story",
    url: "https://example.com/story",
    score: 100,
    time: Math.floor(new Date("2025-01-15T00:00:00Z").getTime() / 1000),
    by: "testuser",
    type: "story",
    descendants: 10,
    ...overrides,
  };
}

describe("fetchHackerNews", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function stubFetch(
    storyIds: number[],
    items: Record<number, unknown>,
  ) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("stories.json")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(storyIds),
          });
        }
        const match = url.match(/item\/(\d+)\.json/);
        if (match) {
          const id = Number(match[1]);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(items[id] ?? null),
          });
        }
        return Promise.resolve({ ok: false, status: 404, statusText: "Not Found" });
      }),
    );
  }

  it("正常レスポンスで events 配列を返す", async () => {
    const item = makeItem();
    stubFetch([100], { 100: item });

    const result = await fetchHackerNews(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toBe("hn-100");
      expect(result.events[0].title).toBe("Test HN Story");
    }
  });

  it("min_score 未満のアイテムを除外する", async () => {
    stubFetch([100, 101], {
      100: makeItem({ id: 100, score: 100 }),
      101: makeItem({ id: 101, score: 10 }),
    });

    const result = await fetchHackerNews(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toBe("hn-100");
    }
  });

  it("lastFetchedAt 以前のアイテムを除外する", async () => {
    stubFetch([100, 101], {
      100: makeItem({
        id: 100,
        time: Math.floor(new Date("2025-01-10T00:00:00Z").getTime() / 1000),
      }),
      101: makeItem({
        id: 101,
        time: Math.floor(new Date("2025-01-20T00:00:00Z").getTime() / 1000),
      }),
    });

    const result = await fetchHackerNews(
      config,
      new Date("2025-01-15T00:00:00Z"),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toBe("hn-101");
    }
  });

  it("type が story 以外を除外する", async () => {
    stubFetch([100, 101], {
      100: makeItem({ id: 100, type: "story" }),
      101: makeItem({ id: 101, type: "comment" }),
    });

    const result = await fetchHackerNews(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
    }
  });

  it("url なしの場合は HN ディスカッション URL にフォールバックする", async () => {
    stubFetch([100], {
      100: makeItem({ id: 100, url: undefined }),
    });

    const result = await fetchHackerNews(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events[0].url).toBe(
        "https://news.ycombinator.com/item?id=100",
      );
    }
  });

  it("stories API エラー時に ok: false を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    const result = await fetchHackerNews(config, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("500");
    }
  });

  it("不正アイテムはスキップされる", async () => {
    stubFetch([100, 101], {
      100: makeItem({ id: 100 }),
      101: { id: 101, invalid: true }, // title, score, time, by, type が欠けている
    });

    const result = await fetchHackerNews(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toBe("hn-100");
    }
  });

  it("stories IDリストが不正な場合 ok: false を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ not_an_array: true }),
      }),
    );

    const result = await fetchHackerNews(config, null);
    expect(result.ok).toBe(false);
  });
});
