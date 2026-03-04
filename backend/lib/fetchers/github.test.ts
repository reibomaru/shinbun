import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGitHubReleases } from "./github.js";

const config = { owner: "test-owner", repo: "test-repo" };

function makeRelease(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    tag_name: "v1.0.0",
    name: "Release 1.0.0",
    html_url: "https://github.com/test-owner/test-repo/releases/tag/v1.0.0",
    published_at: "2025-01-15T00:00:00Z",
    body: "Release notes",
    prerelease: false,
    draft: false,
    ...overrides,
  };
}

describe("fetchGitHubReleases", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("正常レスポンスで events 配列を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([makeRelease()]),
      }),
    );

    const result = await fetchGitHubReleases(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toBe("github-release-test-owner-test-repo-1");
      expect(result.events[0].title).toBe("Release 1.0.0");
    }
  });

  it("draft リリースを除外する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([makeRelease(), makeRelease({ id: 2, draft: true })]),
      }),
    );

    const result = await fetchGitHubReleases(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
    }
  });

  it("lastFetchedAt 以前のリリースを除外する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            makeRelease({
              id: 1,
              published_at: "2025-01-10T00:00:00Z",
            }),
            makeRelease({
              id: 2,
              published_at: "2025-01-20T00:00:00Z",
            }),
          ]),
      }),
    );

    const result = await fetchGitHubReleases(config, new Date("2025-01-15T00:00:00Z"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].externalId).toContain("-2");
    }
  });

  it("lastFetchedAt が null の場合は全件取得する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([makeRelease({ id: 1 }), makeRelease({ id: 2 })]),
      }),
    );

    const result = await fetchGitHubReleases(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(2);
    }
  });

  it("API エラー時に ok: false を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      }),
    );

    const result = await fetchGitHubReleases(config, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("403");
    }
  });

  it("GITHUB_TOKEN 使用時に Authorization ヘッダーを送る", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchGitHubReleases(config, null);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("name が null の場合は tag_name をタイトルにする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([makeRelease({ name: null })]),
      }),
    );

    const result = await fetchGitHubReleases(config, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events[0].title).toBe("v1.0.0");
    }
  });

  it("不正レスポンス形式で ok: false を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ not_an_array: true }),
      }),
    );

    const result = await fetchGitHubReleases(config, null);
    expect(result.ok).toBe(false);
  });
});
