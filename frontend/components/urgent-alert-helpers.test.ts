import { describe, it, expect } from "vitest";
import { getVisibleAlerts, dismissArticle, isSafeUrl } from "./urgent-alert-helpers";
import type { Article } from "@/lib/types";

function makeArticle(id: string): Article {
  return {
    id,
    title: `Article ${id}`,
    summaryShort: "",
    summaryMedium: "",
    keyPoints: [],
    whyItMatters: "",
    topic: "security",
    format: "incident",
    source: "test",
    publishedAt: "1時間前",
    language: "EN",
    importanceScore: 90,
    isRead: false,
    isSaved: false,
    isUrgent: true,
    url: "https://example.com",
    entities: [],
    relatedArticles: [],
  };
}

describe("getVisibleAlerts", () => {
  it("returns all articles when none are dismissed", () => {
    const articles = [makeArticle("1"), makeArticle("2")];
    const result = getVisibleAlerts(articles, new Set());
    expect(result).toHaveLength(2);
  });

  it("filters out dismissed articles", () => {
    const articles = [makeArticle("1"), makeArticle("2"), makeArticle("3")];
    const result = getVisibleAlerts(articles, new Set(["2"]));
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(["1", "3"]);
  });

  it("returns empty array when all articles are dismissed", () => {
    const articles = [makeArticle("1"), makeArticle("2")];
    const result = getVisibleAlerts(articles, new Set(["1", "2"]));
    expect(result).toHaveLength(0);
  });
});

describe("dismissArticle", () => {
  it("adds article ID to dismissed set", () => {
    const dismissed = new Set<string>();
    const result = dismissArticle(dismissed, "1");
    expect(result.has("1")).toBe(true);
  });

  it("returns a new Set (immutable)", () => {
    const dismissed = new Set<string>(["1"]);
    const result = dismissArticle(dismissed, "2");
    expect(dismissed.has("2")).toBe(false);
    expect(result.has("1")).toBe(true);
    expect(result.has("2")).toBe(true);
  });

  it("handles dismissing an already dismissed ID", () => {
    const dismissed = new Set<string>(["1"]);
    const result = dismissArticle(dismissed, "1");
    expect(result.size).toBe(1);
  });
});

describe("isSafeUrl", () => {
  it("allows https URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
  });

  it("allows http URLs", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
  });

  it("rejects javascript: URLs", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isSafeUrl("not-a-url")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isSafeUrl("")).toBe(false);
  });
});
