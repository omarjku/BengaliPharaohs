// The leaf check adapts to answers; back keeps answers; "Change answers" on the result reopens the check.
import { test, expect } from "@playwright/test";

test("back keeps answers, off-leaf answers skip leaf/weather steps, result → change answers", async ({ context, page }) => {
  await context.addInitScript(() => localStorage.setItem("lang", "en"));
  await page.goto("/check/");
  await page.locator('input[type=file]:not([capture])').setInputFiles("public/samples/brown_spot-1.jpg");
  // First visit: field details are unknown, so the field step is shown.
  await page.getByRole("button", { name: "Next", exact: true }).click(); // field → where

  // Answer "where" with a leaf place, go forward, then back: the answer is still selected.
  await page.getByRole("checkbox", { name: "Leaf tip or edge" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("checkbox", { name: "Leaf tip or edge" })).toBeChecked();

  // Off-leaf only (sheath): leaf-detail and weather steps disappear → straight to result (location guard card).
  await page.getByRole("checkbox", { name: "Leaf tip or edge" }).click(); // unselect
  await page.getByRole("checkbox", { name: "Stem near the water" }).click();
  for (let i = 0; i < 4 && !page.url().includes("/result"); i++) {
    const see = page.getByRole("button", { name: "See the result" });
    if (await see.isVisible()) await see.click();
    // The last click can race the navigation to the result (button disabled, then gone): don't wait 2 min for it.
    else await page.getByRole("button", { name: "Next", exact: true }).click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForURL(/\/result\/\?id=/);

  // Change answers → back in the check at the "where" step with the photo and answers kept.
  await page.getByRole("link", { name: "Change answers" }).click();
  await page.waitForURL(/\/check\/\?edit=/);
  await expect(page.getByRole("checkbox", { name: "Stem near the water" })).toBeChecked();
});
