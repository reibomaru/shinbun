import type { PrismaClient } from "@prisma/client";
import { contentHash, normalizeUrl } from "../../url.js";
import type { RawEventInput } from "../../models/raw-event.js";
import type { IRawEventRepository } from "../raw-event-repository.js";

export class PrismaRawEventRepository implements IRawEventRepository {
  constructor(private prisma: PrismaClient) {}

  async findExternalIds(sourceId: string, ids: string[]): Promise<string[]> {
    const rows = await this.prisma.rawEvent.findMany({
      where: { sourceId, externalId: { in: ids } },
      select: { externalId: true },
    });
    return rows.map((r) => r.externalId);
  }

  async findContentHashes(sourceId: string, hashes: string[]): Promise<string[]> {
    const rows = await this.prisma.rawEvent.findMany({
      where: { sourceId, contentHash: { in: hashes } },
      select: { contentHash: true },
    });
    return rows.map((r) => r.contentHash);
  }

  async createMany(sourceId: string, events: RawEventInput[]): Promise<number> {
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

    const result = await this.prisma.rawEvent.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }
}
