import type { Source } from "@prisma/client";
import type { SourceConfig } from "../config.js";
import type { ISourceRepository } from "../repositories/source-repository.js";

/**
 * DB の source テーブルと YAML 設定を同期（なければ作成、あれば更新）
 * @@unique([type, name]) を利用した upsert で race condition を回避
 */
export async function syncSources(
  repo: ISourceRepository,
  configs: SourceConfig[],
): Promise<Array<{ source: Source; config: SourceConfig }>> {
  return Promise.all(
    configs.map(async (cfg) => {
      const source = await repo.upsert(cfg);
      return { source, config: cfg };
    }),
  );
}
