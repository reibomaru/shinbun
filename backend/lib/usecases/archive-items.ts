import type { PrismaClient } from "@prisma/client";

function getJSTDateString(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function createDailySnapshot(
  prisma: PrismaClient,
): Promise<{ date: string; created: boolean; articleCount: number }> {
  const date = getJSTDateString();

  const existing = await prisma.dailySnapshot.findUnique({ where: { date } });
  if (existing) {
    return { date, created: false, articleCount: existing.articleCount };
  }

  const items = await prisma.item.findMany({
    where: { status: "processed" },
    select: { id: true, importanceScore: true, title: true },
    orderBy: { importanceScore: "desc" },
  });

  if (items.length === 0) {
    return { date, created: false, articleCount: 0 };
  }

  const topTitle = items[0].title;

  await prisma.$transaction(async (tx) => {
    const snapshot = await tx.dailySnapshot.create({
      data: {
        date,
        articleCount: items.length,
        topTitle,
      },
    });

    await tx.dailySnapshotItem.createMany({
      data: items.map((item) => ({
        snapshotId: snapshot.id,
        itemId: item.id,
      })),
    });
  });

  return { date, created: true, articleCount: items.length };
}
