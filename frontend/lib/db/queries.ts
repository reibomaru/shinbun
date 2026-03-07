import { prisma } from "./client";
import { buildOrderByArray, scaleImportanceScore } from "./query-helpers";
import type {
  Article,
  ArchiveDay,
  Topic,
  Format,
  Release,
  SavedGroup,
  CategoryCounts,
  PaginatedArticles,
} from "../types";

// ─── Helpers ──────────────────────────────────────────

const TOPIC_VALUES = ["genai", "frontend", "backend", "devtools", "security"];
const FORMAT_VALUES = ["release", "tutorial", "benchmark", "incident", "announcement"];

function extractLabel(
  labels: { labelType: string; labelValue: string }[],
  type: string,
  allowed: string[],
  fallback: string,
): string {
  const found = labels.find(
    (l) => l.labelType === type && allowed.includes(l.labelValue),
  );
  return found?.labelValue ?? fallback;
}

const AGGREGATOR_SOURCE_TYPES = new Set(["hackernews", "rss", "reddit"]);

function extractSourceName(url: string, sourceName: string, sourceType: string): string {
  if (!AGGREGATOR_SOURCE_TYPES.has(sourceType)) return sourceName;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    return parts.length >= 2 ? parts[parts.length - 2] : hostname;
  } catch {
    return sourceName;
  }
}

function relativeTime(date: Date | null | undefined): string {
  if (!date) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}日前`;
}

function absoluteTime(date: Date | null | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}`;
}

type ItemRow = Awaited<ReturnType<typeof queryItems>>[number];

async function queryItems(where: object = {}, orderBy: object = {}, limit?: number) {
  return prisma.item.findMany({
    where: { status: "processed", ...where },
    orderBy: buildOrderByArray(orderBy),
    take: limit,
    include: {
      labels: true,
      rawEvent: { include: { source: true } },
      savedItems: { take: 1 },
      readStatus: true,
      itemEntities: { include: { entity: true } },
    },
  });
}

function mapItemToArticle(
  item: ItemRow,
  timeFormatter: (d: Date | null | undefined) => string = relativeTime,
): Article {
  const topic = extractLabel(item.labels, "topic", TOPIC_VALUES, "genai") as Topic;
  const format = extractLabel(item.labels, "format", FORMAT_VALUES, "announcement") as Format;

  return {
    id: item.id,
    title: item.title,
    summaryShort: item.summaryShort ?? "",
    summaryMedium: item.summaryMedium ?? "",
    keyPoints: (item.keyPoints as string[] | null) ?? [],
    whyItMatters: item.whyItMatters ?? "",
    topic,
    format,
    source: extractSourceName(item.url, item.rawEvent.source.name, item.rawEvent.source.type),
    publishedAt: timeFormatter(item.publishedAt),
    language: (item.language === "JA" ? "JA" : "EN") as "EN" | "JA",
    importanceScore: scaleImportanceScore(item.importanceScore),
    isRead: item.readStatus !== null,
    isSaved: item.savedItems.length > 0,
    isUrgent: item.isUrgent,
    url: item.url,
    entities: item.itemEntities.map((ie: { entity: { name: string } }) => ie.entity.name),
    relatedArticles: [],
  };
}

// ─── Public query functions ───────────────────────────

export async function getArticles(
  opts: { topic?: string; limit?: number } = {},
): Promise<Article[]> {
  const where: Record<string, unknown> = {};
  if (opts.topic) {
    where.labels = { some: { labelType: "topic", labelValue: opts.topic } };
  }
  const items = await queryItems(where, {}, opts.limit);
  return items.map((item) => mapItemToArticle(item));
}

export async function getTopStories(limit = 3): Promise<Article[]> {
  const items = await prisma.item.findMany({
    where: { status: "processed" },
    orderBy: { importanceScore: "desc" },
    take: limit,
    include: {
      labels: true,
      rawEvent: { include: { source: true } },
      savedItems: { take: 1 },
      readStatus: true,
      itemEntities: { include: { entity: true } },
    },
  });
  return items.map((item) => mapItemToArticle(item));
}

export async function getUrgentArticles(): Promise<Article[]> {
  const items = await queryItems({ isUrgent: true });
  return items.map((item) => mapItemToArticle(item));
}

export async function getArticleById(id: string): Promise<Article | null> {
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      labels: true,
      rawEvent: { include: { source: true } },
      savedItems: { take: 1 },
      readStatus: true,
      itemEntities: { include: { entity: true } },
    },
  });
  if (!item) return null;
  return mapItemToArticle(item);
}

