# Hand-off for Zoha's Claude Code session

Paste this file (or point Claude at it) as the first prompt. Repo: `omarjku/BengaliPharaohs`, branch `claude/inspiring-heisenberg-uz98ly` (currently the default branch). Always `git pull --rebase` first.

## 1. Where we are (decisions already made — do not reopen)
- **Event:** Hack-Nation 7, Vienna hub. Feature freeze **Sun 07:00**, video uploaded **13:00**, submission **Sun 15:00** (confirm portal + deadline).
- **Challenge:** 04 "Small AI for Development" (World Bank), **Agriculture**. Full brief: `docs/challenges/04-small-ai-for-development-worldbank.md`. Hard rules: runs on a device the user already has · **core feature offline** · model small enough to side-load · ≥1 interaction in a **named local language** · **pass/fail: "not sure — ask a person"**, human decides · cite every dataset and say what it does **not** cover · label synthetic data · 2–5 min video in the brief's structure.
- 🔒 **Locked product:** Bangladesh · **Bangla** voice (Zoha is the native speaker) · **rice** · offline **after-flood/drought advisor** (BRRI rules) + **on-device leaf classifier** + **hand-off to the SAAO** (village agriculture officer) · target device = **cheapest Android in Chrome** (Tk ~5,000–6,000, often 1–2 GB RAM) · SMS copy for keypad phones (simulated in demo). Only reopen if the real-phone test fails → then a native Android app, not a different idea.
- **Team:** Omar (model + backend) and Zoha (frontend, Bangla, pitch). Claude drafts research/scripts on request.
- **Persona:** Rahim, 42, Aman rice farmer, ~1 ha, Sirajganj (Jamuna floodplain), cheap Android, family also uses keypad phones, patchy internet. Men do most rice field work (women ~10–18% of rice/wheat labour).
- **No LLM on the phone.** Every answer is a **fixed card** from `docs/action-cards.md`; only slots (dates, variety names) are filled. No pesticide brand names or doses, ever.
- **Design principle (Zoha's):** the photo alone is not enough. The farmer also gives context (variety, dates, season, area, rain/flood, where the symptom is, field pattern, insects), and the app **cross-checks** the photo against agronomic knowledge before picking a card.
- **Cut:** offline speech recognition, in-browser TTS (audio is pre-recorded by Zoha), iOS, hispa class, whole-plant/field photo models, any mention of India/dams or climate attribution on stage, yield-gain claims.

## 2. What already exists in the repo (read these)
| File | What it is |
|---|---|
| `docs/PLAN.md` | **Approved build plan**: context fields, decision engine, frontend folder structure, timeline. |
| `TODO.md` | Task list per person + checkpoints. |
| `DEMO.md` | Golden path the judges see (airplane mode, photo → card, "not sure", flood advisor with simulated date, share with SAAO → sync → dashboard). |
| `docs/advisor-rules.md` | Flood/drought decision table. Inputs §1, output codes §2 (SURVIVES_CHECK, GAP_FILL, REPLANT_SHORT_DURATION, DIRECT_SEED, TOO_LATE_AMAN, NOT_SURE_ASK_SAAO), **JSON rules §7 (lines ~159–251) = source of truth for code**, tests T01–T18 §8. Today's date returns TOO_LATE_AMAN → demo uses a **simulated date, labelled**. |
| `docs/action-cards.md` | 8 classifier cards (C1–C8) + 7 advisor cards (A1–A7), 7-part safe template, **audio clip manifest §4** (~31–33 clips; count needs checking). Each card has "BN: (Zoha to translate)". |
| `docs/knowledge/rice-leaf-health.md` | Fact-checked disease/look-alike knowledge (causes, symptoms, favouring conditions, confusers, safe actions). |
| `frontend/public/data/knowledge.json` | Machine-readable version for the cross-check engine (29 conditions, 15 questions with "(Zoha)" Bangla placeholders, sources). |
| `docs/knowledge/test-cases.md` | 19 cross-check cases X01–X19 (keep top-1 / swap to top-2 / NOT_SURE / location guard). |
| `docs/architecture.md` | Offline design: what's installed once, what the short-internet "context pack" downloads (<5 KB), what syncs up. |
| `contract/api.md` | **PROPOSED** endpoints `GET /api/context`, `POST /api/sync`, `GET /api/cases` — agree with Omar before building. |
| `docs/redteam/README.md` | All the ways judges could attack us + fixes + video outline (§6). |
| `docs/prior-art.md` | Competitors (BAMIS app = closest; BRRI Rice Solution; Plantix/Cropwise needs internet; Krishoker Janala no AI; Dr.Chashi gives doses) and phone/internet stats. 16123 helpline: official page says 08:00–20:00, closed Fri/Sat/holidays (one older article disagrees — verify by calling). |
| `docs/research-*.md` | Dataset and Bangladesh research. |
| `frontend/` | Starter: Next.js 16.3.8, React 19, Tailwind v4, Motion. `src/app/page.tsx` is a placeholder; `src/lib/api.ts` is the only backend caller. **Read `frontend/AGENTS.md`: Next 16 has breaking changes — read `node_modules/next/dist/docs/` before writing code.** No PWA/onnx libs installed yet. |

## 3. Key facts for the pitch (cited in the docs)
- Aug 2024 floods damaged ~200,000 ha of Aman (USDA GAIN); ~339k ha crops (UN SitRep); ~$478M farm-sector damage (FAO).
- 69% of rural households own a smartphone, but ~26% of rural people use one (shared phones). Cheapest Androids Tk 4,990–5,990.
- One SAAO serves ~900–2,000 families (year to verify). 16123 closed Fri/Sat (verify).
- Published BD rice classifiers drop from 0.72 to 0.44 macro-F1 on a different dataset → we report a **held-out-dataset** score, never "95% accuracy".
- Our honest delta: not the first rice-photo AI in Bangla; we add **after-flood decisions + photo check with no connection that says "not sure" + SAAO hand-off + context cross-check**, no doses, no sales.

## 4. Zoha's tasks (in order)

### Z1. Phone go/no-go — FIRST (target done by ~23:30)
**What:** a throwaway test page on the cheapest Android you can borrow: camera input, works in airplane mode, runs an ONNX model with onnxruntime-web (WASM backend).
**How:** `npm install onnxruntime-web`; copy its `.wasm` files into `public/ort/` (never load from a CDN — breaks offline); `<input type="file" accept="image/*" capture="environment">` + a gallery button; service worker that precaches page + model + wasm; call `navigator.storage.persist()`; ask Claude for a dummy `rice.onnx` + `labels.json` + `preprocess.json` + `threshold.json`.
**Pass if:** photo → result in ≤ 1.5 s, no crash, still works after force-stop + airplane mode.
**Can go wrong:** WebGL backend (deprecated — use WASM); multithreaded WASM needs special headers (use single-thread + SIMD); the camera app kills the page on 1 GB phones (save the photo to IndexedDB *before* running the model; offer gallery + bundled sample photos); huge 12 MP photos crash memory (downscale with `createImageBitmap` to ~256 px first); HTTPS is required for service worker/camera (localhost OK for dev; for the phone use the deployed HTTPS URL or a tunnel). **If it fails → tell Omar + Claude; the fallback is a native Android app, decided once.**

### Z2. App skeleton + offline shell
Structure from `docs/PLAN.md` Step 4: routes `/` (home: Check a leaf · After flood/drought · My cases · offline ✓ badge), `/check`, `/flood`, `/result/[id]`, `/cases`, `/saao`; `src/lib/{api.ts, engine/, model/classify.ts, store/db.ts, audio/play.ts}`; `public/{model, ort, audio, data}`, `manifest.webmanifest`, `sw.js`.
**Can go wrong:** Next 16 conventions differ (read the docs folder); server components can't use camera/IndexedDB → mark those pages client components; the service worker must list every file (generate the precache list from the audio manifest + data files); an "offline ✓" self-check should fetch every precached URL and show green only if all succeed.

### Z3. Farmer profile + context wizard (`/check`)
Fields (PLAN Step 2): upazila (picker → region type), season (auto from date, editable), variety (BRRI list + "local/unknown"; flags Sub1/salt/drought), sowing/transplant date (→ crop age → stage), rain last 7 days, flooded? days, full/partial, cold nights, storm, urea none/normal/a lot, **symptom location** (leaf tip/edge, middle, sheath near water, panicle/neck, plant base), pattern (one hill/patches/whole field), new vs old leaves, insects (hoppers at base, green leafhoppers on leaves), **salty/tidal water** (two fields the knowledge base needs — add them), photo.
Rules: Bangla first, big buttons + icons, audio prompt per question, **"don't know" on every field**, profile remembered in IndexedDB (entered once per season), simulated-date banner in demo mode.
**Can go wrong:** too many questions → farmers quit. Ask only what the engine needs: profile once, then 4–5 quick taps per check; skip questions irrelevant to the model's top-2.

### Z4. Decision engine (`src/lib/engine/`) — ask Claude to write it with tests
- `classify.ts` output: `{top1, p1, top2, p2, notSure}` using `threshold.json` (temperature, min_prob, min_margin).
- `crosscheck.ts` with `knowledge.json`: may only **keep top-1, swap to top-2, or move to NOT_SURE**; never invent a class; location guard (sheath/panicle/base/whole field → "a leaf photo can't show this" + SAAO).
- `rules.ts` loads the JSON from `docs/advisor-rules.md` §7 (copy to `public/data/rules.json`).
- `cards.ts`: id → card text + audio clips + "why" (inputs used, rule ids, sources, data date).
- Tests: T01–T18 + X01–X19 must pass (`npm test`), and `make smoke` must stay green.
**Can go wrong:** placeholder thresholds (swap needs p2 ≥ 0.25 and ≥ 2 supporting conditions) — Omar replaces them with real values; never show a percentage as certainty ("looks like … (not certain)").

### Z5. Result card, audio, consent, queue, sync
`/result/[id]`: card (7-part safe template), confidence bar, "why" list, play Bangla audio (unlock audio on the first tap — Android blocks autoplay), **"Share with my SAAO?"** consent screen (Bangla + audio) → save to the IndexedDB queue → sync via `POST /api/sync` when online (agree the contract with Omar first) → status on `/cases`. Strip EXIF/GPS from any photo; no names; anonymous case ID.
**Can go wrong:** sharing without consent fails the pass/fail gate; a lost/shared phone exposes the queue — say this honestly.

### Z6. SAAO dashboard + SMS preview (`/saao`)
List of synced cases from `GET /api/cases` + a **simulated** SMS preview to a keypad phone (label it "simulated"). Seeded cases must be labelled "seeded".

### Z7. Bangla content (only Zoha can do this)
- Translate the 15 cards in `docs/action-cards.md` and the 15 questions in `knowledge.json`; keep sentences short, everyday village Bangla.
- **Record the clips** in the manifest (§4; check whether it's 31 or 33) as small files (opus/mp3, ~40 KB each), named `<clip_id>.opus` in `public/audio/`.
- Review the agronomy: is tungro mainly Aman? Keep leaf scald? Fill-gaps vs replant threshold? 15 vs 20 Sep cut-off outside the north? Partial-submergence rules.
- **One call to 16123** to confirm hours. **Message one farmer/SAAO/agronomist** for a short quote (with permission to use it).
- Install **BAMIS, BRRI Rice Solution, Dr.Chashi**; test each in airplane mode; screenshot for the comparison slide.

### Z8. Pitch + video (Zoha owns)
Video 2–5 min in the brief's structure (outline in `docs/redteam/README.md` §6): problem sentence → AI and why not SMS → demo in airplane mode → evidence (held-out score, "not sure" rate, does-not-cover list, licence table) → where it sits in Rahim's day + tech stack → **"what localizing AI means to us"** (personal, from Zoha). Say clearly what is real, seeded or simulated. Never mention India/dams; no yield claims. Rehearse 3×; backup screen recording by Sun 08:00.

## 5. What Omar delivers to Zoha
- **First (fast):** dummy model files. **Later:** real ones, same names, no code change:
  `public/model/rice.onnx` (the model) · `labels.json` (class order, e.g. `["healthy","blast","brown_spot","sheath_blight","tungro","blb"]`) · `preprocess.json` (`size` 224, `mean`, `std`, layout NCHW) · `threshold.json` (`temperature`, `min_prob`, `min_margin`).
- Backend: `/api/context` (seeded Sirajganj flood/rain JSON, `seeded: true`), `/api/sync`, `/api/cases`.
- Numbers in `docs/results.md` (held-out macro-F1, "not sure" rate and accuracy when answering, size, latency).

## 6. Checkpoints
23:30 phone GO/NO-GO · 01:00 real model in the app · 03:00 golden path end to end + `make smoke` + `make tag` · 05:00 numbers final · **07:00 freeze** → record demo in airplane mode, rehearse ×3 · 13:00 video uploaded · 15:00 submit.

## 7. Rules for Zoha's Claude
Work only in `frontend/` (and `PITCH.md`); never edit `backend/` or `ml/` — ask Omar via the contract. `git pull --rebase` before starting; `make smoke` before every push; commit small; update `TODO.md` checkboxes. Ask before changing anything in the 🔒 locked decision.
