import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RawEventInput } from "../models/raw-event.js";
import {
  type ExtractFn,
  enrichEventsWithContent,
  extractArticleText,
  stripHtmlTags,
} from "./extract-content.js";

function createMockExtract(result: { content?: string } | null): ExtractFn {
  return vi.fn().mockResolvedValue(result);
}

describe("stripHtmlTags", () => {
  it("HTMLタグを除去する", () => {
    expect(stripHtmlTags("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });

  it("タグなし文字列はそのまま返す", () => {
    expect(stripHtmlTags("plain text")).toBe("plain text");
  });

  it("空文字列を処理する", () => {
    expect(stripHtmlTags("")).toBe("");
  });
});

describe("extractArticleText", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("正常に本文を抽出する", async () => {
    const mockExtract = createMockExtract({ content: "<p>Article body text</p>" });

    const result = await extractArticleText("https://example.com/article", mockExtract);
    expect(result).toBe("Article body text");
  });

  it("抽出失敗時に null を返す", async () => {
    const mockExtract = vi.fn().mockRejectedValue(new Error("Network error")) as ExtractFn;

    const result = await extractArticleText("https://example.com/fail", mockExtract);
    expect(result).toBeNull();
  });

  it("content が空の場合に null を返す", async () => {
    const mockExtract = createMockExtract({ content: "" });

    const result = await extractArticleText("https://example.com/empty", mockExtract);
    expect(result).toBeNull();
  });

  it("article が null の場合に null を返す", async () => {
    const mockExtract = createMockExtract(null);

    const result = await extractArticleText("https://example.com/null", mockExtract);
    expect(result).toBeNull();
  });

  it("10,000文字で切り詰める", async () => {
    const longText = "a".repeat(15_000);
    const mockExtract = createMockExtract({ content: longText });

    const result = await extractArticleText("https://example.com/long", mockExtract);
    expect(result).toHaveLength(10_000);
  });

  it("HTMLタグを除去してプレーンテキスト化する", async () => {
    const mockExtract = createMockExtract({
      content: "<div><h1>Title</h1><p>Body <a href='#'>link</a></p></div>",
    });

    const result = await extractArticleText("https://example.com/html", mockExtract);
    expect(result).toBe("TitleBody link");
  });

  it("AbortError（タイムアウト）で null を返す", async () => {
    const mockExtract = vi
      .fn()
      .mockImplementation(async (_url: string, opts?: { signal?: AbortSignal }) => {
        // シグナルが abort されるまで待つシミュレーション
        if (opts?.signal) {
          const abortError = new DOMException("The operation was aborted", "AbortError");
          throw abortError;
        }
        return null;
      }) as ExtractFn;

    const result = await extractArticleText("https://example.com/timeout", mockExtract);
    expect(result).toBeNull();
  });
});

describe("enrichEventsWithContent", () => {
  it("イベントに content を付与する", async () => {
    const mockExtract = createMockExtract({ content: "<p>Extracted</p>" });

    const events: RawEventInput[] = [
      {
        externalId: "1",
        url: "https://example.com/1",
        title: "Test",
        publishedAt: null,
        payload: {},
        content: null,
      },
    ];

    const result = await enrichEventsWithContent(events, mockExtract);
    expect(result[0].content).toBe("Extracted");
  });

  it("URL なしイベントはスキップする", async () => {
    const mockExtract = vi.fn() as ExtractFn;

    const events: RawEventInput[] = [
      {
        externalId: "1",
        url: "",
        title: "No URL",
        publishedAt: null,
        payload: {},
        content: null,
      },
    ];

    const result = await enrichEventsWithContent(events, mockExtract);
    expect(result[0].content).toBeNull();
    expect(mockExtract).not.toHaveBeenCalled();
  });
});
