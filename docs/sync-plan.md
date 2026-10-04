# Sync plan: send the important things first, bring back what helps offline

Owner: **Omar** (sync engine + backend + offline pack). Zoha owns the customer experience; §6 lists what her screens need from this.
Status: plan (Sun 4 Oct). Browser-support facts come from a research pass written from knowledge of MDN/caniuse/vendor docs, **not live-checked**; rows marked (M)/(L) need a check before quoting them.

## 0. Why change anything
Today `frontend/src/lib/sync.ts` sends **every queued case in one POST, with full photos and voice notes as base64**, and marks all of it failed if anything breaks. On 2G/3G that is the worst case: one dropped connection = nothing arrives. The backend endpoints (`/api/sync`, `/api/context`, `/api/cases`) don't exist yet (backend is still the starter).

## 1. Principles
1. **Small and important first.** A case's facts (1–2 KB) let the SAAO act; the photo is evidence. Send facts first, always.
2. **Every item is independent and idempotent.** Client-made UUIDs; the server upserts; retrying after a lost response is harmless. Items may arrive in any order.
3. **Never trust `navigator.onLine`.** It only says "some network interface is up" (captive portal, no data balance…). Confirm with a tiny probe to our own server.
4. **One `drain()` function, many triggers.** Background Sync exists only on Chrome/Android, not iOS — it's a bonus, not the plan.
5. **The phone deletes nothing until the server confirms it.** The server's acknowledgement is the source of truth.
6. **Downloads are small, versioned, and stamped** with `source`, `fetched_at`, `valid_until` — stale advice is a responsible-AI issue.

## 2. Upload: priority tiers
One IndexedDB store `outbox`: `{id, case_id, tier, kind, state: queued|sending|done|failed, attempts, next_at, bytes}`.

| Tier | What | Size | When it may go |
|---|---|---|---|
| **0** | Case facts (JSON: class, confidence, answers, card, upazila, dates, consent) — batched ≤ 20 per request | 1–2 KB each | Any connection |
| **1** | Photo thumbnail 256 px JPEG q0.6 | ~8–20 KB (M) | Any connection |
| **2** | Voice note for the SAAO (if the farmer recorded one) | ~20–60 KB (L) | Measured throughput ≥ ~100 kbps |
| **3** | Full photo 1024 px JPEG q0.7 (EXIF stripped by canvas re-encode) | ~80–200 KB (M) | ≥ ~300 kbps or Wi-Fi, and not `saveData` |
| **4** | Logs / anonymous counts ("not sure" rate, model ms) | small, many | Last; dropped first if storage is short |

Rules: strict tier order, oldest first within a tier. Compress at **save time**, not at send time (phones stall on a 12 MP decode; do it once, off the main thread with `OffscreenCanvas` where available). **JPEG only** — iOS Safari cannot encode WebP (H).

## 3. The drain loop
```
drain()  (guarded by navigator.locks.request("drain") so tab + service worker don't both run)
  1. probe(): GET /api/health?t=… with no-store, 4 s timeout → ok? + measured kbps (EWMA; plus a 20–50 KB /api/probe.bin when we need a bandwidth number)
  2. allowed_tier = f(kbps, saveData, effectiveType hint)
  3. while items with tier ≤ allowed_tier and next_at ≤ now:
       send one request (tier 0: batch; others: one PUT per blob)
       timeout = clamp(15 s, bytes / kbps × 3, 120 s)
       success → mark done; failure → attempts++, next_at = now + random(0, min(5 min, 2 s × 2^attempts))   (full jitter)
       4xx (except 408/429) → failed, don't retry; honour Retry-After
  4. then pull the offline pack (§4) if allowed
```
Triggers: app start, `pageshow`, `visibilitychange → visible`, `online`, every 60 s while open, right after each enqueue, the "Sync now" button, and Chrome-only `sync` event as a bonus (`if ('sync' in reg)`). iOS stops JS ~30 s after the app goes to the background → the **foreground is the only reliable sync window**; keep requests short.

## 4. Download: the offline pack (what makes the next offline session better)
`GET /api/pack/manifest?upazila=SRJ` (~1 KB, `ETag`/`If-None-Match` → 304 when unchanged) lists versioned parts; the phone fetches only changed parts, writes them, then flips `current_version` (a half-download never replaces a working pack).

| Part | Content | Size target | Fresh for | Source (demo = seeded, say so) |
|---|---|---|---|---|
| `forecast` | 3–5 day rain + temperature for the upazila | < 2 KB | 24 h | BMD/BAMIS (no API → scrape or seed); Open-Meteo has a real API as backup (H) |
| `flood` | Nearest FFWC station level vs danger level, trend, 3–5 day outlook | < 1 KB | 24 h (flood season) | FFWC (no documented API; seed) |
| `advisories` | Current DAE/BAMIS advisory ids for the district → **mapped to our fixed cards**, never free text | < 2 KB | 7 days | BAMIS (seed) |
| `rules` / `cards` / `knowledge` | Versioned updates of our own files | 10–40 KB | until next version | us |
| `prices` | Paddy/rice prices at nearby markets | < 1 KB | 7 days | DAM (seed) |
| `case_replies` | SAAO's reply to the farmer's shared cases (e.g. "I'll visit Thursday") | < 1 KB each | — | our backend |
| `model` | New `rice.onnx` | ~6 MB | — | **Wi-Fi only** |
Budget: daily pack < ~50 KB gzipped (~15 s on 2G) (M).
The engine already reads context; with a fresh pack, advisor answers can use forecast/flood without asking, and every card shows "weather as of …".

