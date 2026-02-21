import { test, expect } from "@playwright/test";

test.describe("Student dashboard (after test login)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /כניסה כתלמיד/ }).click();
    await expect(page).toHaveURL(/\/student/);
  });

  test("shows booking section and my lessons", async ({ page }) => {
    await expect(page.getByText(/קביעת שיעור|השיעורים שלי/)).toBeVisible();
  });

  test("has teacher selector", async ({ page }) => {
    await expect(page.getByLabel(/מורה/)).toBeVisible();
  });
});
