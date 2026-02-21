import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads with hero and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /שיעורים פרטיים שמביאים תוצאות/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /קביעת שיעור/ }).first()).toBeVisible();
  });

  test("navbar has booking link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /קביעת שיעור/ }).first().click();
    await expect(page).toHaveURL(/\/book/);
  });

  test("has category cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("מתמטיקה")).toBeVisible();
    await expect(page.getByText("אנגלית")).toBeVisible();
  });
});
