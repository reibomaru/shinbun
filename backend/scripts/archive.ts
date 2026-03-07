import { prisma } from "../lib/db/client.js";
import { createDailySnapshot } from "../lib/usecases/archive-items.js";

async function main() {
  console.log("=== Daily snapshot started ===");

  const result = await createDailySnapshot(prisma);

  if (!result.created) {
    console.log(
      `Snapshot for ${result.date} already exists or no items to snapshot (${result.articleCount} articles)`,
    );
  } else {
    console.log(`Created snapshot for ${result.date} with ${result.articleCount} articles`);
  }

  console.log("=== Daily snapshot completed ===");
}

const isDirectRun =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isDirectRun) {
  main()
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
