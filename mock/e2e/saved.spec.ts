import { test, expect } from "@playwright/test";

test.describe("保存済みページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/saved");
  });

  test("ページ見出しが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "保存済み記事" })).toBeVisible();
  });

  test("保存件数が表示される", async ({ page }) => {
    await expect(page.getByText(/件/)).toBeVisible();
  });

  test("日付グループごとに記事が表示される", async ({ page }) => {
    await expect(page.getByText("2026/03/01")).toBeVisible();
  });

  test("タグフィルターチップが表示される", async ({ page }) => {
    await expect(page.getByText("タグ:")).toBeVisible();
    await expect(page.getByRole("button", { name: "llm" })).toBeVisible();
  });

  test("記事タイトルをクリックすると詳細ページに遷移する", async ({ page }) => {
    await page.getByText("Claude 3.7 Sonnet リリース").click();
    await expect(page).toHaveURL(/\/items\/1/);
  });

  test("ソート・フィルターボタンが表示される", async ({ page }) => {
    await expect(page.getByRole("button", { name: /日付順/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /タグで絞り込み/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /エクスポート/ })).toBeVisible();
  });
});
