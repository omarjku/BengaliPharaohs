# Hack-Nation 2026 — team repo (Omar + Zoha)

Start `claude` from the repo root so `.claude/` (agents, commands, permissions) loads.

Read this first in every session. Keep it under 200 lines.

## Event clock (Vienna time)
- Sat 17:00 kickoff, challenges announced · **20:00 idea frozen**
- Midnight: demo path works end to end, `make smoke` green, tag `demo-ok`
- **Sun 07:00 feature freeze** → only polish, record video, rehearse 3×
- Sun 10:00 local pitch · Sun 13:00 video uploaded · **Sun 15:00 submission deadline**

## Stack
- `backend/` FastAPI + SQLModel (SQLite file, no server) + SSE streaming. Owner: Omar.
- `frontend/` Next.js 16 (App Router) + Tailwind v4 + Motion (`motion/react`). Owner: Zoha.
  Next 16 has breaking changes: read `frontend/AGENTS.md` before writing frontend code.
- `contract/api.md` is the only shared surface. Change it together, in one commit, with both sides.
- LLM: `backend/app/llm.py` picks Anthropic → OpenAI → mock. The mock keeps the demo and tests working offline.

## Commands
- `make setup` install everything · `make dev` run both · `make smoke` backend tests + live end-to-end stream + frontend type-check and build
- `make tag` tags the current commit `demo-ok` (only after `make smoke` is green)
- Recovery: `git switch -c recover demo-ok` when an iteration breaks the demo

## Rules (each one exists because it went wrong at a past hackathon)
1. **Demo path first.** Nothing gets built that is not on the path in `DEMO.md` until that path works.
2. **Never break a working integration.** Run `make smoke` before every commit. Red → fix or revert, never stack changes on red.
3. **Each person's Claude works only in their own folder.** Backend Claude does not edit `frontend/` and the other way round.
4. **Mock every external API** in the first hour (recorded responses under `backend/mocks/`), so a dead key or slow API never blocks the demo.
5. **No team tooling.** Use `TODO.md` and one chat thread; no bots, vaults or dashboards.
6. **The pitch is half the score.** `PITCH.md` gets real time, not the last 30 minutes.
7. **Be honest on stage** about what is mocked or seeded.

## Code standards
- Python: type hints, small functions, no global state outside `db.py`. Validate input with SQLModel/Pydantic models.
- Frontend: client components only where needed; all backend calls go through `src/lib/api.ts`.
- Secrets live only in `.env` (gitignored). Never print keys in logs.
- After a feature works, run `/review` (refactor + efficiency pass), then `make smoke`, then commit.

## Slash commands and agents
- `/demo-check` runs the demo path and reports what would fail on stage
- `/review` launches the `reviewer` agent: refactor and efficiency findings, ranked
- `/research <topic>` launches the `researcher` agent: prior art, sponsor docs, winner tactics
- `/cut-scope` lists what to drop to hit the next deadline
- `/idea-score` scores up to 3 ideas against the challenge rubric
