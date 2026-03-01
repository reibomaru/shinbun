import { createHash } from "node:crypto";

/**
 * URL正規化: クエリパラメータ除去、www統一、末尾スラッシュ統一
 */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    // www を除去
    url.hostname = url.hostname.replace(/^www\./, "");
    // クエリパラメータ除去
    url.search = "";
    // フラグメント除去
    url.hash = "";
    // 末尾スラッシュ統一（パスが "/" のみの場合は残す）
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    // パースできない場合はそのまま返す
    return raw;
  }
}

/**
 * SHA-256 ハッシュ生成
 */
export function contentHash(payload: unknown): string {
  const str = JSON.stringify(payload);
  return createHash("sha256").update(str).digest("hex");
}
