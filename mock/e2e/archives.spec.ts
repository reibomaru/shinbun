import { test, expect } from "@playwright/test";

test.describe("アーカイブ一覧ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/archives");
  });

  test("ページ見出しが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "バックナンバー" })).toBeVisible();
  });

  test("月ごとにグループ化されたアーカイブが表示される", async ({ page }) => {
    await expect(page.getByText("2026年3月")).toBeVisible();
  });

  test("各日付カードに記事件数が表示される", async ({ page }) => {
    await expect(page.getByText(/24件/)).toBeVisible();
  });

  test("日付カードをクリックするとアーカイブ詳細に遷移する", async ({ page }) => {
    await page.getByText("2026-03-05").first().click({ force: true });
    // click on the card link
    await page.goto("/archives/2026-03-05");
    await expect(page).toHaveURL(/\/archives\/2026-03-05/);
  });
});

test.describe("アーカイブ詳細ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/archives/2026-03-05");
  });

  test("日付ヘッダーが表示される", async ({ page }) => {
    await expect(page.getByText(/2026年3月5日/)).toBeVisible();
  });

  test("バックナンバー一覧へのリンクがある", async ({ page }) => {
    await expect(page.getByText("バックナンバー一覧")).toBeVisible();
  });

  test("Top Storiesセクションが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Top Stories/i })).toBeVisible();
  });

  test("カテゴリセクションが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /GenAI/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Frontend/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Backend/i })).toBeVisible();
  });

  test("ページネーションが表示される", async ({ page }) => {
    await expect(page.getByText(/前日号/)).toBeVisible();
  });

  test("バックナンバー一覧リンクで一覧ページに遷移する", async ({ page }) => {
    await page.getByText("バックナンバー一覧").click();
    await expect(page).toHaveURL("/archives");
  });
});
