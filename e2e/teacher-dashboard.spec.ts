import { test, expect } from "@playwright/test";

test.describe("Teacher dashboard (after test login)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /כניסה כמורה/ }).click();
    await expect(page).toHaveURL(/\/teacher/);
  });

  test("shows greeting and stats", async ({ page }) => {
    await expect(page.getByText(/שלום|שיעורים היום|שיעורים השבוע/)).toBeVisible();
  });

  test("shows lessons table and availability section", async ({ page }) => {
    await expect(page.getByText(/השיעורים הקרובים|זמינות/)).toBeVisible();
    await expect(page.getByRole("button", { name: /הוסף זמינות/ })).toBeVisible();
  });
});