export async function getReleases(limit = 5): Promise<Release[]> {
  const items = await prisma.item.findMany({
    where: {
      status: "processed",
      labels: { some: { labelType: "format", labelValue: "release" } },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: {
      rawEvent: { include: { source: true } },
    },
  });
  return items.map((item: { title: string; url: string; rawEvent: { source: { name: string; type: string } }; publishedAt: Date | null; importanceScore: number | null }) => ({
    name: item.title,
    source: extractSourceName(item.url, item.rawEvent.source.name, item.rawEvent.source.type),
    publishedAt: relativeTime(item.publishedAt),
    score: item.importanceScore ?? 0,
  }));
}

export async function getCategoryCounts(): Promise<CategoryCounts> {
  const labels = await prisma.itemLabel.groupBy({
    by: ["labelValue"],
    where: {
      labelType: "topic",
      item: { status: "processed" },
    },
    _count: { labelValue: true },
  });

  const TOPIC_DISPLAY: Record<string, string> = {
    genai: "GenAI",
    frontend: "Frontend",
    backend: "Backend",
    devtools: "Tools",
    security: "Security",
  };

  const counts: CategoryCounts = {};
  for (const row of labels) {
    const display = TOPIC_DISPLAY[row.labelValue] ?? row.labelValue;
    counts[display] = row._count.labelValue;
  }
  return counts;
}

const DEFAULT_PAGE_SIZE = 50;

export async function getAllArticlesSorted(limit?: number): Promise<Article[]> {
  const items = await queryItems({}, { importanceScore: "desc" }, limit ?? DEFAULT_PAGE_SIZE);
  return items.map((item: ItemRow) => mapItemToArticle(item));
}

export async function getAllArticlesSortedPaginated(
  cursor?: string,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<PaginatedArticles> {
  const take = limit + 1;
  const items = await prisma.item.findMany({
    where: { status: "processed" },
    orderBy: [{ importanceScore: "desc" }, { createdAt: "desc" }],
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      labels: true,
      rawEvent: { include: { source: true } },
      savedItems: { take: 1 },
      readStatus: true,
      itemEntities: { include: { entity: true } },
    },
  });

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

  return {
    articles: pageItems.map((item) => mapItemToArticle(item)),
    nextCursor,
    hasMore,
  };
}

// ─── Archive query functions ─────────────────────────

const DAY_OF_WEEK_JA = ["日", "月", "火", "水", "木", "金", "土"];

function jstDayOfWeek(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00+09:00`);
  return DAY_OF_WEEK_JA[date.getDay()];
}

export async function getArchiveDates(): Promise<ArchiveDay[]> {
  const snapshots = await prisma.dailySnapshot.findMany({
    orderBy: { date: "desc" },
    select: {
      date: true,
      articleCount: true,
      topTitle: true,
      items: {
        select: { item: { select: { title: true, importanceScore: true } } },
        orderBy: { item: { importanceScore: "desc" } },
      },
    },
  });

  return snapshots.map((s) => ({
    date: s.date,
    dayOfWeek: jstDayOfWeek(s.date),
    articleCount: s.articleCount,
    topTitle: s.topTitle,
    titles: s.items.map((si) => si.item.title),
  }));
}

async function querySnapshotItems(
  date: string,
  where: object = {},
  orderBy?: object,
  limit?: number,
): Promise<ItemRow[]> {
  const snapshotItems = await prisma.dailySnapshotItem.findMany({
    where: { snapshot: { date } },
    select: { itemId: true },
  });
  const itemIds = snapshotItems.map((si) => si.itemId);
  if (itemIds.length === 0) return [];

  const orderByArray = orderBy
    ? buildOrderByArray(orderBy)
    : [{ createdAt: "desc" as const }];
  return prisma.item.findMany({
    where: { id: { in: itemIds }, ...where },
    orderBy: orderByArray,
    take: limit,
    include: {
      labels: true,
      rawEvent: { include: { source: true } },
      savedItems: { take: 1 },
      readStatus: true,
      itemEntities: { include: { entity: true } },
    },
  }) as Promise<ItemRow[]>;
}

export async function getArchiveAllArticlesSorted(date: string, limit?: number): Promise<Article[]> {
  const items = await querySnapshotItems(date, {}, { importanceScore: "desc" }, limit ?? DEFAULT_PAGE_SIZE);
  return items.map((item: ItemRow) => mapItemToArticle(item, absoluteTime));
}

export async function getArchiveAllArticlesSortedPaginated(
  date: string,
  cursor?: string,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<PaginatedArticles> {
  const snapshotItems = await prisma.dailySnapshotItem.findMany({
    where: { snapshot: { date } },
    select: { itemId: true },
  });
  const itemIds = snapshotItems.map((si) => si.itemId);
  if (itemIds.length === 0) return { articles: [], nextCursor: null, hasMore: false };

  const take = limit + 1;
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    orderBy: [{ importanceScore: "desc" }, { createdAt: "desc" }],
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      labels: true,
      rawEvent: { include: { source: true } },
      savedItems: { take: 1 },
      readStatus: true,
      itemEntities: { include: { entity: true } },
    },
  }) as ItemRow[];

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

  return {
    articles: pageItems.map((item) => mapItemToArticle(item, absoluteTime)),
    nextCursor,
    hasMore,
  };
}

export async function getArchiveTopStories(date: string, limit = 3): Promise<Article[]> {
  const items = await querySnapshotItems(
    date,
    {},
    { importanceScore: "desc" },
    limit,
  );
  return items.map((item) => mapItemToArticle(item, absoluteTime));
}

export async function getArchiveArticles(
  date: string,
  opts: { topic?: string; limit?: number } = {},
): Promise<Article[]> {
  const where: Record<string, unknown> = {};
  if (opts.topic) {
    where.labels = { some: { labelType: "topic", labelValue: opts.topic } };
  }
  const items = await querySnapshotItems(date, where, undefined, opts.limit);
  return items.map((item) => mapItemToArticle(item, absoluteTime));
}

export async function getArchiveReleases(date: string, limit = 5): Promise<Release[]> {
  const items = await querySnapshotItems(
    date,
    { labels: { some: { labelType: "format", labelValue: "release" } } },
    { publishedAt: "desc" },
    limit,
  );
  return items.map((item) => ({
    name: item.title,
    source: extractSourceName(item.url, item.rawEvent.source.name, item.rawEvent.source.type),
    publishedAt: absoluteTime(item.publishedAt),
    score: item.importanceScore ?? 0,
  }));
}

export async function getArchiveCategoryCounts(date: string): Promise<CategoryCounts> {
  const snapshotItems = await prisma.dailySnapshotItem.findMany({
    where: { snapshot: { date } },
    select: { itemId: true },
  });
  const itemIds = snapshotItems.map((si) => si.itemId);
  if (itemIds.length === 0) return {};

  const labels = await prisma.itemLabel.groupBy({
    by: ["labelValue"],
    where: {
      labelType: "topic",
      itemId: { in: itemIds },
    },
    _count: { labelValue: true },
  });

  const TOPIC_DISPLAY: Record<string, string> = {
    genai: "GenAI",
    frontend: "Frontend",
    backend: "Backend",
    devtools: "Tools",
    security: "Security",
  };

  const counts: CategoryCounts = {};
  for (const row of labels) {
    const display = TOPIC_DISPLAY[row.labelValue] ?? row.labelValue;
    counts[display] = row._count.labelValue;
  }
  return counts;
}

export async function getAdjacentArchiveDates(
  date: string,
): Promise<{ prev: string | null; next: string | null }> {
  const [prev, next] = await Promise.all([
    prisma.dailySnapshot.findFirst({
      where: { date: { lt: date } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.dailySnapshot.findFirst({
      where: { date: { gt: date } },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);

  return {
    prev: prev?.date ?? null,
    next: next?.date ?? null,
  };
}

export async function getSavedArticles(): Promise<SavedGroup[]> {
  const savedItems = await prisma.savedItem.findMany({
    orderBy: { savedAt: "desc" },
    include: {
      item: {
        include: {
          rawEvent: { include: { source: true } },
        },
      },
    },
  });

  const groups = new Map<string, SavedGroup>();
  for (const si of savedItems) {
    const dateKey = si.savedAt.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (!groups.has(dateKey)) {
      groups.set(dateKey, { date: dateKey, items: [] });
    }
    groups.get(dateKey)!.items.push({
      id: si.item.id,
      savedItemId: si.id,
      title: si.item.title,
      source: extractSourceName(si.item.url, si.item.rawEvent.source.name, si.item.rawEvent.source.type),
      publishedAt: relativeTime(si.item.publishedAt),
      tags: (si.tags as string[] | null) ?? [],
    });
  }
  return Array.from(groups.values());
}
