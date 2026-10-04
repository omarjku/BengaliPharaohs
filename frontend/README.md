# Agronomy frontend (owner: Zoha)

Offline-first PWA: rice-leaf photo + farmer context → fixed Bangla card; after-flood advisor; consent-gated hand-off to the SAAO.
Static export (`output: "export"`), so the whole app is plain files a service worker caches for airplane mode.

## Run
```bash
npm install
npm run dev          # http://localhost:3000 — fast reload, NO offline caching (service worker is off in dev)
npm test             # engine tests: advisor T01–T18, cross-check X01–X19
npm run build        # static export to out/ + precache list
npm start            # serves out/ on http://localhost:3000 — the offline-capable build
```
Backend URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). The app works with no backend at all.

## Test offline (real Chrome or the phone; the Claude desktop browser pane blocks service workers)
1. `npm run build && npm start`, open http://localhost:3000 in Chrome, wait for the green "works offline" box on the home screen.
2. DevTools → Network → "Offline" (or airplane mode on the phone), reload, click through every screen.
3. Phone: needs HTTPS (deploy `out/` to Vercel/Netlify, or a tunnel). Install to home screen, force-stop, airplane mode, reopen.

## Where things are
| Path | What |
|---|---|
| `src/app/{check,flood,result,cases,saao,profile}/page.tsx` | Screens (all client components) |
| `src/lib/engine/` | Deterministic decision engine + tests (no LLM) |
| `src/lib/model/classify.ts` | onnxruntime-web WASM + preprocessing; reads Omar's 4 files in `public/model/` |
| `src/lib/store/db.ts` | IndexedDB: profile, cases (offline queue), photos |
| `src/lib/sync.ts` | Store-and-forward sync (on `online` + "Sync now") |
| `src/lib/strings.ts` | Every UI string, Bangla first (**Claude draft, Zoha to review**) |
| `public/data/cards.json` | 16 fixed cards, EN + BN (**BN = Claude draft, Zoha to review**) |
| `public/data/rules.json` | Copied from `docs/advisor-rules.md` §7 by `node scripts/extract-rules.mjs` |
| `public/data/knowledge.json` | Cross-check knowledge base (question `bn` = Claude draft) |
| `public/data/places.json` | Demo upazilas (region, north) + varieties (Sub1 flags) |
| `public/audio/<clip_id>.mp3` | Zoha's recordings (manifest: `docs/action-cards.md` §4, plus new `C9-LOCATION`) |
| `public/sw.js`, `scripts/gen-precache.mjs` | Service worker + build-time file list |

## Swapping in the real model
Omar drops `rice.onnx`, `labels.json`, `preprocess.json`, `threshold.json` into `public/model/` (same names) and you rebuild. The red "dummy model" banner disappears once `threshold.json` no longer has `"dummy": true`.
