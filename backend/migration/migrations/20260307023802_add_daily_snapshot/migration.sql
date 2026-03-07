-- CreateTable
CREATE TABLE "daily_snapshot" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "article_count" INTEGER NOT NULL,
    "top_title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_snapshot_item" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "item_id" UUID NOT NULL,

    CONSTRAINT "daily_snapshot_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_snapshot_date_key" ON "daily_snapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_snapshot_item_snapshot_id_item_id_key" ON "daily_snapshot_item"("snapshot_id", "item_id");

-- AddForeignKey
ALTER TABLE "daily_snapshot_item" ADD CONSTRAINT "daily_snapshot_item_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "daily_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_snapshot_item" ADD CONSTRAINT "daily_snapshot_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

