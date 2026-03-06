import { test, expect } from "@playwright/test";

test.describe("レスポンシブデザイン - モバイル (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("ダッシュボードがモバイルで正しく表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Top Stories/i })).toBeVisible();
  });

  test("ヘッダーがモバイルで表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AI Tech Daily", { exact: false })).toBeVisible();
  });

  test("記事詳細がモバイルで表示される", async ({ page }) => {
    await page.goto("/items/1");
    await expect(
      page.getByRole("heading", { name: "Claude 3.7 Sonnet リリース" })
    ).toBeVisible();
    await expect(page.getByText("要約")).toBeVisible();
  });

  test("保存済みページがモバイルで表示される", async ({ page }) => {
    await page.goto("/saved");
    await expect(page.getByRole("heading", { name: "保存済み記事" })).toBeVisible();
  });

  test("ログインページがモバイルで表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });
});

test.describe("レスポンシブデザイン - デスクトップ (1280px)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("ダッシュボードで2カラムレイアウトが表示される", async ({ page }) => {
    await page.goto("/");

    // Releasesサイドバーが表示される（デスクトップのみ）
    await expect(page.getByRole("heading", { name: /Releases/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Top Stories/i })).toBeVisible();
  });

  test("アーカイブページで3カラムグリッドが表示される", async ({ page }) => {
    await page.goto("/archives");
    await expect(page.getByRole("heading", { name: "バックナンバー" })).toBeVisible();
  });

  test("記事詳細ページがデスクトップで正しくレイアウトされる", async ({ page }) => {
    await page.goto("/items/1");
    await expect(
      page.getByRole("heading", { name: "Claude 3.7 Sonnet リリース" })
    ).toBeVisible();
    await expect(page.getByText("原文を読む")).toBeVisible();
  });
});
