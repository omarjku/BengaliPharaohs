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

## Sync + offline pack — AGREED-DRAFT: Omar
Design: `docs/sync-plan.md`. All responses are gzipped (min 500 bytes). Seeded data lives in `backend/mocks/pack/<upazila>/<part>.json`; upazila codes come from `frontend/public/data/places.json` (SIR, HAO, COA, BAR). Unknown upazila: `404`.

### GET /api/health
Unchanged body. Adds headers `Cache-Control: no-store`, `X-Health: 1` (captive-portal check).

### GET /api/probe.bin
`200` 32768 random bytes, `application/octet-stream`, `Cache-Control: no-store`.

### POST /api/cases/batch
Request `{"device_id": string, "cases": [CaseIn]}`, max 20 cases (`422` above). Upsert by `case_id`, so a retry is harmless.
`CaseIn = {"case_id": uuid, "created_at": iso, "kind": "leaf"|"flood"|"drought"|"note", "upazila": code, "class": string|null, "confidence": number|null, "taps": object, "output_code": string, "card": string, "date_used": string, "simulated_date": bool, "consent": bool, "has_thumb": bool, "has_photo": bool, "has_voice": bool}`
`200 {"accepted": [case_id], "rejected": [{"case_id", "reason"}]}`. `consent != true` is rejected with reason `"no_consent"`.

### PUT /api/cases/{case_id}/thumb | /photo | /voice
Raw body. `Content-Type: image/jpeg` (thumb, photo) or `audio/*` (voice), else `415`. Limits: thumb 64 KB, photo 1 MB, voice 1 MB (`413` above). Idempotent upsert; allowed before the case row exists.
`200 {"case_id", "kind", "bytes": n, "sha256": hex}`

### GET /api/cases?upazila={code?}&limit=50
SAAO dashboard, newest first. `200 [{...CaseIn fields (class), "received_at": iso, "blobs": {"thumb": bool, "photo": bool, "voice": bool}, "reply": Reply|null}]` (`reply` = latest). Does not include `device_id`.

### GET /api/cases/{case_id}/thumb | /photo | /voice
The stored bytes with the original content type; `404` if absent.

### POST /api/cases/{case_id}/reply
Request `{"text": string (1-500), "by": "saao"}` -> `200 {"id", "case_id", "text", "by", "created_at"}`. `404` unknown case. Shows up in pack part `case_replies`.

### POST /api/burst
One round trip for a short connection window (docs/burst-sync.md). Request `{"device_id", "upazila"?: code, "pack_versions": {part: version}, "cases": [<same case objects as /api/cases/batch>, max 20]}`.
Response `{"accepted": [case_id], "rejected": [{case_id, reason}], "pack": null | {"upazila", "versions": {rules, cards}, "parts": {part: {"version", "source", "fetched_at", "valid_until", "seeded", "data"}}}, "server_time"}`.
`parts` holds only parts whose version differs from `pack_versions`, in priority order case_replies, flood, forecast, advisories, prices. Cases are saved even if `pack` is null (unknown/missing upazila). `version` equals the manifest's version for that part. Responses are gzipped. Old backends answer 404: the app falls back to batch + pack GETs.

### GET /api/pack/manifest?upazila={code}
`200 {"upazila", "version", "generated_at", "parts": {forecast|flood|advisories|prices|case_replies|rules|cards: {"version", "size", "valid_until"}}}` with `ETag`; `If-None-Match` -> `304`. `case_replies` version is a global counter (its content is per device), size 0.

### GET /api/pack/{part}?upazila={code}&device_id={id?}
`200 {"source", "fetched_at", "valid_until", "seeded": true, "data": ...}` with `ETag` (`If-None-Match` -> `304`). `data` per part:
- `forecast`: `{"days": [{"day": 1-5, "rain_mm", "temp_c"}]}`
- `flood`: `{"station", "level_m", "danger_m", "trend": "rising"|"steady"|"falling", "outlook_days"}`
- `advisories`: `{"card_ids": ["C3", ...]}` ids from `cards.json`, never free text
- `prices`: `{"unit": "Tk/maund", "paddy": [{"market", "tk"}]}` (2 markets)
- `case_replies`: `{"replies": [Reply]}` for cases of `device_id` (empty without it); `seeded: false`
- `rules`, `cards`: `{"name", "version", "hash"}` only; the files are bundled in the app

## Voice questions (`kind: "note"`, `card: "NOTE"`)
The farmer records a question offline; it syncs like any case (facts + `PUT /voice`). When both have arrived and the
server has `OPENAI_API_KEY`, it transcribes (Bangla) and an LLM writes a short answer, stored as a Reply with
`"by": "ai"` (text = `“transcript”\nanswer`) and `taps.transcript` on the case. It reaches the phone through the
`case_replies` pack part like a SAAO reply. No key -> no AI reply; the SAAO answers by hand.
