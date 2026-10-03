# Architecture: photo → context → rules → fixed card (no generation)

## Status of the model (honest)
- **We do not have a trained model yet.** No usable ready-made Bangladeshi rice model exists (no licence/weights, or untested on BD data — `docs/redteam/README.md` §2).
- **We train it tonight.** Measured on a 4-core CPU (`docs/redteam/00-model-feasibility.md`): 1.6 min frozen-backbone / 4.7 min per full epoch on 20k images; 1.1 MB TFLite; 4 ms per image. An M-series Mac or free Colab is faster.
- What it classifies: **one close-up rice leaf** → Healthy, Blast, Brown spot, Sheath blight, Tungro, Bacterial leaf blight (+ Leaf scald if the data supports it) + **NOT_SURE / NOT_RICE_LEAF**. It does **not** judge a whole plant or field, flood damage, panicles or pests at the base — the app asks the farmer (taps) for those.

## The decision pipeline (all on the phone, all offline)
```
1. PHOTO  ──► classifier (ONNX, in browser) ──► {class, confidence, top2}
                                                  │  below threshold → NOT_SURE
2. TAPS   ──► growth stage, days under water, full/partial, variety type (Sub1?), symptom location
3. CLOCK  ──► date → season (Aus/Aman/Boro) + where we are in BRRI's calendar (windows, cut-offs)
4. CONTEXT PACK (if fresh) ──► flood warning level, rain last 7–10 days, rain forecast 3–5 days
                                (stale or missing → ignored, card says "no recent weather data")
5. RULE TABLE (deterministic JSON, `docs/advisor-rules.md`) ──► one OUTPUT CODE + parameters
6. CARD BANK (fixed texts + Zoha's Bangla audio, `docs/action-cards.md`) ──► card shown + played
   Only slots are filled from the table (a date, a variety name, a number of days) — never free text.
```
- Every path ends in a **fixed card**; there is no generative model anywhere on the phone (brief: fixed answer list, avoid hallucinations).
- Every card shows **why**: the inputs used, the rule's source (BRRI/DAE + year) and the data date ("weather as of 3 Oct, 06:00").
- Examples of context changing the card (rules to be source-checked in `advisor-rules.md`):
  - Blast + several wet/humid days forecast → same blast card + "wet days ahead: check again in 2–3 days, ask SAAO before any spray".
  - Field under water now + flood warning still rising at the nearest station → "wait — do not re-plant until the water has gone down" (no re-plant advice during an active flood).
  - Re-plant question + date past the Aman cut-off → TOO_LATE_AMAN, whatever the photo says.
  - Healthy leaf + heavy rain forecast at a flood-prone upazila → "your leaves look healthy; flood warning for your area — see the after-flood checklist".

## Using patchy internet: what moves when there is signal
Designed for **a few seconds of 2G/3G**: everything is small, prioritised, resumable and time-stamped.

### Installed once (Wi-Fi at home/UDC, or side-loaded) — ~6–15 MB total
| Item | Size (est.) |
|---|---|
| App shell (PWA) | ~1 MB |
| Classifier `model.onnx` (MobileNetV3-Small, int8/fp16) | ~1–6 MB |
| onnxruntime-web WASM | ~5–10 MB (measure; biggest item) |
| Card bank + rule table JSON | < 100 KB |
| Bangla audio clips (25–40 × ~40 KB opus) | ~1–2 MB |
| Static reference: BRRI variety table, season calendar, upazila list with region type (floodplain/haor/coastal/Barind) and nearest flood station, rainfall normals per upazila | < 200 KB |

### Downloaded in a short connection — priority order
| Priority | Item | Size | Fresh for | Source |
|---|---|---|---|---|
| 1 | Flood status for the farmer's upazila (nearest station level vs danger level, trend, 3–5 day outlook) | ~1 KB | 24 h | BWDB FFWC (registration needed) |
| 2 | Rain: observed last 7–10 days + forecast 3–5 days for the upazila | ~1 KB | 48 h | BMD/BAMIS, CHIRPS, NASA POWER |
| 3 | Rule/card bank update (versioned diff) | 1–50 KB | until next version | us (reviewed by DAE/BRRI in a real deployment) |
| 4 | Market price snapshot (paddy/rice, DAM) — optional | ~1 KB | 7 days | DAM |
| 5 | New model version | MBs | — | **Wi-Fi only** |
One compressed "context pack" request (`GET /api/context?upazila=…&since=…`) returns items 1–4 in a single small response (target < 5 KB); the app stores it with a timestamp.

### Uploaded in a short connection
| Item | Size | When |
|---|---|---|
| Queued cases the farmer chose to share with the SAAO (class, confidence, taps, date, upazila — no name, no GPS) | ~1 KB each | first, always |
| Optional photo thumbnail (EXIF stripped) | ~20 KB | only with explicit consent, Wi-Fi or good signal |
| Anonymous usage counts (how often "not sure") | < 1 KB | batched |

### Rules for staleness and failure
- Each context item carries `as_of`; past its freshness window it is **ignored**, and the card says so. The decision never depends on context being present — taps + date are enough.
- Requests are tiny, retried with back-off, and resumable; nothing blocks the UI.
- **SMS** carries the result *out* to keypad phones (simulated in the demo). Reading a weather SMS back into the app needs a native app (a PWA cannot read SMS) — roadmap, not tonight.

## Demo scope (tonight) vs roadmap
- **Build:** classifier offline; rule table + cards; context pack served by our FastAPI from a **seeded, labelled JSON** (realistic flood/rain values for Sirajganj); store-and-forward queue + `/api/sync`; simulated SMS preview.
- **Say on stage as roadmap:** live FFWC/BMD feeds, DAE/BRRI review of rules, SMS gateway, model updates over Wi-Fi, native app for SMS ingest.
