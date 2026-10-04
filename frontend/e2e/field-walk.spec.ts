// Guided field walk: >=3 spots, each read right away, summary first on the result, pattern pre-selected.
import { test, expect } from "@playwright/test";

const S = "public/samples/";

test("field walk: 3 spots -> badges, Next needs 3, summary '2 of 3', whole-field action, pattern pre-selected", async ({ context, page }) => {
  await context.addInitScript(() => localStorage.setItem("lang", "en"));
  await page.goto("/check/");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await expect(next).toBeDisabled();

  // Two photos: still not enough, and the page says why.
  await page.locator("input[type=file]:not([capture])").setInputFiles([S + "blast-1.jpg", S + "blast-2.jpg"]);
  await expect(page.getByTestId("walk-hint")).toContainText("At least 3 leaves from different spots (2/3)", { timeout: 60_000 });
  await expect(next).toBeDisabled();
  await expect(page.locator('[data-spot="0"]')).toContainText(/blast|\?/i, { timeout: 30_000 }); // dot became a badge

  // Third spot: "where it looks worst" (dot 6), added one by one; then Next opens.
  await page.locator('[data-spot="5"]').click();
  await page.locator("input[type=file]:not([capture])").setInputFiles(S + "healthy-1.jpg");
  await expect(page.getByTestId("walk-hint")).toContainText("3 spots done", { timeout: 60_000 });
  await expect(page.locator('[data-spot="5"]')).toContainText(/healthy|\?/i, { timeout: 30_000 });
  await page.screenshot({ path: "/private/tmp/claude-501/shots/walk.png", fullPage: true });
  await expect(next).toBeEnabled({ timeout: 30_000 });
  await next.click(); // -> field step (first visit)
  await expect(page.locator('[data-spot="0"]')).toBeHidden(); // walk hidden, next step shown
  await page.waitForTimeout(400); // step animation
  await next.click(); // field -> where

  // The spread question is already answered from the walk (2 of 3 confident spots show blast = whole field).
  await expect(page.getByRole("button", { name: "Almost all plants, evenly", exact: true })).toHaveAttribute("aria-pressed", "true");

  for (let i = 0; i < 10 && !page.url().includes("/result"); i++) {
    const see = page.getByRole("button", { name: "See the result" });
    if (await see.isVisible()) await see.click();
    else await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(150);
  }
  await page.waitForURL(/\/result\/\?id=/);
  const lead = page.getByTestId("field-lead");
  await expect(lead).toContainText("2 of 3 spots: blast");
  await expect(page.getByTestId("field-spread")).toHaveText("Across the whole field");
  await expect(page.getByTestId("field-action")).toContainText("Contact the SAAO today");
  await expect(page.getByTestId("field-summary")).not.toContainText("%");
  await page.screenshot({ path: "/private/tmp/claude-501/shots/result.png", fullPage: true });
});
