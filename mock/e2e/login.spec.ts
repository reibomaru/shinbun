import { test, expect } from "@playwright/test";

test.describe("ログインページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("ログインフォームが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "AI Tech Daily" })).toBeVisible();
    await expect(page.getByText("パスワードを入力してください")).toBeVisible();
  });

  test("パスワード入力フィールドがある", async ({ page }) => {
    const passwordInput = page.getByLabel("パスワード");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("ログインボタンが表示される", async ({ page }) => {
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("パスワードを入力できる", async ({ page }) => {
    const passwordInput = page.getByLabel("パスワード");
    await passwordInput.fill("test-password");
    await expect(passwordInput).toHaveValue("test-password");
  });
});
