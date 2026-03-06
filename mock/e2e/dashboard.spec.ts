import { test, expect } from "@playwright/test";

test.describe("ダッシュボード", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("ページタイトルが正しい", async ({ page }) => {
    await expect(page).toHaveTitle(/AI Tech Daily/);
  });

  test("ヘッダーが表示される", async ({ page }) => {
    await expect(page.getByText("AI Tech Daily", { exact: false })).toBeVisible();
  });

  test("Top Storiesセクションが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Top Stories/i })).toBeVisible();
  });

  test("カテゴリセクションが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /GenAI/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Frontend/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Backend/i })).toBeVisible();
  });

  test("Releasesサイドバーが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Releases/i })).toBeVisible();
  });

  test("緊急アラートバナーが表示される", async ({ page }) => {
    await expect(page.getByText("緊急アラート")).toBeVisible();
  });

  test("記事カードをクリックすると詳細ページに遷移する", async ({ page }) => {
    await page.getByText("Claude 3.7 Sonnet リリース").first().click();
    await expect(page).toHaveURL(/\/items\/1/);
  });

  test("カテゴリ件数が表示される", async ({ page }) => {
    await expect(page.getByText(/GenAI.*件/)).toBeVisible();
    await expect(page.getByText(/Frontend.*件/)).toBeVisible();
  });
});
