// Parity: the app's own src/lib/model/classify.ts (toTensor + onnxruntime-web WASM + softmax) in Chromium
// vs Python onnxruntime with ml/train.py transforms_for(False) (expected.json, made by make-parity.py).
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const dir = "e2e/fixtures/parity/";
const expected: Record<string, { top1: string; probs: number[] }> = JSON.parse(readFileSync(dir + "expected.json", "utf8"));

test("classify.ts matches Python onnxruntime on 50 images", async ({ page }) => {
  const src = readFileSync("src/lib/model/classify.ts", "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  await page.goto("/");
  await page.addScriptTag({ type: "module", content: js + "\nwindow.__c = { toTensor, softmax, loadModel };" });
  await page.waitForFunction(() => (window as any).__c);

  const t0 = Date.now();
  await page.evaluate(() => (window as any).__c.loadModel());
  const loadMs = Date.now() - t0;

  let match = 0, maxDiff = 0, sumDiff = 0, n = 0;
  const miss: string[] = [];
  const inferMs: number[] = [];
  for (const [name, e] of Object.entries(expected)) {
    const b64 = readFileSync(dir + name).toString("base64");
    const r = await page.evaluate(async (b64) => {
      const c = (window as any).__c;
      const m = await c.loadModel();
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const t = performance.now();
      const x = await c.toTensor(new Blob([bytes], { type: "image/jpeg" }), m.pre);
      const out = await m.session.run({ [m.pre.input_name]: new m.ort.Tensor("float32", x, [1, 3, 224, 224]) });
      const probs = c.softmax(out[m.pre.output_name].data, m.th.temperature);
      return { probs, ms: performance.now() - t, labels: m.labels as string[] };
    }, b64);
    inferMs.push(r.ms);
    const top = r.labels[r.probs.indexOf(Math.max(...r.probs))];
    if (top === e.top1) match++; else miss.push(`${name}: app=${top} py=${e.top1}`);
    const d = Math.max(...r.probs.map((p: number, i: number) => Math.abs(p - e.probs[i])));
    maxDiff = Math.max(maxDiff, d); sumDiff += d; n++;
  }
  inferMs.sort((a, b) => a - b);
  const res = { n, top1_match: match, top1_match_pct: +(100 * match / n).toFixed(1), max_prob_diff: +maxDiff.toFixed(4), mean_max_prob_diff: +(sumDiff / n).toFixed(4), miss, load_ms: loadMs, preprocess_plus_infer_ms_median: Math.round(inferMs[n >> 1]) };
  console.log(JSON.stringify(res));
  writeFileSync("e2e/parity-result.json", JSON.stringify(res, null, 1));
  expect(match / n).toBeGreaterThanOrEqual(0.95);
});