## 5. Backend (FastAPI + SQLModel, `backend/app/`)
| Endpoint | Does |
|---|---|
| `GET /api/health` | already exists → add `Cache-Control: no-store` + `X-Health: 1` (captive-portal check); exclude from the service-worker cache |
| `GET /api/probe.bin` | 32 KB random bytes, no-store, for the bandwidth measure |
| `POST /api/cases/batch` | tier 0: upsert ≤ 20 cases by `case_id`; reject without consent; returns accepted ids |
| `PUT /api/cases/{case_id}/thumb` · `/photo` · `/voice` | raw `image/jpeg` / audio body, idempotent upsert, size limits; may arrive before the case row (store by `case_id`) |
| `GET /api/pack/manifest?upazila=` | versions + ETag; `GET /api/pack/{part}?upazila=` parts from `backend/mocks/` (`seeded: true`) |
| `GET /api/cases?upazila=` | SAAO dashboard; `POST /api/cases/{id}/reply` → shows up in `case_replies` |
Tables: `Case`, `CaseBlob(case_id, kind, bytes, sha256)`, `Reply`. tus/resumable chunks are **not needed** for ~150 KB photos (one idempotent PUT, retried whole); add only if video/long audio comes later.
`contract/api.md` gets these endpoints first; Zoha agrees, then both sides build (repo rule).

## 6. What Zoha's customer-experience work needs from sync (agree the names)
- `getSyncStatus()` → `{ pending: {facts, photos, voice}, last_success_at, pack_as_of, online_probe: ok|captive|offline, kbps }` and an event `sync:changed`.
- Per case: `facts_sent`, `photo_sent`, `reply` — so a case card can say "sent to your SAAO ✓ · photo waiting for better signal".
- Plain-language states (Bangla first): "saved on phone" → "sent ✓" → "SAAO replied". Never show kbps or tiers.
- Banner when the pack is old: "Weather from 3 days ago — connect to update". Data-saver toggle: "send photos only on Wi-Fi".
- "Add to Home Screen" prompt when `persist()` returns false (on iPhone this is the only way to avoid the 7-day storage wipe) (H).

## 7. Build order (Omar) — small, testable steps
| # | Step | Verify |
|---|---|---|
| 1 | Contract: add §5 endpoints to `contract/api.md`; agree with Zoha | both sign off |
| 2 | Backend: health headers, probe.bin, `cases/batch`, blob PUTs, `cases` list; SQLModel tables; pytest (idempotent retry, out-of-order blob, consent reject) | `make smoke` |
| 3 | `frontend/src/lib/sync/outbox.ts`: outbox store (DB version 2 migration), enqueue on share (facts + thumb + voice + photo), compress at save | unit tests |
| 4 | `probe.ts` + `drain.ts`: tiers, timeouts, backoff with jitter, lock, triggers | unit tests with a fake fetch (slow, drop, captive 200-HTML) |
| 5 | Pack: backend manifest + seeded parts; frontend `pack.ts` with ETag + atomic swap; engine reads forecast/flood | 304 path tested; card shows "as of" |
| 6 | Network drills in Playwright: `context.setOffline`, `page.route` to throttle/drop requests mid-upload, captive-portal response | facts always arrive before photos; nothing lost after a drop |
| 7 | Phone test on 2G-like throttling (Chrome DevTools "Slow 3G" + real phone) | numbers into `docs/results.md` |

## 8. Hackathon reality check
It is Sunday morning; the team freeze is **07:00** and submission 15:00. Full plan ≈ 6–9 h. **Demo slice (~2–3 h):** steps 1–2 (batch facts + photo PUT), outbox with tiers 0/1/3, drain with probe + backoff, seeded pack with forecast + flood + "as of", and one Playwright drill showing "facts first, photo later". Everything else → roadmap slide ("SMS fallback for facts, model updates over Wi-Fi, live FFWC/BMD feeds").

## Sources to check (from the research pass)
Background Sync: https://developer.chrome.com/blog/background-sync · Periodic: https://developer.chrome.com/docs/capabilities/periodic-background-sync · caniuse: https://caniuse.com/background-sync · Network Info: https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API · Storage/eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria · https://webkit.org/blog/14403/updates-to-storage-policy/ · toBlob: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob · tus: https://tus.io/protocols/resumable-upload · Backoff: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ · ODK: https://docs.getodk.org/collect-server/ · DHIS2 Android: https://docs.dhis2.org/en/use/android-app/ · Open-Meteo: https://open-meteo.com
