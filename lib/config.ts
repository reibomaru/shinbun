import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { SourceConfig } from "./fetchers/types.js";

const CONFIG_DIR = path.resolve(process.cwd(), "config");

function loadYaml<T>(filename: string): T {
  const filePath = path.join(CONFIG_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8");
  return yaml.load(content) as T;
}

/** sources.yaml を読み込み、ソース一覧を返す */
export function loadSources(): SourceConfig[] {
  const data = loadYaml<{ sources: SourceConfig[] }>("sources.yaml");
  return data.sources;
}

/** settings.yaml を読み込む */
export interface Settings {
  digest: {
    time: string;
    timezone: string;
    top_count: number;
    total_count: number;
  };
  cost_alert: {
    daily_usd: number;
  };
}

export function loadSettings(): Settings {
  return loadYaml<Settings>("settings.yaml");
}

/** watchlist.yaml を読み込む */
export interface WatchlistEntity {
  name: string;
  notify_realtime: boolean;
  score_boost: number;
}

export interface WatchlistKeyword {
  value: string;
  notify_realtime: boolean;
  score_boost: number;
}

export interface Watchlist {
  entities: WatchlistEntity[];
  keywords: WatchlistKeyword[];
}

export function loadWatchlist(): Watchlist {
  return loadYaml<Watchlist>("watchlist.yaml");
}
