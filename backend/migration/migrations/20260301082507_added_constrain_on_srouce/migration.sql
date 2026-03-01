/*
  Warnings:

  - A unique constraint covering the columns `[type,name]` on the table `source` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "raw_event_content_hash_idx" ON "raw_event"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "source_type_name_key" ON "source"("type", "name");
