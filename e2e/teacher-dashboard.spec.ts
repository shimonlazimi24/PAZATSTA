import { test, expect } from "@playwright/test";

test.describe("Teacher dashboard (after test login)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login/student");
    await page.getByRole("button", { name: /כניסה כמורה/ }).click();
    await expect(page).toHaveURL(/\/teacher/);
  });

  test("shows dashboard title and lessons section", async ({ page }) => {
    await expect(page.getByText(/דף הבית|השיעורים שלי/)).toBeVisible();
  });

  test("shows link to define availability", async ({ page }) => {
    await expect(page.getByRole("link", { name: /הגדרת זמינות/ })).toBeVisible();
  });
});
