# Zoha's roadmap: app → Bangla → pitch (deadline 09:00 Sun)

Source of truth for the tasks: `docs/HANDOFF-ZOHA.md` (Z1–Z8). This file orders them against the clock.
Start: Sat 23:00. **Your own finish line: 09:00 Sun.** Team freeze is 07:00, so the build must be frozen by 07:00 and 07:00–09:00 is only recording and rehearsal.

## ✅ Checklist (status Sun 4 Oct, ~01:00)

### Tonight — the app (Claude + Zoha)
- [x] Frontend built: home, profile, leaf check (5 steps), flood/drought advisor, result card, my cases, SAAO dashboard + simulated SMS
- [x] Decision engine + 43 tests (advisor T01–T18, cross-check X01–X19, multi-select)
- [x] Offline: service worker, offline self-check, works in desktop browser offline
- [x] In-app camera + gallery + drag-and-drop; photo saved before the model runs; EXIF stripped
- [x] Consent → offline queue → sync (waits for Omar's backend)
- [x] Deployed for phone testing: https://dhansathi-black.vercel.app (auto-updates, version label on home)
- [x] Camera works on the phone
- [ ] **Z1 GO/NO-GO:** time photo → result on the cheap Android (⏱ under "Why this answer", target ≤ 1.5 s) + reopen in airplane mode after closing → tell Omar
- [ ] Agree `contract/api.md` with Omar (context / sync / cases) → backend on a public URL → test share → dashboard
- [ ] Swap in Omar's real model (4 files in `frontend/public/model/`) → rebuild → redeploy
- [ ] Commit + push (only when Zoha says so)

### 07:00 Sun — Bangla + pitch (Zoha, with Mom for Bangla) ⏰ reminder set
- [ ] Bangla review: `frontend/src/lib/strings.ts`, `frontend/public/data/cards.json` (16 cards), `bn` questions in `knowledge.json`, insect local names
- [ ] Record ~34 audio clips (`docs/action-cards.md` §4 + new `C9-LOCATION`) → `frontend/public/audio/<clip_id>.mp3`
- [ ] Agronomy questions (HANDOFF Z7): tungro mainly Aman? keep leaf scald? gap-fill vs replant? 15 vs 20 Sep? partial submergence?
- ~~Call 16123 / farmer quote~~ — not possible; on stage say "office hours, closed Fri/Sat" and "rules not yet reviewed by an agronomist"
- [ ] (Optional, cut first) Screenshots: BAMIS, BRRI Rice Solution, Dr.Chashi in airplane mode for the "what exists already" slide
- [ ] `PITCH.md` script → backup recording → final 2–5 min video → submit by 09:00

## The product in one breath
Rahim (Aman farmer, Sirajganj, cheap Android) opens a PWA that works in airplane mode. He either
**(a)** photographs a rice leaf, taps 4–5 quick context questions, and gets a fixed Bangla card ("looks like brown spot (not certain)…", or "not sure, ask your SAAO"), or
**(b)** answers the after-flood questions (variety, days under water, stage, date) and gets a BRRI-rule card (wait and check / gap fill / replant by date / too late for Aman / ask SAAO).
He can share the case with his SAAO (consent), it queues offline and syncs later, and the SAAO sees it on a dashboard. No LLM on the phone, no doses, ever.

## What is already done for you (by Claude, in `frontend/`)
- Mobile-first, responsive app shell: Bangla-first UI with an English toggle (judges), big tap targets, works from 320 px phones to laptop.
- Screens: home, profile, leaf check wizard, flood/drought advisor, result card, my cases, SAAO dashboard + simulated SMS.
- Decision engine in TypeScript with tests: advisor rules T01–T18 and cross-check X01–X19 (`npm test`).
- On-device model loader (onnxruntime-web WASM, self-hosted, single thread) using Omar's 4 hand-off files.
- IndexedDB store (profile, cases, photos), store-and-forward queue + sync, service worker + offline self-check.
- Bangla text is a **Claude draft**: every string marked for your review in `src/lib/strings.ts` and `public/data/cards.json`.

## Hour-by-hour

| Time | Task | Done when |
|---|---|---|
| 23:00–00:00 | **Z2 shell + Z1 phone test.** Run the app locally (`npm run dev`), click through every screen on your phone-sized browser. Deploy (Vercel/Netlify, HTTPS) and open on the cheapest Android. Install to home screen, airplane mode, force-stop, reopen. | Photo → result ≤ 1.5 s, works after force-stop offline. **Tell Omar GO / NO-GO.** |
| 00:00–01:00 | **Z7a Bangla review (screens).** Go through `src/lib/strings.ts`: fix every Bangla line to everyday village Bangla. | No line you would be embarrassed to read aloud. |
| 01:00–02:00 | **Z7b Bangla review (cards + questions).** `public/data/cards.json` (15 cards + shared lines) and the `bn` fields in `public/data/knowledge.json`. Agronomy questions in HANDOFF Z7 → note answers in `docs/action-cards.md`. | All `bn_review: true` flags cleared. |
| 01:00 | **Checkpoint:** Omar's first real `rice.onnx` dropped into `public/model/` → rebuild, test one photo. | Real model runs in the browser. |
| 02:00–03:00 | **Agree the API with Omar** (`contract/api.md` → AGREED): `/api/context`, `/api/sync`, `/api/cases`. Test sync from phone → laptop → `/saao`. | A case shared on the phone appears on the dashboard. |
| 03:00 | **Checkpoint:** golden path end to end (DEMO.md), `make smoke`, `make tag`. | Tag `demo-ok` exists. |
| 03:00–04:30 | **Z7c Record audio.** 33 clips from `docs/action-cards.md` §4, mono mp3, name `<clip_id>.mp3`, put in `public/audio/`. Phone voice memo is fine; quiet room; 1 s silence each end. | Play button on each card speaks. |
| 04:30–05:00 | **Z7d Evidence for the pitch.** Install BAMIS / BRRI Rice Solution / Dr.Chashi, airplane mode, screenshot. (16123 call only possible in office hours: skip, say "office hours, closed Fri/Sat".) | 3 screenshots in `demo/`. |
| 05:00–06:00 | **Z8 Pitch script** in `PITCH.md` using the brief's structure (below). Get Omar's numbers from `docs/results.md`. | Script ≤ 4 min read aloud. |
| 06:00–07:00 | Bug fixes only. Airplane-mode rehearsal ×3 on the real phone. | **07:00 FREEZE.** |
| 07:00–08:30 | **Record the video** (screen recording of the phone + voice). Backup recording first, then the good take. | `demo/backup.mp4` + final video. |
| 08:30–09:00 | Upload, submit, check the link works in a private window. | Submitted. |

**Cut order if behind:** audio clips (keep only the 8 classifier bodies + SH-ASK) → SMS preview → SAAO dashboard polish → English toggle polish. **Never cut:** airplane-mode test, "not sure" screen, consent before sharing, the "what this does not cover" line.

## Video structure (required by the brief, 2–5 min)
1. **Problem sentence (15 s):** "Because of this tool, Rahim will decide what to do with his flooded or sick rice within minutes, offline, that he would otherwise wait days for an overstretched SAAO to answer; we know because one SAAO serves ~900–2,000 families and 16123 is closed Fri/Sat."
2. **Why AI, why not SMS (30 s):** the photo check needs a vision model; SMS can't see a leaf. The flood advisor is deliberately *not* AI (BRRI rules) — say so.
3. **Demo in airplane mode (90 s):** leaf → card · non-rice leaf → "not sure" · flood advisor with simulated date (labelled) · share with SAAO → Wi-Fi on → dashboard.
4. **Evidence (30 s):** held-out-dataset macro-F1 (never "95%"), "not sure" rate, model size, latency, licence table, what it does NOT cover.
5. **Where it sits in Rahim's day + stack (20 s):** Next.js PWA, onnxruntime-web WASM, IndexedDB, FastAPI sync.
6. **"What localizing AI means to us" (20 s):** personal, from you.

Say clearly on screen what is **real / seeded / simulated**. Never mention India/dams. No yield claims.

## Rules for your Claude session
Work only in `frontend/`, `PITCH.md`, `docs/ROADMAP-ZOHA.md`. Never edit `backend/` or `ml/`. `git pull --rebase` first, `make smoke` (or `npx tsc --noEmit && npm test && npm run build` in `frontend/`) before every push.
