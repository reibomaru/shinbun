import { describe, it, expect } from "vitest";
import { MODELS } from "./gemini.js";

describe("gemini client", () => {
  it("MODELS に正しいモデル名が定義されている", () => {
    expect(MODELS.FLASH_LITE).toBe("gemini-2.5-flash-lite");
    expect(MODELS.FLASH).toBe("gemini-2.5-flash");
  });
});
