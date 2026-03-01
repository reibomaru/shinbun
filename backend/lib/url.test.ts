import { describe, it, expect } from "vitest";
import { normalizeUrl, contentHash } from "./url.js";

describe("normalizeUrl", () => {
  it("www を除去する", () => {
    expect(normalizeUrl("https://www.example.com/page")).toBe(
      "https://example.com/page",
    );
  });

  it("クエリパラメータを除去する", () => {
    expect(normalizeUrl("https://example.com/page?foo=bar&baz=1")).toBe(
      "https://example.com/page",
    );
  });

  it("フラグメントを除去する", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe(
      "https://example.com/page",
    );
  });

  it("末尾スラッシュを除去する", () => {
    expect(normalizeUrl("https://example.com/page/")).toBe(
      "https://example.com/page",
    );
  });

  it("ルートパスの末尾スラッシュは残す", () => {
    expect(normalizeUrl("https://example.com/")).toBe(
      "https://example.com/",
    );
  });

  it("無効な URL はそのまま返す", () => {
    expect(normalizeUrl("not-a-url")).toBe("not-a-url");
  });

  it("複数の正規化を同時に適用する", () => {
    expect(
      normalizeUrl("https://www.example.com/page/?q=1#top"),
    ).toBe("https://example.com/page");
  });
});

describe("contentHash", () => {
  it("64文字の hex 文字列を返す", () => {
    const hash = contentHash({ key: "value" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("同じ入力に対して決定論的な結果を返す", () => {
    const a = contentHash({ key: "value" });
    const b = contentHash({ key: "value" });
    expect(a).toBe(b);
  });

  it("異なる入力に対して異なるハッシュを返す", () => {
    const a = contentHash({ key: "value1" });
    const b = contentHash({ key: "value2" });
    expect(a).not.toBe(b);
  });
});
