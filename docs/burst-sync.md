# Burst sync: what the app does with 15 seconds of LTE

Pitch line: "I'm a Bangladeshi farmer with 15 seconds of LTE. That was enough to sync with the cloud and get the latest data to look after my fields."

On a short window the time goes on **round trips** (each costs ~0.3-1.2 s on LTE, more on 3G), not on bytes. The facts of a case are 1-2 KB and the whole pack delta is ~1 KB. So the app makes as few requests as possible and does them in order of importance.

## The plan (`frontend/src/lib/sync/drain.ts`, `run()`)

| Step | What | Budget rule |
|---|---|---|
| a | Probe `GET /api/health` (confirms it is OUR server, not a captive portal) | <= 2 s, no bandwidth test yet |
| b | `POST /api/burst`: up to 20 case facts up, changed pack parts down, **one request** | needs > 1 s left |
| c | Thumbnails (`PUT .../thumb`), one each | any connection, stop when < 0.5 s left |
| d | Voice, then full photos: first time the bandwidth (32 KB `probe.bin`), then each file only if `bytes / kbps x 1.3` fits in the time left | skipped if < 5 s left (cellular) |
| e | At the deadline every request is aborted. A request cut by the deadline goes back to the queue with **no backoff and no attempt counted**. Anything not confirmed stays queued and resumes at the next window | |

Budget: 15 s on cellular, 120 s on Wi-Fi (`BURST_BUDGET_MS`, or `drain({budgetMs})`). Nothing starts that cannot finish; facts always go before any file; strict order (nothing jumps ahead of facts or a thumb that is waiting).

Download priority inside the burst response: `case_replies`, `flood`, `forecast`, `advisories`, `prices`. The pack is replaced by **one** IndexedDB write after the whole response parsed, so a cut connection never leaves half a pack.

Compared with the old flow (health, probe.bin, batch, manifest, 5 part GETs = 9 sequential round trips before everything is in), facts + all pack data now take **2** (health, burst). Old backends (404 on `/api/burst`) automatically fall back to the old calls.

## Triggers
`online`, `pageshow`, app becoming visible, every 60 s while open, app start, "Sync now" and opening the area news. A pack-only burst (nothing to send) runs at most every 5 minutes unless forced.

## Sync report
After a window in which anything moved, `kv "sync_report"` holds `{started_at, ms, budget_ms, sent:{facts,thumbs,photos,voice}, received:[parts], new_replies, bytes_up, bytes_down (decoded size), stopped_by_budget}`.
`getLastSyncReport()` (from `@/lib/sync`) reads it; window event `sync:report` carries it. `BurstBanner` turns it into a toast: "Synced in 6 s: sent 2 cases, got today's weather, flood level and 1 SAAO reply" (Bangla equivalent; strings at the end of `strings.ts`, **Bangla is a Claude draft for Zoha to review**). If the window happened while the page was closed the toast shows on the next open (within 10 min).

## Area news ("আপনার এলাকার সর্বশেষ খবর")
Shows forecast rain/temperature, river level vs danger level, advisories as card titles, paddy prices and the latest SAAO replies, from the offline pack. It always ends in one of: fresh data "As of <date>", "No new data" (+ as-of), "Offline - showing data from <date>" (cached data), "No area selected - Set your area", or "no update available". `loadArea()` caps the network part at 10 s and storage at 3 s, so the spinner cannot run forever.

What was wrong: (1) Railway deploys `backend/` only, but the upazila code list was read from `frontend/public/data/places.json`, so every real code (`SRJ-SIRAJGANJ`...) got `404 unknown upazila` on the live backend (verified with curl) and the screen had no data; now the list ships in `backend/mocks/upazila_codes.json`. (2) The old component chained `refreshPack` (up to 6 sequential calls with 10 s timeouts each) and `getContext` without any `catch`, so any throw (storage blocked, odd part) left `pack === undefined` = spinner forever; and a missing profile area rendered nothing at all. (3) `/api/pack/manifest` reused the first response's `Content-Length` for the longer body (uvicorn: "Response content longer than Content-Length"); gzip hid it on Railway, direct clients broke.

## Measured (Playwright, `e2e/burst.spec.ts`, real backend on :8000, every API call delayed by an added round trip)
| Added delay per call | Window until banner shows facts + reply + weather + flood | Report `ms` | API calls | bytes up / down |
|---|---|---|---|---|
| 300 ms (good LTE) | 1.8 s | 1.6 s | 7 | 45.6 KB (incl. 1 photo) / 1.2 KB |
| 1200 ms (bad LTE) | 5.4 s | 4.9 s | 6 | same |

(`e2e/burst-timings.json` has the last run.) vitest (`src/lib/sync/burst.test.ts`, fake fetch with latency) proves: one burst carries facts and returns the pack delta; facts go before thumbs and photos; the budget is respected (6 cases, 1.5 s budget: stops inside budget, rest resumes with no fact sent twice); a response cut mid-body changes nothing and re-sends the same idempotent request; a request cut by the deadline is requeued without penalty; 404 falls back to `/api/cases/batch`.

## Demo: airplane mode -> share -> 15 s of LTE -> airplane mode
1. Online once so the phone has a pack. Switch on airplane mode.
2. Check a leaf and tap "Share with my SAAO" ("will send when there is signal"). On the SAAO dashboard (`/saao`, code in `SAAO_TOKEN`) answer the earlier case with a reply.
3. Switch airplane mode off and watch the clock: within a few seconds the toast says what went up and what came down.
4. Airplane mode on again. Open the result page: the area news shows "Offline - showing data from <date>" with the SAAO reply, river level, rain and prices.
For a stage-proof version use Chrome DevTools "Slow 4G" and the `RTT_MS=1200 npx playwright test e2e/burst.spec.ts` run.

## Not covered
Live FFWC/BMD feeds (pack data is seeded and labelled "seeded (demo)"), Background Sync on iOS, a real-phone LTE measurement, delta compression below the existing gzip.
