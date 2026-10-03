# Hack-Nation 2026 — Omar & Zoha

FastAPI + SQLModel + SSE streaming backend, Next.js + Tailwind + Motion frontend, and a Claude Code setup built for a 24-hour hackathon.

## Run
```bash
make setup     # venv, pip, npm, copies .env files
make dev       # backend :8000 + frontend :3000
make smoke     # tests + live end-to-end stream + frontend build
```
No API key? It runs on a mock LLM. Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to `backend/.env` for a real model.

## Files that matter
- `CLAUDE.md` — rules and the event clock, loaded by Claude Code every session
- `DEMO.md` — the golden path; fill in by Sat 20:00
- `PITCH.md` — pitch template, video shot list, sources
- `contract/api.md` — the backend/frontend contract
- `.claude/` — agents (`reviewer`, `researcher`) and commands (`/demo-check`, `/review`, `/research`, `/cut-scope`, `/idea-score`)

## Deploy
Backend: Railway or Render (start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, root `backend/`). Frontend: Vercel, root `frontend/`, set `NEXT_PUBLIC_API_URL`. Add the Vercel URL to `FRONTEND_ORIGINS` (or set `FRONTEND_ORIGIN_REGEX=https://.*\.vercel\.app`) on the backend.

Gotchas: `NEXT_PUBLIC_API_URL` is baked in at build time, so redeploy the frontend after changing it. The SQLite file on Railway/Render is wiped on every redeploy unless you attach a volume; seed demo data on startup instead.
