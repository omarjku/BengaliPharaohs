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

## PROPOSED (Claude draft — Omar + Zoha to agree before building)
See `docs/architecture.md` for why. Seeded data for the demo lives in `backend/mocks/`.

### GET /api/context?upazila={code}&since={iso8601?}
Small context pack for a short connection (target < 5 KB, gzip).
`200 {"upazila": "SRJ-SIRAJGANJ", "as_of": "2026-10-03T06:00:00+06:00", "seeded": true,
 "flood": {"station": "Sirajganj (Jamuna)", "level_m": 13.1, "danger_m": 13.35, "trend": "rising|steady|falling", "outlook_days": 3, "as_of": "..."} | null,
 "rain": {"last_10d_mm": 84, "forecast_3d_mm": 40, "as_of": "..."} | null,
 "rules_version": "2026-10-03.1", "cards_version": "2026-10-03.1",
 "price": {"paddy_tk_per_maund": 1200, "market": "Sirajganj", "as_of": "..."} | null}`
`404` unknown upazila. Any field may be `null`; the app must work without it.

### POST /api/sync
Uploads queued cases the farmer chose to share. No names, no GPS.
Request: `{"device_id": "anon-uuid", "cases": [{"case_id": "uuid", "created_at": "iso", "upazila": "code",
 "class": "brown_spot|...|not_sure", "confidence": 0.0-1.0, "taps": {"stage": "...", "days_under_water": 0, "full_submergence": true, "variety_type": "sub1|conventional|unknown"},
 "output_code": "SURVIVES_CHECK|...", "consent": true}]}`
Response: `200 {"accepted": ["case_id", ...], "rejected": [{"case_id": "...", "reason": "..."}]}` — idempotent on `case_id`. `422` if any case has `consent != true`.

### GET /api/cases?upazila={code}
SAAO dashboard list, newest first. `200 [{case fields..., "received_at": "iso"}]`.

