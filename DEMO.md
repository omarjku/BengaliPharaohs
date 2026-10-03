# Demo path

**One-liner:** _[name TBD]_ helps a smallholder rice farmer in a flood-prone Bangladeshi upazila decide what to do after a flood or disease — offline, in Bangla voice — by recognising rice leaf problems from a photo and applying BRRI's own rules, and hands off to her agriculture officer whenever it isn't sure.

**Persona (Noor-equivalent, constraints from the brief):** Rahima, 34, grows Aman rice on ~1 ha in Sirajganj (Jamuna floodplain), co-op member. Her own phone is a basic phone (calls, SMS, mobile money); the household smartphone is her son's/husband's. One SAAO serves ~900–2,000 families [verify year]; 16123 is open 9–5, closed Friday. Aug 2024 floods damaged ~200,000 ha of Aman (USDA GAIN).

## Golden path (phone in airplane mode the whole time)
1. **Open the app** (installed PWA, offline self-check shows green ✓). Bangla UI, tap-first, audio on first tap.
2. **Photo check:** take/pick a photo of a rice leaf → in <1 s: "Looks like brown spot (not certain)" + confidence bar + Zoha's Bangla voice card (safe template: do now / do not / ask SAAO).
3. **"Not sure" moment:** photo of a non-rice leaf or a blurry photo → "Not sure — this doesn't look like a rice leaf I know. Ask your SAAO" (the pass/fail guardrail, shown on purpose).
4. **After-flood advisor (the aha):** tap answers — variety (Sub1? yes/no), fully under water? days, growth stage, date (**simulated date, labelled on screen**) → options with BRRI source + year: "usually survives — wait 5–7 days and check new leaves" / "re-plant short-duration variety by [date], seedlings from SAAO" / "too late for Aman this year — plan Boro, ask SAAO".
5. **Hand-off:** "Share with my SAAO?" (consent, Bangla audio) → case queued offline → turn Wi-Fi on → syncs → SAAO dashboard on the laptop shows the case; SMS summary preview to Rahima's basic phone (**labelled simulated**).

## Hard AI part to show under the hood (15 s)
On-device MobileNetV3-Small (~1–6 MB, ONNX in the browser, WASM) trained on ~Bangladeshi field photos from N public datasets; **leave-one-dataset-out** macro-F1 and an abstention curve; calibrated "not sure" + "not rice" detection. The advisor is deliberately deterministic (BRRI rules), not AI.

## Real vs. mocked (say this on stage)
| Part | Real | Mocked/seeded |
|---|---|---|
| Leaf classifier, offline in browser | ✅ | — |
| Bangla voice cards | ✅ recorded by Zoha | — |
| Advisor rules | ✅ from BRRI/DAE sources (cited per rule) | demo date simulated |
| Store-and-forward + dashboard | ✅ local FastAPI | other farmers' cases seeded (labelled) |
| SMS to basic phone | — | simulated preview (no gateway) |
| Agronomist review | _fill in honestly_ | |

## Fallbacks
- Backup screen recording of the golden path: `demo/backup.mp4` (record by Sun 08:00)
- Bundled sample photos that are known to classify correctly (say they are samples)
- Phone pre-installed and verified offline 3× after force-stop; laptop runs the sync server locally
