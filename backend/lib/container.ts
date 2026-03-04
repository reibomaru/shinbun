import { prisma } from "./db/client.js";
import { PrismaRawEventRepository } from "./repositories/prisma/prisma-raw-event-repository.js";
import { PrismaSourceRepository } from "./repositories/prisma/prisma-source-repository.js";

/**
 * リポジトリのシングルトンインスタンス。
 * 実装の切り替えはここだけ（例: Prisma → mock への差し替え）。
 */
export const sourceRepository = new PrismaSourceRepository(prisma);
export const rawEventRepository = new PrismaRawEventRepository(prisma);
