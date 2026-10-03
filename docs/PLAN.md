# Plan: Bangladesh rice "leaf + context → rules → fixed card" app (Omar + Zoha)

> Approved build plan. TODO.md tracks progress; this file explains the structure.

## Context
Locked scope (CLAUDE.md): Challenge 04 Agriculture, Bangladesh, rice, offline, Bangla voice, cheapest Android in Chrome, no LLM on the phone.
Zoha's point: a leaf photo alone is not enough, and farmers have years of observational knowledge. The app must collect **rich context** (variety, sowing/transplant date, age, season, region, recent rain/flood, where on the plant, field pattern) and **cross-check** the photo against agronomic knowledge, then return a **fixed card**, never generated text. Before building we need a deep, cited **rice leaf-health knowledge base** that both the rules and the cards come from.
Existing assets: `docs/advisor-rules.md` (flood rules, JSON at l.159–251, tests T01–T18 l.259–276), `docs/action-cards.md` (C1–C8, A1–A7, audio manifest l.206–247), `docs/architecture.md`, `contract/api.md` (PROPOSED), starter app (`frontend/src/app/page.tsx` placeholder, `src/lib/api.ts` fetch helpers; FastAPI `backend/app/main.py` + SQLModel `db.py`/`models.py`, `tests/test_smoke.py`, `make smoke`).

## Ownership
- **Zoha:** all of `frontend/` (PWA, screens, rule engine in TS, audio, context forms), Bangla translation and recording, pitch and video.
- **Omar:** dataset preparation, model training, compression and export (`ml/`), `backend/` (context pack, sync, cases), numbers in `docs/results.md`.
- **Claude (on request):** knowledge-base research, rule-table extension, script skeletons, TS rule engine plus tests, seeded data, PITCH/README drafts. Zoha reviews agronomy and Bangla; Omar reviews data and ML.

## Step 1 — Knowledge base (Claude researches, Zoha reviews; ~1.5 h, runs in parallel with downloads and the phone test)
Write `docs/knowledge/rice-leaf-health.md`, cited (BRRI Rice Knowledge Bank, IRRI fact sheets, DAE). For each of the 6 classes plus key look-alikes (N/K/Zn deficiency, BLS, BPH hopperburn, stem borer, cold/salt injury), give:
- the cause (fungus / bacterium / virus + vector / nutrient / weather);
- symptoms on the leaf (shape, colour, position on the leaf, which leaves first);
- **favouring conditions**: season, growth stage, weather (humidity, night temperature, rain, flood/storm), N fertiliser, soil, variety susceptibility;
- field pattern (patches vs uniform) and how fast it spreads;
- confusers, plus the one question that separates them;
- safe action (feeds the cards) and what must go to the SAAO.

Output also a machine-readable `knowledge.json`: `class → {favours: [...conditions], unlikely_if: [...], confusers: [...], ask: [...]}`. This is the source for the cross-check rules.

## Step 2 — Context the app collects (all taps or pickers, Bangla audio prompts, every field skippable with "don't know")
| Group | Fields |
|---|---|
| Where | district/upazila (picker → region type and nearest flood station from static table) |
| Crop | season (auto from date, editable), variety (picker: BRRI dhan list plus "local/unknown"; flags Sub1/salt/drought tolerant), sowing or transplant date (→ crop age → growth stage, editable) |
| Weather (last 7 days) | rain: none/some/heavy · field flooded? days, full/partial · unusually cold nights? · storm/strong wind? (pre-filled from the context pack if fresh, farmer can override) |
| Inputs | urea applied recently: none/normal/a lot |
| Symptom | where: leaf tip/edge, leaf middle, sheath near water, panicle/neck, base of plant · pattern: one hill / patches / whole field · new or old leaves first · insects seen (hoppers at base, whiteflies) |
| Photo | one close leaf; optional second photo of sheath/base/field (stored, not classified) |

## Step 3 — Decision engine (deterministic, in the browser, `frontend/src/lib/engine/`)
1. **Classifier** → probabilities over the classes plus NOT_SURE (threshold from Omar).
2. **Context cross-check** using `knowledge.json`: each class gets support/conflict flags (e.g. BLB + recent flood/storm + high N = consistent; tungro + no leafhoppers + uniform yellowing over the whole field = conflict → N-deficiency question). Rules only re-rank among the model's top-2 or move to NOT_SURE. **They never invent a class the model gave low probability, and no numeric blending is shown as certainty.**
3. **Symptom-location guard:** sheath/panicle/base/whole-field answers → the "leaf photo can't show this" card plus the SAAO card (no classification shown as an answer).
4. **Flood/drought path:** existing `advisor-rules.md` JSON (season, stage, days, variety, date, region) → A1–A7.
5. **Output:** one card id plus slot values plus "why" list (inputs used, rule ids, sources, data dates). Cards come only from `action-cards.md`; new cards are added there first.

