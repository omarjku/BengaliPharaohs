# DhanSathi: an offline rice-leaf and after-flood advisor for Bangladesh

**A smallholder rice farmer checks a leaf photo and gets a fixed, Bangla, "do now / do not / ask your SAAO" card with no internet, and when the AI is not sure it says so and hands the case to a human.**
Hack-Nation 7 x World Bank "Small AI for Development", Challenge 04, Agriculture. Team: Omar (backend, model, deploy) and Zoha (frontend, Bangla voice, pitch).

- **Live app:** https://dhansathi-gilt.vercel.app (installable PWA; open once online, then it works in airplane mode)
- **Backend (cases + SAAO dashboard):** https://bengalipharaohs-production.up.railway.app (`/api/health`). Dashboard at `/saao` needs the SAAO code (Railway variable `SAAO_TOKEN`).
- **Video:** [add link before 13:00 Sun]
- **Try it:** sample leaf photos are in `frontend/public/samples/` (`blast-1.jpg` confident, `not_rice-1.jpg` and `blb-1.jpg` give NOT SURE). Golden path: `DEMO.md`.

## How it works
```
Photo --> [on the phone: MobileNetV3-Small, ONNX, WASM, 6.1 MB] --> class + confidence
          farmer taps (variety, stage, days under water, ...)
                           |
        [fixed rules + 16 fixed cards, BRRI/DAE sources, EN + Bangla + audio]
                           |
         keep / swap between top two / NOT SURE -> "ask your SAAO"
                           |
 "Share with my SAAO?" (consent) -> queued on phone -> FastAPI + SQLite -> SAAO dashboard
```
- **AI where a lookup cannot go:** the leaf photo. The flood advisor is deliberately a rule table, not AI.
- **No LLM in the farmer's path.** Every answer is from a fixed list that can be checked.
- **Guardrails:** never shows certainty; NOT SURE below 80% confidence or for non-rice photos; no pesticide names or doses; photo stays on the phone unless shared with consent; the SAAO decides.

## Results (what we measured)
Model: MobileNetV3-Small, fp32 ONNX 6.1 MB (int8 rejected: it disagreed with fp32 on most photos). Inference 11-14 ms per photo on a laptop (Apple M4, Chromium), **not yet measured on a cheap Android**. Full tables: `docs/results.md`, `docs/e2e-report.md`.

| Test | Result |
|---|---|
| Validation (same sources, unseen leaf clusters): macro-F1 | 0.912 |
| Validation: answers / right when answering | 76.5% / 95.1% |
| **Held-out Bangladeshi dataset never seen in training (AgML-BD, 549 photos): answers / right when answering** | **63.4% / 74.4%** |
| Held-out overall top-1 | 57.2% (weakest: bacterial leaf blight 24/116; brown spot often called blast) |
| Never-seen bean leaves -> NOT SURE | 60/60 |
| Browser vs Python parity (50 photos) | 50/50 same top-1 |
| Leave-one-dataset-out (weaker quick models) | top-1 12-41% when a whole dataset is new; tungro 9/2,244 and BLB 118/1,093 when their one source is removed |
| App checks | 66 unit tests, 2 Playwright golden paths (online and offline) pass |

How to read it: the 95% is on data like the training data; the honest field number is 74% when it answers, which is why the app asks for context, never shows certainty, and routes to a person. Literature shows the same drop (0.72 to 0.44 macro-F1, arXiv 2609.31709). We claim time-to-advice and safe escalation, not yield.

## Data and licences (`docs/data.md`)
| Dataset | Licence | Used for |
|---|---|---|
| RiceLeafDiseaseBD (Mendeley) | CC BY 4.0 | train/val, 9,045 photos |
| BanglaRiceLeaf (Dataverse, BRRI Gazipur) | CC0 1.0 | train/val, 3,097 |
| SIP Sirajganj-Pabna (Mendeley) | CC BY 4.0 | train/val, 1,180 |
| Dhan-Shomadhan, field half (Mendeley) | CC BY 4.0 | train/val, 263 |
| Bangladeshi non-rice leaves (5 Mendeley sets) | CC BY 4.0 | "not rice" class, 747 |
| AgML rice_leaf_disease_classification_bd (HF) | CC BY 4.0 | held-out test only, 549 |
| iBean (Makerere, beans) | MIT | never-seen "not rice" test, 60 |
Near-duplicates grouped (11,832 unique of 14,134 rice photos) and split by group.

## What the data does NOT cover
Flood, submergence and drought-stress photos; brown planthopper hopperburn; stem borer; false smut and panicle/neck blast; seedlings; Boro season (photos mostly Jul-Dec); nutrient deficiencies; hispa and leaf scald; whole-plant or field photos; districts outside Gazipur, Sirajganj-Pabna and the other collection sites; low-end phone cameras. Known bias: tungro is 97% from one dataset, BLB 87% from one. Flood advice reflects BRRI's 2024 eastern-flood guidance and is not universal.

## Real vs seeded or simulated
| Real | Seeded / simulated |
|---|---|
| On-device classifier, NOT SURE rule, 16 cards, Bangla voice by Zoha | Demo date is simulated (the Aman window has passed) |
| Flood rules cited to BRRI/DAE | Other cases on the SAAO dashboard (tagged "seeded") |
| Store-and-forward to a live FastAPI backend, SAAO dashboard behind a code | SMS to a keypad phone: preview only, no gateway |
| 66 tests + offline Playwright run | Area update/forecast pack is seeded; real-phone and agronomist review not yet done |

## Run locally
```bash
make setup     # backend venv + frontend deps + .env files
make dev       # backend :8000 + frontend :3000
make smoke     # backend tests + live stream + frontend type-check and build
cd frontend && npm test && npm run build && npm start   # offline-capable build
```
Frontend details: `frontend/README.md`. API: `contract/api.md`. Model training and evaluation: `ml/`. Deploy: Vercel (`frontend/`) and Railway (`backend/`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; SQLite on a persistent volume at `/data`, survives redeploys).

## Other tools and where we differ
BAMIS app (DAE/RIMES) and BRRI Rice Solution also diagnose rice from photos. We add BRRI after-flood decision rules, a photo check that works with no connection and declines low-confidence answers, and a hand-off to the SAAO for when the helpline (08:00-20:00, closed Fri, Sat, holidays) is shut. Details: `docs/prior-art.md`.

## Files
`DEMO.md` golden path · `docs/video-script.md` · `docs/submission-checklist.md` · `docs/redteam/README.md` safety and scoring review · `docs/advisor-rules.md` · `docs/action-cards.md` · `PITCH.md` · `CLAUDE.md`.
