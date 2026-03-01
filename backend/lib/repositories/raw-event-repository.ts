import type { RawEventInput } from "../models/raw-event.js";

export interface IRawEventRepository {
  findExternalIds(sourceId: string, ids: string[]): Promise<string[]>;
  findContentHashes(sourceId: string, hashes: string[]): Promise<string[]>;
  createMany(sourceId: string, events: RawEventInput[]): Promise<number>;
}
