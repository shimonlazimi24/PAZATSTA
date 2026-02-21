import { test, expect } from "@playwright/test";

test.describe("Booking wizard", () => {
  test("shows stepper and step 1 (subject)", async ({ page }) => {
    await page.goto("/book");
    await expect(page.getByText(/קביעת שיעור/)).toBeVisible();
    await expect(page.getByText("מתמטיקה")).toBeVisible();
  });

  test("can select subject and proceed", async ({ page }) => {
    await page.goto("/book");
    await page.getByText("מתמטיקה").first().click();
    await page.getByRole("button", { name: /המשך/ }).click();
    await expect(page.getByText(/יסודי|חטיבה|תיכון|בגרות/)).toBeVisible();
  });

  test("can reach step 4 (date) after subject, grade, teacher", async ({ page }) => {
    await page.goto("/book");
    await page.getByText("מתמטיקה").first().click();
    await page.getByRole("button", { name: /המשך/ }).click();
    await page.getByRole("button", { name: "תיכון" }).click();
    await page.getByRole("button", { name: /המשך/ }).click();
    await expect(page.getByText(/דני כהן|מיכל לוי/)).toBeVisible();
    await page.getByRole("button", { name: /דני כהן/ }).first().click();
    await page.getByRole("button", { name: /המשך/ }).click();
    await expect(page.getByText(/תאריך|שעה/)).toBeVisible();
  });
});
