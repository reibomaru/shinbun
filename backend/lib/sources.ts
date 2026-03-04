import { prisma } from "./db/client.js";
import { normalizeUrl, contentHash } from "./url.js";
import type { SourceConfig, RawEventInput } from "./fetchers/types.js";
import type { Source } from "@prisma/client";

/**
 * DB の source テーブルと YAML 設定を同期（なければ作成、あれば更新）
 * @@unique([type, name]) を利用した正しい upsert で race condition を回避
 */
export async function syncSources(
  configs: SourceConfig[],
): Promise<Array<{ source: Source; config: SourceConfig }>> {
  return Promise.all(
    configs.map(async (cfg) => {
      const source = await prisma.source.upsert({
        where: {
          type_name: { type: cfg.type, name: cfg.name },
        },
        create: {
          type: cfg.type,
          name: cfg.name,
          config: cfg.config as object,
          pollingInterval: cfg.polling_interval,
          enabled: true,
        },
        update: {
          config: cfg.config as object,
          pollingInterval: cfg.polling_interval,
        },
      });
      return { source, config: cfg };
    }),
  );
}

/**
 * Stage 1 フィルタ: content_hash / externalId で重複排除
 */
export async function deduplicateEvents(
  sourceId: string,
  events: RawEventInput[],
): Promise<RawEventInput[]> {
  if (events.length === 0) return [];

  // content_hash を計算
  const eventsWithHash = events.map((e) => ({
    ...e,
    hash: contentHash(e.payload),
    urlNorm: normalizeUrl(e.url),
  }));

  // 既存の externalId を取得
  const existingByExternalId = await prisma.rawEvent.findMany({
    where: {
      sourceId,
      externalId: { in: eventsWithHash.map((e) => e.externalId) },
    },
    select: { externalId: true },
  });
  const existingIds = new Set(existingByExternalId.map((e) => e.externalId));

  // 既存の content_hash を取得
  const existingByHash = await prisma.rawEvent.findMany({
    where: {
      sourceId,
      contentHash: { in: eventsWithHash.map((e) => e.hash) },
    },
    select: { contentHash: true },
  });
  const existingHashes = new Set(existingByHash.map((e) => e.contentHash));

  return eventsWithHash.filter(
    (e) => !existingIds.has(e.externalId) && !existingHashes.has(e.hash),
  );
}

/**
 * raw_event テーブルに一括保存（createMany + skipDuplicates）
 */
export async function saveEvents(
  sourceId: string,
  events: RawEventInput[],
): Promise<number> {
  if (events.length === 0) return 0;

  const data = events.map((event) => {
    const hash = contentHash(event.payload);
    const urlNorm = normalizeUrl(event.url);
    return {
      sourceId,
      externalId: event.externalId,
      payload: {
        ...event.payload,
        _url: event.url,
        _title: event.title,
        _publishedAt: event.publishedAt?.toISOString() ?? null,
        _urlNormalized: urlNorm,
      } as object,
      contentHash: hash,
    };
  });

  const result = await prisma.rawEvent.createMany({
    data,
    skipDuplicates: true,
  });

  return result.count;
}
