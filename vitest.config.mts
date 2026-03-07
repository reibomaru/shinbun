import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "backend/lib/**/*.test.ts",
      "backend/scripts/**/*.test.ts",
      "frontend/lib/**/*.test.ts",
      "frontend/components/**/*.test.ts",
    ],
  },
});
