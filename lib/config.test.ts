import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";

const FIXTURE_DIR = path.resolve(__dirname, "../test-fixtures");

describe("config", () => {
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_DIR);
    vi.resetModules();
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  async function importConfig() {
    return await import("./config.js");
  }

  describe("loadSources", () => {
    it("正しい件数のソースを返す", async () => {
      const { loadSources } = await importConfig();
      const sources = loadSources();
      expect(sources).toHaveLength(2);
    });

    it("正しい型で返す", async () => {
      const { loadSources } = await importConfig();
      const sources = loadSources();
      expect(sources[0]).toMatchObject({
        type: "github_repo",
        name: "Test Repo",
        config: { owner: "test-owner", repo: "test-repo" },
        polling_interval: 3600,
      });
    });
  });

  describe("loadSettings", () => {
    it("digest フィールドを返す", async () => {
      const { loadSettings } = await importConfig();
      const settings = loadSettings();
      expect(settings.digest).toEqual({
        time: "09:00",
        timezone: "Asia/Tokyo",
        top_count: 3,
        total_count: 10,
      });
    });

    it("cost_alert フィールドを返す", async () => {
      const { loadSettings } = await importConfig();
      const settings = loadSettings();
      expect(settings.cost_alert).toEqual({ daily_usd: 10 });
    });
  });

  describe("loadWatchlist", () => {
    it("entities フィールドを返す", async () => {
      const { loadWatchlist } = await importConfig();
      const watchlist = loadWatchlist();
      expect(watchlist.entities).toHaveLength(1);
      expect(watchlist.entities[0]).toMatchObject({
        name: "TestEntity",
        notify_realtime: true,
        score_boost: 1.5,
      });
    });

    it("keywords フィールドを返す", async () => {
      const { loadWatchlist } = await importConfig();
      const watchlist = loadWatchlist();
      expect(watchlist.keywords).toHaveLength(1);
      expect(watchlist.keywords[0]).toMatchObject({
        value: "test-keyword",
        notify_realtime: false,
        score_boost: 1.1,
      });
    });
  });
});
