# Model integration + E2E report (branch omar/model-e2e)

Date: 2026-10-04. Machine: Apple M4 Mac, desktop Chromium (Playwright 1.63) against the production static export (`npm run build && npx serve out`). **Not tested on a real phone**: all timings below are desktop numbers, a Tk 6,000 Android will be several times slower.

## 1. Audit of model loading and inference (mismatches)
Checked against: input `input` [1,3,224,224] NCHW, output `logits` [1,7], labels order, resize 256 + centre-crop 224, ImageNet mean/std, temperature 0.85, min_prob 0.80, min_margin 0.0, not_rice => C8, engine may only keep / swap / NOT SURE.

| # | Finding | Status |
|---|---|---|
| 1 | Input/output names, shape, NCHW, mean/std, size, temperature, labels order, threshold values: all read from `preprocess.json` / `labels.json` / `threshold.json`, correct. | OK |
| 2 | **Preprocessing geometry**: `toTensor` cropped a fractional source rect (e.g. offset 58.5 px) and let the canvas interpolate it. torchvision uses whole-pixel resize sizes and a half-even-rounded crop offset. On the 50-image parity set this gave **46/50 (92%)** top-1 agreement with Python, below the 95% bar. | **Fixed** (`classify.ts`, now 50/50) |
| 3 | **not_rice handling**: `CLASS_CARD` has no `not_rice`; a confident `not_rice` top-1 became `decision:"keep", cls:"not_rice"` (card fell back to C8 only by default), and a context-supported swap to top-2 (a disease) was possible. | **Fixed** (`crosscheck.ts`: `top1 === "not_rice"` always returns NOT SURE / C8; new unit test) |
| 4 | **Context can override the threshold**: `crossCheck` may keep top-1 below `min_prob` when 3+ farmer answers support it, or swap to top-2 with p1 < 0.8 (tests X02, X03, X17 depend on this). The brief says "NOT SURE if top prob < min_prob". | **Not changed, needs a decision.** A hard gate fails those 3 engine tests; it is a design choice by Zoha (context can rescue/swap, never invent a class). Note the 95%-when-answering figure in `docs/results.md` is for the model alone, not model + context rescue. |
| 5 | `min_margin` (0.0) and `min_prob` taken from `threshold.json` via `DEFAULT_THRESHOLDS` override: correct. `swap_min_p` 0.25 and `min_top2_mass` 0.6 are still placeholders (comment in code). | Info |
| 6 | App feeds the model a 640 px JPEG re-encode (q0.85, `shrinkPhoto`) rather than the original. Not a mismatch with the camera path, but the parity test feeds originals (small files), so that extra re-encode is covered only by the E2E (predictions matched expectations there). | Info |

## 2. Parity (app preprocessing + onnxruntime-web in Chromium vs Python onnxruntime + `transforms_for(False)`)
`frontend/e2e/parity.spec.ts`, fixtures in `frontend/e2e/fixtures/parity/` (50 images: 10 each AgML_BD healthy/blast/brown_spot/blb + 10 iBean beans; expected values from `e2e/make-parity.py`).
- Before fix: top-1 46/50 (92%).
- **After fix: 50/50 (100%) top-1 match. Max abs probability difference 0.068 (after temperature), mean of per-image max 0.0044.** The 0.068 is resampling difference (browser vs PIL) on the 500x500 bean images that are downscaled; the 256x341 rice images are pixel-exact.
- Caveat: 50 images, mostly small AgML_BD files that need no downscaling. Large phone photos (resampling differences larger) are not covered here.

## 3. Samples
`frontend/public/samples/` 11 files, 476 KB, 512 px JPEG q85 + `manifest.json` + `ATTRIBUTION.md` (AgML_BD CC BY 4.0, iBean MIT). 2 healthy and 2 blast (confident, correct), brown_spot-1 (confident correct), brown_spot-2 (confidently WRONG: model says sheath_blight 0.96), blb-1 (unsure, healthy 0.29), blb-2 (confidently WRONG: tungro 0.997), not_rice 1 and 2 (confident not_rice) and 3 (not_rice 0.50, unsure). Only classes available with attribution requested (AgML_BD) are included: no sheath_blight/tungro samples (those come from other datasets whose licence text was not requested).

## 4. E2E (Playwright Chromium, production build), `frontend/e2e/golden.spec.ts`
Language forced to English for selectors; simulated date set via `localStorage.demo_date` (labelled "simulated" on screen, asserted). Run twice: online, then `context.setOffline(true)` after the service worker had precached the full build (home screen showed "Every file is on the phone"), reloaded and repeated. Both PASS. No backend was running, so "sync" is not tested.

| Step | Online | Offline |
|---|---|---|
| Leaf wizard with blast-1: C2, not dummy, top-1 blast, Listen requests `C2-*.mp3` (200, audio/mpeg) | PASS 1.48 s (whole wizard) | PASS 1.36 s |
| healthy-1 -> C1 | PASS | PASS |
| Non-rice beans (confident and unsure) -> NOT SURE card C8, cls null, C8-NOTSURE audio | PASS | PASS |
| blb-1 (unsure) -> C8 | PASS | PASS |
| After-flood advisor (advisor-rules.md): T01 (2 d, 2026-08-20) -> SURVIVES_CHECK/A1; T04 (9 d) -> REPLANT_SHORT_DURATION/A3 (+ audio); T07 (10 d, 2026-10-03) -> TOO_LATE_AMAN/A5 | PASS 6.1 s | PASS 5.7 s |
| Share with SAAO: consent dialog -> consent=true, queued -> /cases shows "Waiting to send" | PASS | PASS |

Timings (desktop M4, ms): inference (preprocess + ONNX + softmax) 11-14 ms per photo online and offline. Model load: 392-445 ms cold online (fetch + session + warm-up, parity test); 77 ms offline, but that run reuses the already warmed ORT module and HTTP/SW cache from the page, so treat it as a best case. Raw numbers: `frontend/e2e/e2e-timings.json`, `parity-result.json`.

What the E2E does **not** verify: audio actually audible (only that the mp3 request succeeds with an audio content type), real camera capture, a real phone/airplane mode, backend sync after reconnect, the SAAO dashboard, the Bangla UI text (run in English), STT, iOS.

## 5. Checks
`npm test` 66/66 pass (65 + new not_rice test; script now `vitest run src` so it does not pick up Playwright specs). `npx tsc --noEmit` clean. `npm run build` OK (precache 185 urls, 27.4 MB). `npm run e2e` 2/2 pass.

## Blocked / needs action
- **`frontend/public/data/cards.json` and `places.json` are still missing from main** (commit 0c46a08 did not add them; only knowledge.json and rules.json are tracked). The app does not build without them. I copied both from the original folder (`/Users/omar/BengaliPharaohs/frontend/public/data/`) into the worktree for testing and did **not** commit them. They need to be committed to main by their owner, otherwise a fresh clone of this branch will not build.
- `frontend/public/ort/` is generated by `npm run build` (copy-ort.mjs) and git-ignored: no action.
- Decision needed on finding #4 (context rescue below min_prob).
