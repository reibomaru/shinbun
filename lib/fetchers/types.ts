import type { SourceType } from "@prisma/client";

/** フェッチャーが返す個々のイベントデータ */
export interface RawEventInput {
  /** 外部サービス側のID（重複検知用） */
  externalId: string;
  /** 原文URL */
  url: string;
  /** タイトル */
  title: string;
  /** 公開日時 */
  publishedAt: Date | null;
  /** 生データ（APIレスポンス全体） */
  payload: Record<string, unknown>;
}

/** フェッチ結果 */
export type FetchResult =
  | { ok: true; events: RawEventInput[] }
  | { ok: false; error: string };

/** sources.yaml の各ソース設定 */
export interface SourceConfig {
  type: SourceType;
  name: string;
  config: Record<string, unknown>;
  polling_interval: number;
}
