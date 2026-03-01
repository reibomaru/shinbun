import type { Source } from "@prisma/client";
import type { SourceConfig } from "../config.js";

export interface ISourceRepository {
  upsert(cfg: SourceConfig): Promise<Source>;
  updateLastFetched(id: string): Promise<void>;
  incrementErrorCount(id: string, error: string): Promise<void>;
}
