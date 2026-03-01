import type { FetchResult, RawEventInput } from "./types.js";

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  body: string | null;
  prerelease: boolean;
  draft: boolean;
}

/**
 * GitHub REST API v3 で releases を取得
 * GITHUB_TOKEN 環境変数があれば認証ヘッダーに使用（レートリミット緩和）
 */
export async function fetchGitHubReleases(
  config: { owner: string; repo: string },
  lastFetchedAt: Date | null,
): Promise<FetchResult> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/releases?per_page=30`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      return { ok: false, error: `GitHub API ${res.status}: ${res.statusText}` };
    }

    const releases: GitHubRelease[] = await res.json();

    const events: RawEventInput[] = releases
      .filter((r) => !r.draft)
      .filter((r) => {
        if (!lastFetchedAt || !r.published_at) return true;
        return new Date(r.published_at) > lastFetchedAt;
      })
      .map((r) => ({
        externalId: `github-release-${config.owner}-${config.repo}-${r.id}`,
        url: r.html_url,
        title: r.name || r.tag_name,
        publishedAt: r.published_at ? new Date(r.published_at) : null,
        payload: r as unknown as Record<string, unknown>,
      }));

    return { ok: true, events };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
