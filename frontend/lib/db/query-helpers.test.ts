import { describe, it, expect } from "vitest";
import { buildOrderByArray, scaleImportanceScore } from "./query-helpers";

describe("buildOrderByArray", () => {
  it("returns default createdAt desc when orderBy is empty", () => {
    const result = buildOrderByArray({});
    expect(result).toEqual([{ createdAt: "desc" }]);
  });

  it("builds array from single key orderBy with createdAt fallback", () => {
    const result = buildOrderByArray({ importanceScore: "desc" });
    expect(result).toEqual([
      { importanceScore: "desc" },
      { createdAt: "desc" },
    ]);
  });

  it("builds array from multiple keys preserving order", () => {
    const result = buildOrderByArray({
      importanceScore: "desc",
      publishedAt: "asc",
    });
    expect(result).toEqual([
      { importanceScore: "desc" },
      { publishedAt: "asc" },
      { createdAt: "desc" },
    ]);
  });

  it("returns array format (not object) to avoid Prisma orderBy bug", () => {
    const result = buildOrderByArray({ importanceScore: "desc" });
    expect(Array.isArray(result)).toBe(true);
    // Each element should be a single-key object
    for (const entry of result) {
      expect(Object.keys(entry)).toHaveLength(1);
    }
  });
});

describe("scaleImportanceScore", () => {
  it("scales 0.75 to 75", () => {
    expect(scaleImportanceScore(0.75)).toBe(75);
  });

  it("scales 1.0 to 100", () => {
    expect(scaleImportanceScore(1.0)).toBe(100);
  });

  it("scales 0 to 0", () => {
    expect(scaleImportanceScore(0)).toBe(0);
  });

  it("handles null as 0", () => {
    expect(scaleImportanceScore(null)).toBe(0);
  });

  it("handles undefined as 0", () => {
    expect(scaleImportanceScore(undefined)).toBe(0);
  });

  it("clamps values above 1.0 to 100", () => {
    expect(scaleImportanceScore(1.5)).toBe(100);
  });

  it("clamps negative values to 0", () => {
    expect(scaleImportanceScore(-0.5)).toBe(0);
  });

  it("rounds correctly for 0.555", () => {
    expect(scaleImportanceScore(0.555)).toBe(56);
  });

  it("rounds correctly for 0.001", () => {
    expect(scaleImportanceScore(0.001)).toBe(0);
  });
});
