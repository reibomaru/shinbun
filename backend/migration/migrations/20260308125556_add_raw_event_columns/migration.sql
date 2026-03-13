-- AlterTable
ALTER TABLE "raw_event" ADD COLUMN     "content" TEXT,
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "title" TEXT,
ADD COLUMN     "url" TEXT,
ADD COLUMN     "url_normalized" TEXT;

-- Backfill from payload JSON
UPDATE "raw_event" SET
  title = payload->>'_title',
  url = payload->>'_url',
  url_normalized = payload->>'_urlNormalized',
  published_at = CASE WHEN payload->>'_publishedAt' IS NOT NULL
    THEN (payload->>'_publishedAt')::timestamptz ELSE NULL END;

