// Storage full (IndexedDB QuotaExceededError): saving a check or sharing must say so and stay put, not hang or pretend.
import { test, expect } from "@playwright/test";

test("storage full: check stays on the page with a message; share keeps the case local", async ({ context, page }) => {
  await context.addInitScript(() => {
    localStorage.setItem("lang", "en");
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...a) {
      if (this.name === "cases" && (window as unknown as { __full?: boolean }).__full) throw new DOMException("full", "QuotaExceededError");
      return put.apply(this, a);
    };
  });
  const full = (on: boolean) => page.evaluate((v) => ((window as unknown as { __full?: boolean }).__full = v), on);

  await page.goto("/check/");
  await page.locator("input[type=file]:not([capture])").setInputFiles("public/samples/brown_spot-1.jpg");
  await page.getByRole("button", { name: "Next", exact: true }).click(); // field → where
  await page.getByRole("checkbox", { name: "Stem near the water" }).click(); // off-leaf only: shortest path to the end
  await full(true);
  for (let i = 0; i < 4; i++) {
    const see = page.getByRole("button", { name: "See the result" });
    if (await see.isVisible()) await see.click();
    else await page.getByRole("button", { name: "Next", exact: true }).click({ timeout: 5_000 }).catch(() => {});
    if (await page.getByText("Could not save on the phone").first().isVisible()) break;
    await page.waitForTimeout(300);
  }
  await expect(page.getByText("Could not save on the phone").first()).toBeVisible();
  expect(page.url()).toContain("/check/");
  // The button is usable again (not stuck on a spinner): storage freed up, the same tap works.
  await full(false);
  for (let i = 0; i < 4 && !page.url().includes("/result"); i++) {
    const see = page.getByRole("button", { name: "See the result" });
    if (await see.isVisible()) await see.click();
    else await page.getByRole("button", { name: "Next", exact: true }).click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.waitForURL(/\/result\/\?id=/);

  await full(true);
  await page.getByRole("button", { name: "Share with my SAAO" }).click();
  await page.getByRole("button", { name: "Yes, share" }).click();
  await expect(page.getByText("Could not save on the phone").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Share with my SAAO" })).toBeVisible(); // still local, nothing claimed as queued
});
