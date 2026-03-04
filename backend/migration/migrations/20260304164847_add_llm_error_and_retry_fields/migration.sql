-- AlterEnum
ALTER TYPE "ItemStatus" ADD VALUE 'llm_error';

-- AlterTable
ALTER TABLE "raw_event" ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "entity_entity_type_name_key" ON "entity"("entity_type", "name");

