// The pitch: "15 seconds of LTE was enough". Offline phone shares a case, SAAO replies meanwhile; the phone gets a 15 s online window
// (every API call delayed like a real LTE round trip) and in that window the facts go up and the weather, flood level and the reply come down.
// Needs a backend on :8000 started with SAAO_TOKEN=qa-local-code (skipped otherwise); build with the default API URL.
import { test, expect, type Browser, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const API = process.env.QA_API ?? "http://localhost:8000";
const CODE = "qa-local-code";
const RTT_MS = Number(process.env.RTT_MS ?? 300); // one LTE round trip of added latency per API call
const up = async () => fetch(`${API}/api/health`).then((r) => r.ok, () => false);
const saao = (path: string, init: RequestInit = {}) => fetch(API + path, { ...init, headers: { "X-SAAO-Token": CODE, "Content-Type": "application/json", ...init.headers } });

const idb = <T>(page: Page, fn: string, arg?: unknown) =>
  page.evaluate(
    ([src, a]) =>
      new Promise<T>((res, rej) => {
        const r = indexedDB.open("dhansathi");
        r.onerror = () => rej(r.error);
        r.onsuccess = () => res(new Function("db", "arg", `return (${src})(db, arg)`)(r.result, a));
      }),
    [fn, arg] as const,
  );
const kvGet = (page: Page, key: string) => idb<unknown>(page, `(db, k) => new Promise((res) => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); })`, key);
const kvPut = (page: Page, key: string, v: unknown) => idb<void>(page, `(db, a) => new Promise((res) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(a[1], a[0]); tx.oncomplete = () => res(); })`, [key, v]);

async function newPhone(browser: Browser, profile: object | null) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: "allow" });
  await ctx.addInitScript(() => {
    localStorage.setItem("lang", "en");
    localStorage.setItem("demo_date", "2026-08-20");
  });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByText("Every file is on the phone")).toBeVisible({ timeout: 60_000 });
  if (profile) await kvPut(page, "profile", profile);
  return { ctx, page };
}

async function leafResult(page: Page) {
  await page.goto("/check/");
  await page.locator("input[type=file]:not([capture])").setInputFiles(Array(3).fill("public/samples/blast-1.jpg"));
  for (let i = 0; i < 10 && !page.url().includes("/result"); i++) {
    const s = page.getByRole("button", { name: "See the result" });
    if (await s.isVisible()) await s.click();
    else await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(150);
  }
  await page.waitForURL(/\/result\/\?id=/);
  return new URL(page.url()).searchParams.get("id")!;
}
const share = async (page: Page) => {
  await page.getByRole("button", { name: "Share with my SAAO" }).click();
  await page.getByRole("button", { name: "Yes, share" }).click();
};
const onServer = async (id: string) => ((await (await saao("/api/cases?limit=200")).json()) as { case_id: string }[]).some((c) => c.case_id === id);

test.describe("burst sync", () => {
  test.beforeAll(async () => test.skip(!(await up()), "no backend (QA_API, default :8000)"));

  test("a 15 s online window is enough: facts up, weather + flood + SAAO reply down, banner says so", async ({ browser }) => {
    const { ctx, page } = await newPhone(browser, { upazila: "SRJ-SIRAJGANJ", season: "aman" });

    // 1) online once: case A reaches the server, the phone gets its first pack
    const a = await leafResult(page);
    await share(page);
    await expect.poll(() => onServer(a), { timeout: 30_000 }).toBe(true);
    await expect.poll(async () => !!(await kvGet(page, "pack_current")), { timeout: 15_000 }).toBe(true);

    // 2) airplane mode: the farmer shares case B; meanwhile the SAAO answers case A
    await ctx.setOffline(true);
    const b = await leafResult(page);
    await share(page);
    expect(await onServer(b)).toBe(false);
    const text = `Keep water in the field ${Date.now()}`;
    expect((await saao(`/api/cases/${a}/reply`, { method: "POST", body: JSON.stringify({ text, by: "saao" }) })).ok).toBe(true);

    // The server's forecast and flood level moved on since the phone last synced (they are seeded, so make the phone's copy yesterday's).
    const pack = (await kvGet(page, "pack_current")) as { parts: Record<string, { version: string }> };
    pack.parts.flood.version = pack.parts.forecast.version = "yesterday";
    await kvPut(page, "pack_current", pack);

    // 3) the 15 s of LTE: every API call takes an extra round trip
    let apiCalls = 0;
    await page.route(`${API}/api/**`, async (route) => {
      apiCalls++;
      await new Promise((r) => setTimeout(r, RTT_MS));
      await route.continue();
    });
    const t0 = Date.now();
    await ctx.setOffline(false);
    await expect(page.getByText(/Synced in \d+ s.*SAAO reply/)).toBeVisible({ timeout: 15_000 }); // (the toast of step 1 has no reply in it)
    const arrived = Date.now() - t0;
    await ctx.setOffline(true); // window over: airplane mode again

    expect(arrived).toBeLessThan(15_000);
    expect(await onServer(b)).toBe(true); // facts arrived inside the window
    const banner = await page.getByText(/Synced in \d+ s.*SAAO reply/).first().innerText();
    expect(banner).toMatch(/sent 1 case/);
    expect(banner).toMatch(/weather/);
    expect(banner).toMatch(/flood level/);
    expect(banner).toMatch(/1 SAAO reply/);

    const rep = (await kvGet(page, "sync_report")) as { ms: number; sent: Record<string, number>; received: string[]; new_replies: number; bytes_up: number; bytes_down: number };
    expect(rep.ms).toBeLessThan(15_000);
    expect(rep.sent.facts).toBe(1);
    expect(rep.received).toEqual(expect.arrayContaining(["case_replies", "flood", "forecast"]));
    expect(rep.new_replies).toBe(1);

    // 4) still offline: the area news shows what arrived, labelled with its date
    await page.goto(`/result/?id=${b}`);
    const area = page.getByRole("region", { name: "Latest for your area" });
    await expect(area).toContainText("Offline — showing data from");
    await expect(area).toContainText(text); // the SAAO reply
    await expect(area).toContainText("Sirajganj"); // flood station
    await expect(area).toContainText("Rain, next 3 days");
    await expect(area).toContainText("Paddy price");
    await expect(page.getByText("Getting area news")).toHaveCount(0);

    writeFileSync("e2e/burst-timings.json", JSON.stringify({ rtt_added_ms: RTT_MS, window_ms: arrived, api_calls: apiCalls, report: rep }, null, 1));
    await ctx.close();
  });

  test("area news always ends in a sentence: no area, offline without data, fresh then offline", async ({ browser }) => {
    const none = await newPhone(browser, null);
    const id = await leafResult(none.page);
    expect(id).toBeTruthy();
    await expect(none.page.getByText("No area selected")).toBeVisible({ timeout: 12_000 });
    await expect(none.page.getByRole("link", { name: "Set your area" })).toBeVisible();
    await none.ctx.close();

    const { ctx, page } = await newPhone(browser, { upazila: "SRJ-SIRAJGANJ", season: "aman" });
    await ctx.setOffline(true);
    await leafResult(page);
    await expect(page.getByText("With internet, flood, rain and price news")).toBeVisible({ timeout: 12_000 });
    await ctx.close();
  });
});
