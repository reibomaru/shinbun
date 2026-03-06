import { test, expect } from "@playwright/test";

test.describe("記事詳細ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/items/1");
  });

  test("記事タイトルが表示される", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Claude 3.7 Sonnet リリース" })
    ).toBeVisible();
  });

  test("要約セクションが表示される", async ({ page }) => {
    await expect(page.getByText("要約")).toBeVisible();
    await expect(page.getByText("拡張思考モード", { exact: false })).toBeVisible();
  });

  test("Key Pointsが表示される", async ({ page }) => {
    await expect(page.getByText("Key Points")).toBeVisible();
    await expect(page.getByText("拡張思考モード（Extended Thinking）が正式サポート")).toBeVisible();
  });

  test("Why it mattersセクションが表示される", async ({ page }) => {
    await expect(page.getByText("Why it matters")).toBeVisible();
  });

  test("原文リンクが表示される", async ({ page }) => {
    await expect(page.getByText("原文を読む")).toBeVisible();
  });

  test("関連エンティティが表示される", async ({ page }) => {
    await expect(page.getByText("関連エンティティ")).toBeVisible();
    await expect(page.getByText("Anthropic").first()).toBeVisible();
  });

  test("トピック・フォーマットラベルが表示される", async ({ page }) => {
    await expect(page.getByText("GenAI").first()).toBeVisible();
    await expect(page.getByText("Release").first()).toBeVisible();
  });

  test("一覧へ戻るリンクでダッシュボードに遷移する", async ({ page }) => {
    await page.getByText("一覧へ").click();
    await expect(page).toHaveURL("/");
  });

  test("アクションボタンが表示される", async ({ page }) => {
    await expect(page.getByRole("button", { name: /保存/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /役立った/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /不要/ })).toBeVisible();
  });

  test("存在しない記事IDで404ページが表示される", async ({ page }) => {
    const response = await page.goto("/items/99999");
    expect(response?.status()).toBe(404);
  });
});
