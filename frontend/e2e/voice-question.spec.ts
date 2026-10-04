// Voice question: record (fake mic) -> save -> goes up with the next sync -> SAAO sees the note + audio.
// The AI answer itself needs OPENAI_API_KEY on the backend and is covered by backend/tests/test_notes.py.
// Needs a backend on :8000 with SAAO_TOKEN=qa-local-code (skipped otherwise).
import { test, expect } from "@playwright/test";

const API = process.env.QA_API ?? "http://localhost:8000";
const up = async () => fetch(`${API}/api/health`).then((r) => r.ok, () => false);

test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] }, permissions: ["microphone"] });

test("record a voice question, it reaches the SAAO with its audio", async ({ context, page }) => {
  test.skip(!(await up()), "no backend");
  await context.addInitScript(() => localStorage.setItem("lang", "en"));
  await page.goto("/");
  await page.getByRole("link", { name: /Ask by voice/ }).click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Stop/ }).click();
  await expect(page.getByText("Your voice note is saved")).toBeVisible();
  await page.getByRole("button", { name: "Save and send" }).click();
  await page.waitForURL(/\/cases\//);
  await expect(page.getByText("Your voice question").first()).toBeVisible();
  const id = await page.evaluate(
    () =>
      new Promise<string>((res) => {
        const r = indexedDB.open("dhansathi");
        r.onsuccess = () => {
          const q = r.result.transaction("cases").objectStore("cases").getAll();
          q.onsuccess = () => res(q.result.find((c: { kind: string }) => c.kind === "note").id);
        };
      }),
  );
  await expect
    .poll(async () => (await fetch(`${API}/api/cases/${id}/voice`, { headers: { "X-SAAO-Token": "qa-local-code" } })).status, { timeout: 30_000 })
    .toBe(200);
  const list = await (await fetch(`${API}/api/cases?limit=200`, { headers: { "X-SAAO-Token": "qa-local-code" } })).json();
  expect(list.find((c: { case_id: string }) => c.case_id === id)).toMatchObject({ kind: "note", card: "NOTE" });
});
