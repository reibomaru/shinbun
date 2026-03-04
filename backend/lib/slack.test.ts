import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env.SLACK_WEBHOOK_URL;

describe("slack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }));
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.SLACK_WEBHOOK_URL = originalEnv;
    } else {
      delete process.env.SLACK_WEBHOOK_URL;
    }
    vi.unstubAllGlobals();
  });

  it("WEBHOOK_URL 設定時に sendUrgentAlert が fetch を呼ぶ", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";

    // モジュールを再読み込み（環境変数の再評価のため）
    vi.resetModules();
    const { sendUrgentAlert } = await import("./slack.js");

    await sendUrgentAlert({
      title: "Critical CVE",
      url: "https://example.com/cve",
      topic: "security",
      summaryShort: "A critical vulnerability was found",
      importanceScore: 0.95,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("WEBHOOK_URL 未設定時は no-op", async () => {
    delete process.env.SLACK_WEBHOOK_URL;

    vi.resetModules();
    const { sendUrgentAlert } = await import("./slack.js");

    await sendUrgentAlert({
      title: "Test",
      url: "https://example.com",
      topic: "genai",
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("sendCostAlert が正しいペイロードを送信する", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";

    vi.resetModules();
    const { sendCostAlert } = await import("./slack.js");

    await sendCostAlert(6.5, 5.0);

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.blocks[1].text.text).toContain("$6.5000");
    expect(body.blocks[1].text.text).toContain("$5.00");
  });
});
