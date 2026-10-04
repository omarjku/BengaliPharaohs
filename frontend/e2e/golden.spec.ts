// DEMO.md golden path against the production build (static export served on :3000), first online, then with the network cut.
// Language is forced to English only so selectors are readable; the logic under test is language-independent.
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const S = "public/samples/";
const T: Record<string, number> = {};
const timing = (k: string, ms: number) => void (T[k] = Math.round(ms));

type Case = { id: string; card: string; kind: string; share: string; consent: boolean; model_ms?: number; model_dummy?: boolean; prediction?: { top1: string; p1: number }; cross?: { decision: string; cls: string | null }; advisor?: { output: string }; created_at: string };
const cases = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Case[]>((res, rej) => {
        const r = indexedDB.open("dhansathi");
        r.onerror = () => rej(r.error);
        r.onsuccess = () => {
          const q = r.result.transaction("cases").objectStore("cases").getAll();
          q.onsuccess = () => res((q.result as Case[]).sort((a, b) => a.created_at.localeCompare(b.created_at)));
        };
      }),
  );
const lastCase = async (page: Page) => (await cases(page)).at(-1)!;

async function leafCheck(page: Page, sample: string) {
  await page.goto("/check/");
  await page.locator('input[type=file]:not([capture])').setInputFiles(S + sample);
  await expect(page.getByText("1/5").or(page.getByText("2/5"))).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click(); // field details
  await page.getByRole("button", { name: "Next", exact: true }).click(); // where/pattern
  await page.getByRole("button", { name: "Next", exact: true }).click(); // first/insects
  await page.getByRole("button", { name: "See the result" }).click();
  await page.waitForURL(/\/result\/\?id=/);
  await expect(page.getByRole("button", { name: "Listen", exact: true })).toBeVisible();
  return lastCase(page);
}

async function listen(page: Page, clipPrefix: RegExp) {
  const req = page.waitForResponse((r) => clipPrefix.test(r.url()) && r.status() === 200, { timeout: 15_000 });
  await page.getByRole("button", { name: "Listen", exact: true }).click();
  const r = await req;
  expect(r.headers()["content-type"]).toContain("audio");
  await page.getByRole("button", { name: "Stop", exact: true }).click().catch(() => {});
}

