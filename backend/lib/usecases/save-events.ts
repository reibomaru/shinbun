import type { RawEventInput } from "../models/raw-event.js";
import type { IRawEventRepository } from "../repositories/raw-event-repository.js";

/**
 * raw_event テーブルに一括保存する
 */
export async function saveEvents(
  repo: IRawEventRepository,
  sourceId: string,
  events: RawEventInput[],
): Promise<number> {
  return repo.createMany(sourceId, events);
}
