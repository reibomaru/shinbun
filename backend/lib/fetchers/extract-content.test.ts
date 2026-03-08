import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@extractus/article-extractor", () => ({
  extract: vi.fn(),
}));

import { extract } from "@extractus/article-extractor";
import { enrichEventsWithContent, extractArticleText, stripHtmlTags } from "./extract-content.js";
import type { RawEventInput } from "./types.js";

const mockExtract = extract as ReturnType<typeof vi.fn>;

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
    vi.clearAllMocks();
  });

  it("正常に本文を抽出する", async () => {
    mockExtract.mockResolvedValue({
      content: "<p>Article body text</p>",
    });

    const result = await extractArticleText("https://example.com/article");
    expect(result).toBe("Article body text");
  });

  it("抽出失敗時に null を返す", async () => {
    mockExtract.mockRejectedValue(new Error("Network error"));

    const result = await extractArticleText("https://example.com/fail");
    expect(result).toBeNull();
  });

  it("content が空の場合に null を返す", async () => {
    mockExtract.mockResolvedValue({ content: "" });

    const result = await extractArticleText("https://example.com/empty");
    expect(result).toBeNull();
  });

  it("article が null の場合に null を返す", async () => {
    mockExtract.mockResolvedValue(null);

    const result = await extractArticleText("https://example.com/null");
    expect(result).toBeNull();
  });

  it("10,000文字で切り詰める", async () => {
    const longText = "a".repeat(15_000);
    mockExtract.mockResolvedValue({ content: longText });

    const result = await extractArticleText("https://example.com/long");
    expect(result).toHaveLength(10_000);
  });

  it("HTMLタグを除去してプレーンテキスト化する", async () => {
    mockExtract.mockResolvedValue({
      content: "<div><h1>Title</h1><p>Body <a href='#'>link</a></p></div>",
    });

    const result = await extractArticleText("https://example.com/html");
    expect(result).toBe("TitleBody link");
  });
});

describe("enrichEventsWithContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントに content を付与する", async () => {
    mockExtract.mockResolvedValue({ content: "<p>Extracted</p>" });

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

    const result = await enrichEventsWithContent(events);
    expect(result[0].content).toBe("Extracted");
  });

  it("URL なしイベントはスキップする", async () => {
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

    const result = await enrichEventsWithContent(events);
    expect(result[0].content).toBeNull();
    expect(mockExtract).not.toHaveBeenCalled();
  });
});
