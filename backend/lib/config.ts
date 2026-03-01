import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const CONFIG_DIR = path.resolve(process.cwd(), "backend/config");

function loadYaml(filename: string): unknown {
  const filePath = path.join(CONFIG_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8");
  return yaml.load(content, { schema: yaml.JSON_SCHEMA });
}

/** sources.yaml のスキーマ */
export const SourceConfigSchema = z.object({
  type: z.enum(["github_repo", "rss", "youtube_channel", "changelog", "hackernews"]),
  name: z.string(),
  config: z.record(z.string(), z.unknown()),
  polling_interval: z.number(),
});

export type SourceConfig = z.infer<typeof SourceConfigSchema>;

const SourcesFileSchema = z.object({
  sources: z.array(SourceConfigSchema),
});

/** sources.yaml を読み込み、ソース一覧を返す */
export function loadSources(): SourceConfig[] {
  const data = SourcesFileSchema.parse(loadYaml("sources.yaml"));
  return data.sources;
}

/** settings.yaml のスキーマ */
export const SettingsSchema = z.object({
  digest: z.object({
    time: z.string(),
    timezone: z.string(),
    top_count: z.number(),
    total_count: z.number(),
  }),
  cost_alert: z.object({
    daily_usd: z.number(),
  }),
});

export type Settings = z.infer<typeof SettingsSchema>;

export function loadSettings(): Settings {
  return SettingsSchema.parse(loadYaml("settings.yaml"));
}

/** watchlist.yaml のスキーマ */
const WatchlistEntitySchema = z.object({
  name: z.string(),
  notify_realtime: z.boolean(),
  score_boost: z.number(),
});

const WatchlistKeywordSchema = z.object({
  value: z.string(),
  notify_realtime: z.boolean(),
  score_boost: z.number(),
});

export const WatchlistSchema = z.object({
  entities: z.array(WatchlistEntitySchema),
  keywords: z.array(WatchlistKeywordSchema),
});

export type WatchlistEntity = z.infer<typeof WatchlistEntitySchema>;
export type WatchlistKeyword = z.infer<typeof WatchlistKeywordSchema>;
export type Watchlist = z.infer<typeof WatchlistSchema>;

export function loadWatchlist(): Watchlist {
  return WatchlistSchema.parse(loadYaml("watchlist.yaml"));
}
