import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./config.js", () => ({
  loadWatchlist: vi.fn().mockReturnValue({
    entities: [
      { name: "Anthropic", notify_realtime: true, score_boost: 1.3 },
    ],
    keywords: [
      { value: "RAG", notify_realtime: false, score_boost: 1.2 },
    ],
  }),
}));

import {
  normalizeEngagement,
  calculateFreshness,
  calculateWatchlistBoost,
  calculateImportanceScore,
} from "./scoring.js";

describe("normalizeEngagement", () => {
  it("0以下は0を返す", () => {
    expect(normalizeEngagement(0)).toBe(0);
    expect(normalizeEngagement(-5)).toBe(0);
  });

  it("中程度のスコアを正規化する", () => {
    const result = normalizeEngagement(100);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it("1000以上は1.0にクランプする", () => {
    expect(normalizeEngagement(1000)).toBeCloseTo(1.0, 1);
    expect(normalizeEngagement(5000)).toBe(1);
  });
});

describe("calculateFreshness", () => {
  const now = new Date("2025-06-01T12:00:00Z");

  it("24h以内は1.0", () => {
    const recent = new Date("2025-06-01T00:00:00Z");
    expect(calculateFreshness(recent, now)).toBe(1.0);
  });

  it("48h以内は0.7", () => {
    const dayOld = new Date("2025-05-30T18:00:00Z");
    expect(calculateFreshness(dayOld, now)).toBe(0.7);
  });

  it("1週間以内は0.3", () => {
    const weekOld = new Date("2025-05-28T00:00:00Z");
    expect(calculateFreshness(weekOld, now)).toBe(0.3);
  });

  it("1週間超は0.1", () => {
    const old = new Date("2025-05-01T00:00:00Z");
    expect(calculateFreshness(old, now)).toBe(0.1);
  });

  it("nullは0.5を返す", () => {
    expect(calculateFreshness(null, now)).toBe(0.5);
  });
});

describe("calculateWatchlistBoost", () => {
  it("ウォッチリストエンティティにマッチするとブーストする", () => {
    const watchlist = {
      entities: [{ name: "Anthropic", notify_realtime: true, score_boost: 1.3 }],
      keywords: [],
    };
    const { boost, matched } = calculateWatchlistBoost(
      "Anthropic releases Claude 4",
      "https://example.com",
      watchlist,
    );
    expect(boost).toBe(1.3);
    expect(matched).toContain("Anthropic");
  });

  it("マッチしない場合はブースト1.0", () => {
    const watchlist = {
      entities: [{ name: "Anthropic", notify_realtime: true, score_boost: 1.3 }],
      keywords: [],
    };
    const { boost, matched } = calculateWatchlistBoost(
      "Random tech news",
      "https://example.com",
      watchlist,
    );
    expect(boost).toBe(1.0);
    expect(matched).toHaveLength(0);
  });
});

describe("calculateImportanceScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("基本スコアを計算する", () => {
    const result = calculateImportanceScore({
      sourceTrust: 0.8,
      publishedAt: new Date(),
      engagementScore: 100,
      contentQuality: 0.7,
      title: "Some article",
      url: "https://example.com",
      topic: "frontend",
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.reason).toContain("trust=0.8");
  });

  it("security トピックにボーナスを付与する", () => {
    const base = calculateImportanceScore({
      sourceTrust: 0.8,
      publishedAt: new Date(),
      engagementScore: 100,
      contentQuality: 0.7,
      title: "Some article",
      url: "https://example.com",
      topic: "frontend",
    });

    const security = calculateImportanceScore({
      sourceTrust: 0.8,
      publishedAt: new Date(),
      engagementScore: 100,
      contentQuality: 0.7,
      title: "Some article",
      url: "https://example.com",
      topic: "security",
    });

    expect(security.score).toBeGreaterThan(base.score);
    expect(security.reason).toContain("security +15");
  });

  it("ウォッチリストマッチ時にブーストする", () => {
    const result = calculateImportanceScore({
      sourceTrust: 0.8,
      publishedAt: new Date(),
      engagementScore: 100,
      contentQuality: 0.7,
      title: "Anthropic launches new model",
      url: "https://example.com",
    });

    expect(result.reason).toContain("watchlist");
    expect(result.reason).toContain("Anthropic");
  });
});
