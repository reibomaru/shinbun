-- CreateIndex
CREATE INDEX "raw_event_content_hash_idx" ON "raw_event"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "source_type_name_key" ON "source"("type", "name");

