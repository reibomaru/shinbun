import type { PrismaClient, Source } from "@prisma/client";
import type { SourceConfig } from "../../config.js";
import type { ISourceRepository } from "../source-repository.js";

export class PrismaSourceRepository implements ISourceRepository {
  constructor(private prisma: PrismaClient) {}

  async upsert(cfg: SourceConfig): Promise<Source> {
    return this.prisma.source.upsert({
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
  }

  async updateLastFetched(id: string): Promise<void> {
    await this.prisma.source.update({
      where: { id },
      data: {
        lastFetchedAt: new Date(),
        errorCount: 0,
        lastError: null,
      },
    });
  }

  async incrementErrorCount(id: string, error: string): Promise<void> {
    await this.prisma.source.update({
      where: { id },
      data: {
        errorCount: { increment: 1 },
        lastError: error,
      },
    });
  }
}
