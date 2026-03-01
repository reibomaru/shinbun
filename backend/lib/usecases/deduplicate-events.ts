import { contentHash } from "../url.js";
import type { RawEventInput } from "../models/raw-event.js";
import type { IRawEventRepository } from "../repositories/raw-event-repository.js";

/**
 * Stage 1 フィルタ: content_hash / externalId で重複排除
 */
export async function deduplicateEvents(
  repo: IRawEventRepository,
  sourceId: string,
  events: RawEventInput[],
): Promise<RawEventInput[]> {
  if (events.length === 0) return [];

  const eventsWithHash = events.map((e) => ({
    ...e,
    hash: contentHash(e.payload),
  }));

  const existingIds = new Set(
    await repo.findExternalIds(
      sourceId,
      eventsWithHash.map((e) => e.externalId),
    ),
  );

  const existingHashes = new Set(
    await repo.findContentHashes(
      sourceId,
      eventsWithHash.map((e) => e.hash),
    ),
  );

  return eventsWithHash.filter(
    (e) => !existingIds.has(e.externalId) && !existingHashes.has(e.hash),
  );
}