async function flood(page: Page, days: number) {
  await page.goto("/flood/");
  await page.getByRole("button", { name: "Flood", exact: true }).click();
  await page.getByLabel("Upazila").selectOption("SIR");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "No", exact: true }).click(); // not a flood-tolerant variety
  await page.getByRole("button", { name: "Whole plant under water" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const d = days - 3; // stepper starts at 3
  for (let i = 0; i < Math.abs(d); i++) await page.getByRole("button", { name: d > 0 ? "+1" : "-1" }).click();
  await page.getByRole("button", { name: "Tillering", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "See the result" }).click();
  await page.waitForURL(/\/result\/\?id=/);
  await expect(page.getByRole("button", { name: "Listen", exact: true })).toBeVisible();
  return lastCase(page);
}

async function share(page: Page) {
  await page.getByRole("button", { name: "Share with my SAAO" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Yes, share" }).click();
  await expect(page.getByText(/Saved\. It will be sent|Sent|Waiting/).first()).toBeVisible({ timeout: 10_000 });
  const c = await lastCase(page);
  expect(c.consent).toBe(true);
  expect(["queued", "failed"]).toContain(c.share); // no backend running: it must wait in the queue
  await page.goto("/cases/");
  await expect(page.getByText("Waiting to send").first()).toBeVisible();
}

async function suite(page: Page, label: string) {
  const step = async (name: string, fn: () => Promise<void>) => {
    const t0 = Date.now();
    await test.step(`${label}: ${name}`, fn);
    timing(`${label}: ${name} (ms)`, Date.now() - t0);
  };
  let c: Case;
  await step("leaf wizard, confident blast photo -> result card + Bangla audio", async () => {
    c = await leafCheck(page, "blast-1.jpg");
    expect(c.model_dummy).toBe(false);
    expect(c.prediction!.top1).toBe("blast");
    expect(c.card).toBe("C2");
    timing(`${label}: inference blast-1 (ms, preprocess+ort+softmax)`, c.model_ms!);
    await expect(page.getByText(/Blast/i).first()).toBeVisible();
    await listen(page, /\/audio\/C2-BLAST\.mp3|\/audio\/C2-[A-Z]+\.mp3/);
  });
  await step("healthy photo -> C1", async () => {
    c = await leafCheck(page, "healthy-1.jpg");
    expect(c.card).toBe("C1");
    timing(`${label}: inference healthy-1 (ms)`, c.model_ms!);
  });
  await step("non-rice (bean) photo -> NOT SURE card C8", async () => {
    for (const f of ["not_rice-1.jpg", "not_rice-3.jpg"]) {
      c = await leafCheck(page, f);
      expect(c.card).toBe("C8");
      expect(c.cross!.cls).toBeNull();
      await expect(page.getByRole("heading", { name: /Not sure/i }).first()).toBeVisible();
      timing(`${label}: inference ${f} (ms)`, c.model_ms!);
    }
    await listen(page, /\/audio\/C8-NOTSURE\.mp3/);
  });
  await step("honesty: unsure blb photo never answers confidently wrong", async () => {
    c = await leafCheck(page, "blb-1.jpg");
    expect(c.card).toBe("C8");
  });
  await step("after-flood advisor (simulated 2026-08-20): 2 d -> A1, 9 d -> A3, then T07 date -> A5", async () => {
    c = await flood(page, 2);
    expect([c.advisor!.output, c.card]).toEqual(["SURVIVES_CHECK", "A1"]); // T01
    await expect(page.getByText(/simulated/i).first()).toBeVisible();
    c = await flood(page, 9);
    expect([c.advisor!.output, c.card]).toEqual(["REPLANT_SHORT_DURATION", "A3"]); // T04
    await listen(page, /\/audio\/A3-REPLANT\.mp3/);
    await page.evaluate(() => localStorage.setItem("demo_date", "2026-10-03"));
    c = await flood(page, 10);
    expect([c.advisor!.output, c.card]).toEqual(["TOO_LATE_AMAN", "A5"]); // T07
    await page.evaluate(() => localStorage.setItem("demo_date", "2026-08-20"));
    c = await flood(page, 9);
    expect(c.card).toBe("A3");
  });
  await step("share with SAAO: consent dialog -> offline queue", async () => {
    await share(page);
  });
}

test("golden path online, then offline", async ({ context, page }: { context: BrowserContext; page: Page }) => {
  await context.addInitScript(() => {
    localStorage.setItem("lang", "en");
    if (!localStorage.getItem("demo_date")) localStorage.setItem("demo_date", "2026-08-20");
  });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  // Service worker + full precache must be ready first (home screen shows the green "works without internet" box).
  await page.goto("/");
  await expect(page.getByText("Every file is on the phone")).toBeVisible({ timeout: 60_000 });

  await suite(page, "ONLINE");

  // ---- network off. The service worker already holds the build. ----
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByText("Every file is on the phone")).toBeVisible({ timeout: 30_000 });
  const t0 = Date.now();
  await page.evaluate(() => navigator.onLine).then((o) => expect(o).toBe(false));

  // Cold model load while offline (fetch rice.onnx from the SW cache + create session + warm-up), measured with app's own classify.ts.
  const js = ts.transpileModule(readFileSync("src/lib/model/classify.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  await page.addScriptTag({ type: "module", content: js + "\nwindow.__c = { loadModel };" });
  await page.waitForFunction(() => (window as any).__c);
  timing("OFFLINE: model load incl. fetch from cache + warm-up (ms)", await page.evaluate(async () => { const t = performance.now(); await (window as any).__c.loadModel(); return performance.now() - t; }));
  void t0;

  await suite(page, "OFFLINE");
  writeFileSync("e2e/e2e-timings.json", JSON.stringify(T, null, 1));
  console.log(JSON.stringify(T, null, 1));
});
