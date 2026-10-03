# API contract

The only shared surface between `backend/` and `frontend/`. Change this file, `backend/app/main.py` and `frontend/src/lib/api.ts` in the same commit.

Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## GET /api/health
`200 {"ok": true, "provider": "anthropic" | "openai" | "mock"}`

## POST /api/run
Request: `{"input": string (1–8000 chars)}` · `422` on empty input.
Response: `text/event-stream`, events in order:
- `token` `{"text": string}` — repeated
- `done` `{"id": number}` — run saved
- `error` `{"message": string}` — replaces `done` on failure

## GET /api/runs?limit=20
`200 [{"id", "input", "output", "provider", "created_at"}]`, newest first.

## To add after the challenge is picked
Write each new endpoint here first (method, path, request, response, errors), then build both sides.
