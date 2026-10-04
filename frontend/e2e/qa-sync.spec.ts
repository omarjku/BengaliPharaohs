// Share -> queue -> reconnect -> SAAO dashboard (thumb, photo, reply) -> reply back on the farmer's phone.
// Needs a backend on :8000 started with SAAO_TOKEN=qa-local-code (skipped otherwise), and a build made with the default API URL:
//   SAAO_TOKEN=qa-local-code uvicorn app.main:app --port 8000   (in backend/)  then  npx playwright test e2e/qa-sync.spec.ts
import { test, expect, type Page } from "@playwright/test";

const API = process.env.QA_API ?? "http://localhost:8000";
const CODE = "qa-local-code";
const up = async () => fetch(`${API}/api/health`).then((r) => r.ok, () => false);
const saao = (path: string, init: RequestInit = {}) => fetch(API + path, { ...init, headers: { "X-SAAO-Token": CODE, ...init.headers } });

async function newPhone(browser: import("@playwright/test").Browser, code = CODE) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: "allow" });
  await ctx.addInitScript((c) => {
    localStorage.setItem("lang", "en");
    localStorage.setItem("demo_date", "2026-08-20");
    localStorage.setItem("saao_code", c);
  }, code);
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByText("Every file is on the phone")).toBeVisible({ timeout: 60_000 });
  return { ctx, page };
}

async function leafResult(page: Page) {
  await page.goto("/check/");
  await page.locator("input[type=file]:not([capture])").setInputFiles("public/samples/blast-1.jpg");
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

test.describe("sync with a live backend", () => {
  test.beforeAll(async () => test.skip(!(await up()), "no backend (QA_API, default :8000)"));

  test("offline share waits, reconnect sends facts + thumb + photo, SAAO sees them and replies, farmer sees the reply", async ({ browser }) => {
    const { ctx, page } = await newPhone(browser);
    // give the phone a profile so the offline pack (and the replies in it) is fetched for this upazila
    await page.evaluate(
      () => new Promise<void>((res) => {
        const r = indexedDB.open("dhansathi");
        r.onsuccess = () => {
          const tx = r.result.transaction("kv", "readwrite");
          tx.objectStore("kv").put({ upazila: "SRJ-SIRAJGANJ", season: "aman" }, "profile");
          tx.oncomplete = () => res();
        };
      }),
    );
    const id = await leafResult(page);

    await ctx.setOffline(true);
    await share(page);
    await expect(page.getByText(/Saved\. It will be sent|Waiting/).first()).toBeVisible({ timeout: 10_000 });
    await ctx.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    // facts first, then the photo files: poll the server until all three are there
    await expect
      .poll(async () => {
        const rows = (await (await saao("/api/cases?upazila=")).json()) as { case_id: string; blobs: Record<string, boolean> }[];
        const r = rows.find((x) => x.case_id === id);
        return r ? `${r.blobs.thumb}/${r.blobs.photo}` : "missing";
      }, { timeout: 30_000 })
      .toBe("true/true");
    const thumb = await saao(`/api/cases/${id}/thumb`);
    expect(thumb.headers.get("content-type")).toBe("image/jpeg");

    // the SAAO dashboard, on its own device
    const boss = await newPhone(browser);
    await boss.page.goto("/saao/");
    const row = boss.page.locator("li", { hasText: id.slice(0, 0) }).first();
    await expect(row.locator("img").first()).toBeVisible({ timeout: 15_000 }); // thumbnail loaded through the code header
    await boss.page.getByPlaceholder(/short reply/i).fill("I will visit on Thursday");
    const send = boss.page.getByRole("button", { name: "Send reply" });
    await send.dblclick(); // double tap must send once
    await expect(boss.page.getByText("I will visit on Thursday")).toBeVisible();
    const after = (await (await saao("/api/cases")).json()) as { case_id: string; reply: { text: string } | null }[];
    expect(after.find((x) => x.case_id === id)?.reply?.text).toBe("I will visit on Thursday");
    const all = await (await fetch(`${API}/api/pack/case_replies?upazila=SRJ-SIRAJGANJ&device_id=${await page.evaluate(() => localStorage.getItem("device_id"))}`)).json();
    expect(all.data.replies).toHaveLength(1);

    // the farmer's phone picks it up with the pack
    await page.goto("/cases/");
    await expect(page.getByText("I will visit on Thursday")).toBeVisible({ timeout: 20_000 });
    await ctx.close();
    await boss.ctx.close();
  });

  test("wrong SAAO code says so (not 'server down' with fake cases)", async ({ browser }) => {
    const { ctx, page } = await newPhone(browser, "nope");
    await page.goto("/saao/");
    await expect(page.getByText(/code was not accepted/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/seeded/i)).toHaveCount(0);
    await ctx.close();
  });

  test("undecodable photo file (HEIC-like): the wizard does not crash", async ({ browser }) => {
    const { ctx, page } = await newPhone(browser);
    await page.goto("/check/");
    await page.locator("input[type=file]:not([capture])").setInputFiles({ name: "x.heic", mimeType: "image/heic", buffer: Buffer.from("not an image at all") });
    await page.waitForTimeout(2500);
    // whatever the wizard does with the bad file, the page must still be usable (no crash screen)
    await expect(page.locator("body")).not.toContainText("Application error");
    await ctx.close();
  });
});

// No backend needed: an old copy of the app (DB v1) is still open in another tab when the new version (v2) starts.
test("DB upgrade v1 -> v2 blocked by an old open tab: page says why, then recovers with the data intact", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: "allow" });
  await ctx.addInitScript(() => localStorage.setItem("lang", "en"));
  const old = await ctx.newPage();
  await old.goto("/manifest.webmanifest"); // same origin, no app code: we play the old app by hand
  await old.evaluate(
    () => new Promise<void>((res) => {
      const r = indexedDB.open("dhansathi", 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore("kv");
        d.createObjectStore("cases", { keyPath: "id" }).createIndex("by_created", "created_at");
        d.createObjectStore("photos");
        r.transaction!.objectStore("cases").put({ id: "old1", created_at: "2026-10-01T00:00:00Z", kind: "flood", card: "A1", date_used: "2026-10-01", simulated_date: false, share: "queued", consent: true });
      };
      r.onsuccess = () => {
        (window as unknown as { __db: IDBDatabase }).__db = r.result;
        res();
      };
    }),
  );
  const page = await ctx.newPage();
  await page.goto("/cases/");
  await expect(page.getByText(/also open in another tab or window/i)).toBeVisible({ timeout: 10_000 });
  await old.evaluate(() => (window as unknown as { __db: IDBDatabase }).__db.close());
  await expect(page.getByText("Waiting to send")).toBeVisible({ timeout: 10_000 });
  await ctx.close();
});

test("backend down: /saao shows labelled seeded cases and does not overflow a 360 px phone", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("lang", "en");
    localStorage.setItem("saao_code", "x");
  });
  const page = await ctx.newPage();
  await page.route("**/api/cases*", (r) => r.abort());
  await page.goto("/saao/");
  await expect(page.getByText(/seeded/i).first()).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await ctx.close();
});
