import { test, expect } from "@playwright/test";

test.describe("ナビゲーション", () => {
  test("ヘッダーナビでダッシュボード→アーカイブ→保存済みに遷移できる", async ({ page }) => {
    await page.goto("/");

    // ダッシュボードが表示されていることを確認
    await expect(page.getByRole("heading", { name: /Top Stories/i })).toBeVisible();

    // アーカイブに遷移
    await page.getByRole("button", { name: /アーカイブ/ }).click();
    await expect(page).toHaveURL("/archives");
    await expect(page.getByRole("heading", { name: "バックナンバー" })).toBeVisible();

    // 保存済みに遷移
    await page.getByRole("button", { name: /保存済み/ }).click();
    await expect(page).toHaveURL("/saved");
    await expect(page.getByRole("heading", { name: "保存済み記事" })).toBeVisible();

    // ダッシュボードに戻る
    await page.getByRole("button", { name: /ダッシュボード/ }).click();
    await expect(page).toHaveURL("/");
  });

  test("ロゴクリックでダッシュボードに戻る", async ({ page }) => {
    await page.goto("/saved");
    await page.getByText("AI Tech Daily", { exact: false }).first().click();
    await expect(page).toHaveURL("/");
  });

  test("記事詳細から一覧へ戻れる", async ({ page }) => {
    await page.goto("/items/1");
    await page.getByText("一覧へ").click();
    await expect(page).toHaveURL("/");
  });

  test("検索バーが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("記事を検索...")).toBeVisible();
  });
});
