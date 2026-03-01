-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('github_repo', 'rss', 'youtube_channel', 'changelog', 'hackernews', 'reddit', 'arxiv');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('release', 'article', 'video', 'paper', 'changelog');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('pending', 'processed', 'archived');

-- CreateEnum
CREATE TYPE "LabelType" AS ENUM ('topic', 'format', 'difficulty');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('library', 'model', 'company', 'repo');

-- CreateEnum
CREATE TYPE "WatchlistTargetType" AS ENUM ('entity', 'keyword');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('helpful', 'not_helpful');

-- CreateTable
CREATE TABLE "source" (
    "id" UUID NOT NULL,
    "type" "SourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "polling_interval" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched_at" TIMESTAMP(3),
    "last_error" TEXT,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_event" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "raw_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" UUID NOT NULL,
    "raw_event_id" UUID NOT NULL,
    "item_type" "ItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "url_normalized" TEXT,
    "published_at" TIMESTAMP(3),
    "language" TEXT,
    "summary_short" TEXT,
    "summary_medium" TEXT,
    "key_points" JSONB,
    "why_it_matters" TEXT,
    "importance_score" DOUBLE PRECISION,
    "importance_reason" TEXT,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "status" "ItemStatus" NOT NULL DEFAULT 'pending',
    "llm_model_used" TEXT,
    "llm_cost" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_label" (
    "item_id" UUID NOT NULL,
    "label_type" "LabelType" NOT NULL,
    "label_value" TEXT NOT NULL,

    CONSTRAINT "item_label_pkey" PRIMARY KEY ("item_id","label_type","label_value")
);

-- CreateTable
CREATE TABLE "entity" (
    "id" UUID NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB,
    "official_url" TEXT,

    CONSTRAINT "entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_entity" (
    "item_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "item_entity_pkey" PRIMARY KEY ("item_id","entity_id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" UUID NOT NULL,
    "target_type" "WatchlistTargetType" NOT NULL,
    "target_value" TEXT NOT NULL,
    "notify_realtime" BOOLEAN NOT NULL DEFAULT false,
    "score_boost" DOUBLE PRECISION NOT NULL DEFAULT 1.2,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_item" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "tags" JSONB,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "read_status" (
    "item_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "read_status_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "feedback_type" "FeedbackType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embedding" (
    "item_id" UUID NOT NULL,
    "vector" vector(1536) NOT NULL,
    "embedding_model" TEXT NOT NULL,

    CONSTRAINT "embedding_pkey" PRIMARY KEY ("item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_event_source_id_external_id_key" ON "raw_event"("source_id", "external_id");

-- AddForeignKey
ALTER TABLE "raw_event" ADD CONSTRAINT "raw_event_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_raw_event_id_fkey" FOREIGN KEY ("raw_event_id") REFERENCES "raw_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_label" ADD CONSTRAINT "item_label_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_entity" ADD CONSTRAINT "item_entity_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_entity" ADD CONSTRAINT "item_entity_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_status" ADD CONSTRAINT "read_status_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embedding" ADD CONSTRAINT "embedding_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
