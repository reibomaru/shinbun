import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("rss-parser", () => {
  const MockParser = vi.fn();
  MockParser.prototype.parseURL = vi.fn();
  return { default: MockParser };
});

import Parser from "rss-parser";
import { fetchRSS } from "./rss.js";

const config = { url: "https://example.com/feed" };

function mockParseURL(result: unknown) {
  (Parser.prototype.parseURL as ReturnType<typeof vi.fn>).mockResolvedValue(
    result,
  );
}

function mockParseURLError(error: Error) {
  (Parser.prototype.parseURL as ReturnType<typeof vi.fn>).mockRejectedValue(
    error,
  );
}

describe("fetchRSS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常フィードで events 配列を返す", async () => {
    mockParseURL({
      items: [
        {
          guid: "item-1",
          link: "https://example.com/1",
          title: "Test Article",
          pubDate: "2025-01-15T00:00:00Z",
          content: "body",
        },
      ],
    });

    const result = await fetchRSS(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toBe("item-1");
      expect(result.events[0].title).toBe("Test Article");
    }
  });

  it("lastFetchedAt 以降のアイテムのみ返す", async () => {
    mockParseURL({
      items: [
        {
          guid: "old",
          link: "https://example.com/old",
          title: "Old",
          pubDate: "2025-01-10T00:00:00Z",
        },
        {
          guid: "new",
          link: "https://example.com/new",
          title: "New",
          pubDate: "2025-01-20T00:00:00Z",
        },
      ],
    });

    const result = await fetchRSS(config, new Date("2025-01-15T00:00:00Z"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toBe("new");
    }
  });

  it("pubDate なしアイテムは通過する", async () => {
    mockParseURL({
      items: [
        {
          guid: "no-date",
          link: "https://example.com/no-date",
          title: "No Date",
        },
      ],
    });

    const result = await fetchRSS(config, new Date("2025-01-15T00:00:00Z"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
    }
  });

  it("title なしの場合は '(no title)' を使う", async () => {
    mockParseURL({
      items: [
        {
          guid: "no-title",
          link: "https://example.com/no-title",
        },
      ],
    });

    const result = await fetchRSS(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events[0].title).toBe("(no title)");
    }
  });

  it("parseURL エラー時に ok: false を返す", async () => {
    mockParseURLError(new Error("Network error"));

    const result = await fetchRSS(config, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Network error");
    }
  });

  it("不正アイテムはスキップされる", async () => {
    mockParseURL({
      items: [
        {
          guid: "valid-1",
          link: "https://example.com/1",
          title: "Valid Article",
          pubDate: "2025-01-15T00:00:00Z",
        },
        // 数値型の guid は safeParse で弾かれる
        { guid: 12345, link: 67890, title: false },
      ],
    });

    const result = await fetchRSS(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toBe("valid-1");
    }
  });
});