Tests: T01–T18 from advisor-rules, plus ≥15 new cross-check cases in `docs/knowledge/test-cases.md`.

## Step 4 — Frontend structure (Zoha)
Read `frontend/AGENTS.md` and the Next 16 docs first. Keep `src/lib/api.ts` as the only backend caller (extend it with `getContext`, `syncCases`, `listCases` per the agreed contract).
```
src/app/
  layout.tsx            Bangla font, manifest link, SW registration
  page.tsx              home: Check a leaf | After flood/drought | My saved cases | offline ✓ badge
  check/page.tsx        wizard: photo → where/crop → weather → symptom → result
  flood/page.tsx        advisor taps → result
  result/[id]/page.tsx  card + audio + "why" + Share with SAAO (consent)
  cases/page.tsx        local queue and status
  saao/page.tsx         dashboard (synced cases), SMS preview (labelled simulated)
src/lib/
  api.ts                (existing, extended)
  engine/{rules.ts, crosscheck.ts, cards.ts, types.ts, engine.test.ts}
  model/{classify.ts}   onnxruntime-web WASM, preprocessing 224px, warm-up
  store/{db.ts}         IndexedDB: profile (upazila, variety, dates), cases queue, context pack
  audio/{play.ts}       clip manifest, unlock on first tap
public/
  model/rice.onnx, ort/*.wasm (self-hosted), audio/*.opus, data/{rules.json, cards.json, knowledge.json, upazilas.json, varieties.json}
  manifest.webmanifest, sw.js (precache everything, storage.persist())
```
UI rules: Bangla first, big tap targets, icons plus audio for each question, "don't know" on every field, profile remembered (upazila, variety, dates entered once per season), simulated-date banner in demo mode.

## Step 5 — Omar's ML and backend
- `ml/prepare.py` (labels → common classes, crop YOLO boxes ≤2 h, resize 256 px, pHash dedup, manifest), `ml/train.py` (frozen baseline → fine-tune MobileNetV3-Small), `ml/eval.py` (leave-one-dataset-out macro-F1, temperature scaling on a held-out set, threshold, risk-coverage, 30 non-rice photos), `ml/export.py` (ONNX ≤5 MB, parity check). Licences in `docs/data.md`, numbers in `docs/results.md`.
- Hand-off contract to Zoha: `rice.onnx` plus `labels.json` (class order) plus `preprocess.json` (size, mean/std) plus `threshold.json` (T, min_prob, min_margin). A dummy model with the same files ships first.
- Backend: `GET /api/context`, `POST /api/sync`, `GET /api/cases` per `contract/api.md`; seeded `backend/mocks/context_sirajganj.json` (`seeded: true`); new SQLModel `Case` table; tests in `tests/test_smoke.py` style.

## Timeline (Vienna)
| Time | Zoha | Omar | Claude |
|---|---|---|---|
| now–23:30 | phone test (camera, SW, ORT WASM dummy) → GO/NO-GO | downloads, `prepare.py` | knowledge base plus `knowledge.json` |
| 23:30–01:30 | wizard screens plus IndexedDB profile, rule engine plus T01–T18 | baseline model → first `rice.onnx` | cross-check rules plus tests, upazila/variety tables |
| 01:30–03:30 | integrate model, cards, audio, share/queue/sync, dashboard | fine-tune, calibrate, export; backend endpoints | seeded context, PITCH/README drafts |
| 03:30–05:00 | Bangla recording, offline drills | `results.md` numbers | video script |
| 05:00–07:00 | `make smoke`, `make tag`, airplane-mode rehearsal ×3 | same | `/demo-check` |
| 07:00 freeze → 13:00 video → 15:00 submit | | | |

## Verification
- `make smoke` green (backend pytest, e2e, `tsc`, `next build`), plus engine unit tests (T01–T18 plus cross-check cases).
- On the real cheap Android in airplane mode after a force-stop: install check shows offline ✓; photo → result in ≤1.5 s; non-rice photo → NOT_SURE; flood wizard with simulated date returns the expected codes; case queued, then synced when Wi-Fi is on, then visible on `/saao`.
- `docs/results.md` has LODO macro-F1, risk-coverage, size, latency; README has the data/licence table and "does not cover".
