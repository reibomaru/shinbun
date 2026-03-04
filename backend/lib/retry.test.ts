import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry.js";

describe("withRetry", () => {
  it("成功時はそのまま値を返す", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("一時的な失敗後にリトライして成功する", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("maxRetries 回失敗したら最後のエラーを throw する", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fail"));

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow("always fail");
    // 初回 + 2回リトライ = 3回
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("maxRetries=0 のときは1回だけ実行する", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    await expect(withRetry(fn, { maxRetries: 0, baseDelayMs: 1 })).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
