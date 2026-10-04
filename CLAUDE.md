# Hack-Nation 7 (Vienna hub, 3–4 Oct 2026) — team repo (Omar + Zoha)

Start `claude` from the repo root so `.claude/` (agents, commands, permissions) loads.
Read this first in every session. Keep it under 200 lines and **keep "Current status" and "Decisions made" up to date** — this file is how the other person's Claude stays accurate.

Other files: `LESSONS.md` (what won Hack-Nation 6 for Omar's team, read once) · `PITCH.md` (pitch, video, sources) · `DEMO.md` (golden path) · `contract/api.md` (API contract) · `TODO.md`.

## The challenge
**Chosen: Challenge 04, Small AI for Development (World Bank), Agriculture sector.** Full brief: `docs/challenges/04-small-ai-for-development-worldbank.md` (read pages 1–12 + Annex B).
- **Problem:** Noor, smallholder coffee farmer (2 ha, co-op member, basic phone; daughter's smartphone at weekends; no Wi-Fi, 3G bundles), sees falling yields and has no independent price reference; extension officer visits ~2×/year.
- **Build:** a Small AI tool that helps her make, communicate or act on one better agricultural decision. Must run on a device she already has, core feature **offline**, model small enough to side-load, ≥1 interaction in a **named local language** (voice or text).
- **Judging:** working prototype within limits 25% · development relevance 20% · data grounding 15% · evidence it works 15% · clarity + "why AI, not SMS/spreadsheet/search" 15% · scalability 10% · **responsible AI pass/fail** ("not sure — ask a person", human decides).
- **Out of scope / penalised:** online-only core, unlabelled synthetic data, AI acting on the user's behalf, confident wrong answers, uncited data. Must state what the data does **not** cover (scored).
- **Submit by Sun 15:00:** prototype (code/link) + **2–5 min video** (problem sentence, AI + why not simpler, demo, where it sits in Noor's day + tech stack, "what localizing AI means to us"). Shortlist 5–6 Oct; winner per sector presents in Seoul 21 Oct. Entrants must be 18–35.

## Event facts
- 24 h build. Judges have backgrounds at OpenAI, Meta, Apple and AI startups. Top 3 per challenge give a 3-minute virtual pitch on 10 Oct; the top ~1% are invited to the Hack-Nation Venture Lab (selects for "working prototype, sharp thesis").
- Past partners: OpenAI, Databricks, Lovable, ElevenLabs. API credits are redeemed via the Hack-Nation Discord.

## Event clock (Vienna time)
- Sat 17:00 kickoff · **20:00 idea frozen** · ~20:30 contract + fixtures committed, both building in parallel
- Midnight: demo path works end to end, `make smoke` green, tag `demo-ok`
- Sat night: decide the visual design. Sunday is polish only, no redesign.
- **Sun 07:00 feature freeze** → record video footage, rehearse 3×
- Sun 10:00 local pitch · Sun 13:00 video uploaded · **Sun 15:00 submission deadline**

## Team and ownership
| Person | Owns | Strengths | New to |
|---|---|---|---|
| **Omar** | `backend/`, `contract/api.md` (proposes changes), deploy | Python, FastAPI, LLM APIs (Anthropic + OpenAI), voice, RAG, tool use/agents, MCP, Claude Code power user | Databases (used only via Claude) — keep it SQLite/SQLModel, explain DB code in comments |
| **Zoha** | `frontend/`, `PITCH.md`, demo video, the pitch | React/Next.js, edited video, pitching, workshops/MUN/debate — strong with audiences | Tailwind, Motion animations, wiring React to a live backend — explain these as you build them |

## Stack
- `backend/` FastAPI + SQLModel (SQLite file, no server) + SSE streaming.
- `frontend/` Next.js 16 (App Router) + Tailwind v4 + Motion (`motion/react`). Next 16 has breaking changes: read `frontend/AGENTS.md` before writing frontend code.
- `contract/api.md` is the only shared surface. Change it, `backend/app/main.py` and `frontend/src/lib/api.ts` in one commit, agreed by both.
- LLM: `backend/app/llm.py` picks Anthropic → OpenAI → mock. The mock keeps the demo and tests working offline.

## Commands
- `make setup` install everything · `make dev` run both · `make smoke` backend tests + live end-to-end stream + frontend type-check and build
- `make tag` tags the current commit `demo-ok` (only after `make smoke` is green)
- `make record` records the room in 30 min chunks → `notes/transcripts/*.md` (setup: `notes/README.md`)
- Recovery: `git switch -c recover demo-ok` when an iteration breaks the demo
- Sync: `git pull --rebase` before you start, `make smoke` then `git push` after every working change

## Rules (each one comes from a past hackathon)
1. **Demo path first.** Nothing gets built that is not on the path in `DEMO.md` until that path works.
2. **Never break a working integration.** `make smoke` before every push. Red → fix or revert, never stack changes on red.
3. **Do the task in front of you; never edit the other person's folder.** Need something from the other side? Code against the contract, mock it locally, and tell them.
4. **Contract and fake data first.** Fixtures for the challenge data and recorded API responses (`backend/mocks/`) in the first hour, so nobody waits on anybody.
5. **Deterministic core, LLM for language.** Compute facts in code; the LLM explains or orchestrates, with a timeout and a fallback. The demo must survive the LLM being down.
6. **Honesty wins with AI-lab judges.** Show uncertainty ("not sure" is a valid output), never show 100% confidence, separate evidence from guesses, say on stage what is mocked or seeded.
7. **Measure something.** At least one real number (accuracy, time saved, before/after) with how it was measured. It goes in the pitch and the README.
8. **No team tooling.** `TODO.md` and one chat thread.
9. **The pitch is half the score.** `PITCH.md` gets real time, not the last 30 minutes.

## Code standards
- Python: type hints, small functions, no global state outside `db.py`, validate input with SQLModel/Pydantic models, timeouts on every outbound call.
- Frontend: client components only where needed; all backend calls go through `src/lib/api.ts`.
- Secrets only in `.env` (gitignored). Never print keys.
- After a feature works: `/review` → `make smoke` → commit → push.

## Slash commands and agents
- `/idea-score` scores up to 3 ideas against the challenge (run at kickoff)
- `/research <topic>` web research via the `researcher` agent: prior art, sponsor docs, winner tactics
- `/review` refactor + efficiency review via the `reviewer` agent, then smoke test
- `/demo-check` runs the demo path and reports what would fail on stage
- `/cut-scope` lists what to drop to hit the next deadline

## Room transcripts
When told "new transcript": `git pull`, read the new files in `notes/transcripts/`, then update "Current status", "Decisions made" (with the reason) and `TODO.md`. Flag contradictions with earlier decisions instead of silently changing them. Speakers are unlabelled and Whisper mishears names and numbers: ask before acting on anything unclear.

## Current status
- Starter repo: placeholder streaming demo works end to end (mock LLM), `make smoke` green, tagged `demo-ok`.
- Briefs received (Sat 17:00): 5 challenges, full text in `docs/challenges/`: 01 AI Apprentice (ElevenLabs voice + screen), 02 Rental Housing Law Navigator (RealPage, auto-scored), 03 Agentic Scientific Discovery (Databricks Omnigent required), 04 Small AI for Development (World Bank, offline/local-language), 05 Rare Disease Atlas (OpenAI, knowledge graph). **Challenge chosen: 04 Agriculture** (see top). Country: **Bangladesh, Bangla voice** (Zoha native speaker). Crop: **rice**. Product: offline after-flood advisor (BRRI rules) + on-device leaf classifier + hand-off to SAAO. Spec: `DEMO.md`; red-team must-fixes: `docs/redteam/README.md`; tasks: `TODO.md`.

## Decisions made (don't silently reverse; add the reason)
- 🔒 **LOCKED Sat night: Challenge 04 · Agriculture · Bangladesh · rice · offline after-flood advisor + on-device leaf classifier + SAAO hand-off · target device = cheapest Android in Chrome (~Tk 6,000 class), SMS fallback for keypad phones.** Only reopen if the real-phone test fails, and then the fallback is a native Android app — not a different challenge, crop or country.
- Team is Omar + Zoha only (the two extra members left). Claude drafts research, rules, cards, evidence; Zoha reviews agronomy/Bangla, Omar reviews data.
- Persona is a male rice farmer — in Bangladesh rice field work is mostly men's (team knowledge + one study: women 11–18% of rice/wheat labour); smartphone gender gap kept as one honest sentence, not the headline.
- Bangladesh + Bangla + rice — Zoha is a native speaker; ~20k BD field rice photos; 2024 Aman flood losses.
- **No LLM in the farmer's path** (overrides rule 5's "LLM for language" for this challenge) — brief demands a fixed answer list and no hallucinations; advisor = deterministic BRRI rules.
- Train our own MobileNetV3-Small (no usable ready-made BD model); onnxruntime-web WASM in a PWA; native only if the real-phone test fails.
- **Reversed Sat night (Omar):** offline Bangla speech-to-text is back in — closed-vocabulary answers only, tap fallback; Vosk Bengali Zipformer int8 (~28 MB, Apache-2.0) via sherpa-onnx WASM; gate test CER 7.8% (`docs/stt-plan.md`). TTS = Zoha's pre-generated ElevenLabs clips (offline playback).
- Cut: in-browser TTS, iOS, hispa class, pesticide names/doses, any mention of India/dams on stage.
- Challenge 04 Agriculture over 04 Health and 05 Rare Disease — most demo-able offline story (photo → answer in airplane mode), measurable accuracy, lower medical-safety risk; Seoul prize.
- SQLite via SQLModel, no database server — simplest thing Omar can debug.
- SSE streaming for LLM output — the answer appearing live is part of the demo's feel.
- Feature freeze Sun 07:00 — last time the pitch and video got the final minutes.
