import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("has RTL and Hebrew title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: /התחברות למערכת/ })).toBeVisible();
  });

  test("shows email input and send code button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/אימייל/)).toBeVisible();
    await expect(page.getByRole("button", { name: /שלחו לי קוד/ })).toBeVisible();
  });

  test("test login as teacher navigates to teacher dashboard", async ({ page }) => {
    await page.goto("/login/student");
    await page.getByRole("button", { name: /כניסה כמורה/ }).click();
    await expect(page).toHaveURL(/\/teacher/);
    await expect(page.getByText(/לוח מורה|דף הבית|השיעורים שלי/)).toBeVisible();
  });

  test("test login as student navigates to student dashboard", async ({ page }) => {
    await page.goto("/login/student");
    await page.getByRole("button", { name: /כניסה כתלמיד/ }).click();
    await expect(page).toHaveURL(/\/student/);
    await expect(page.getByText(/השיעורים שלי|קביעת שיעור/)).toBeVisible();
  });
});
