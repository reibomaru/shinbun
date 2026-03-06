import { test, expect } from "@playwright/test";

test.describe("ArticleCard コンポーネント", () => {
  test("ダッシュボードで記事カードが正しく表示される", async ({ page }) => {
    await page.goto("/");

    // Top Storiesの最初の記事カードを確認
    const firstCard = page.locator('[class*="card"]').first();
    await expect(firstCard).toBeVisible();
  });

  test("記事カードにトピックラベルが表示される", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("GenAI").first()).toBeVisible();
    await expect(page.getByText("Frontend").first()).toBeVisible();
  });

  test("記事カードにソースと時間が表示される", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Anthropic").first()).toBeVisible();
  });

  test("記事カードにスコアが表示される", async ({ page }) => {
    await page.goto("/");

    // importanceScore が表示されている
    await expect(page.getByText("98").first()).toBeVisible();
  });

  test("非コンパクトモードでアクションボタンが表示される", async ({ page }) => {
    await page.goto("/");

    // Top Stories (非compact) の記事にアクションボタンがある
    await expect(page.getByRole("button", { name: /保存/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /役立った/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /不要/ }).first()).toBeVisible();
  });
});
