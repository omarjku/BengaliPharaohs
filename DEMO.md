# Demo path (golden path, timed)

**One-liner:** Agronomy helps a smallholder rice farmer in a flood-prone Bangladeshi upazila decide what to do after a flood or disease, offline, in Bangla, by checking a leaf photo on the phone and applying BRRI/DAE rules. When it is not sure, it hands off to her agriculture officer (SAAO).

**Persona:** Rahim, 42, Aman rice on ~1 ha in Sirajganj. Cheapest Android (~Tk 6,000 class), patchy 3G, one SAAO for ~900-2,000 families (verify year), helpline 16123 closed Fri/Sat/holidays. Keypad phones in the household, so SMS is shown as a simulated preview only.

**Live app:** https://dhansathi-gilt.vercel.app (Vercel, static PWA). Backend: https://bengalipharaohs-production.up.railway.app (cases, SAAO dashboard). SAAO code: the value in `backend/.env` / Railway variable `SAAO_TOKEN`. Never show it on screen: type it off-camera or pre-fill before recording.

## Before you start (T-30 min)
1. Real Android phone, Chrome, open the live URL online. Wait for the green "works offline / every file is on the phone" box on Home (about 27 MB precache). Install to home screen. Force-stop, reopen once online.
2. Home screen: set **Demo date** to `2026-08-20` (flood scenario inside the Aman window). The flood screen shows "Date used: ..." and cases are tagged "simulated". Reset the date at the end.
3. Fill farm details once (BRRI dhan51 or Local, Sirajganj/Kazipur, Aman) so the wizard pre-fills.
4. Laptop: dashboard open at `/saao`, code entered. Sample photos are in the phone gallery (copy `frontend/public/samples/*.jpg`).
5. Backup: screen recording `demo/backup.mp4`. Rehearse 3x from airplane mode after a force-stop.

## Samples: which one shows what (verified on the live app, 4 Oct)
| File | Result | Use it for |
|---|---|---|
| `blast-1.jpg` / `blast-2.jpg` | "Looks like blast (not certain)", card C2, "could also be brown spot", model p 0.99 | Step 2: the confident, correct path |
| `healthy-1.jpg` / `healthy-2.jpg` | Healthy, card C1 | Optional: it does not cry disease |
| `brown_spot-1.jpg` | Brown spot, correct | Spare |
| `not_rice-1.jpg` / `-2.jpg` (bean leaves) | NOT SURE card C8 | Step 3: the pass/fail moment |
| `not_rice-3.jpg` | NOT SURE (p 0.50, unsure) | Spare |
| `blb-1.jpg` | Model unsure (healthy 0.29) -> asks "A couple more questions" -> NOT SURE | Step 4: follow-up questions |
| `brown_spot-2.jpg`, `blb-2.jpg` | **Confidently wrong** (sheath blight 0.96, tungro 0.997) | **Do not use on camera.** Know them for Q&A: this is the held-out error rate in the flesh |

## Golden path (about 2:00 live; phone in airplane mode from 0:10 to 1:25)
| Time | Action | What the viewer sees | Say |
|---|---|---|---|
| 0:00 | Open installed app online, Home | Bangla UI, "Online" badge, offline-ready box | "Rahim's phone, installed once at the co-op." |
| 0:10 | **Airplane mode on**, reopen app | Badge shows offline, app still loads | "No signal in the field. Everything from here runs on the phone." |
| 0:20 | Leaf check -> gallery -> `blast-1.jpg`. Farm details pre-filled, tap "Middle of the leaf", "A few spots" | Result: "Looks like blast (not certain)", confidence bar "Higher, not certain", do now / do not / ask SAAO, Listen button plays Bangla voice | "6 MB model, about 12 ms on my laptop, on a phone it is still under a second [only say after the phone test]. It says not certain, never a percentage of belief." |
| 0:40 | New check -> `not_rice-1.jpg` (bean leaf), same taps, answer "Don't know" to follow-ups | "Not sure - show your SAAO", "We will not guess", no disease name | "This is the safety rule. 60 of 60 bean leaves it had never seen got NOT SURE." |
| 0:55 | New check -> `blb-1.jpg` | After the taps: "A couple more questions" (two yes/no checks) -> answer Don't know -> NOT SURE card | "When the photo is unsure the app asks the farmer, it does not guess. Context can only keep, swap between the top two, or decline." |
| 1:10 | Flood tab: Flood -> Sirajganj/Kazipur -> not flood-tolerant, whole plant under water -> 3 days -> Tillering -> hills alive "Don't know" -> See the result | Advice with BRRI source and year, "usually survives, check new leaves in 5-7 days" (SURVIVES_CHECK, card A1) | "Date used: 20 Aug, simulated, labelled on screen. This is a rule table from BRRI/DAE, deliberately not AI." |
| 1:30 | Repeat with 9 days (or set Demo date `2026-10-03`, 10 days) | REPLANT short-duration (A3) or "too late for Aman, plan Boro, ask SAAO" (A5) | "Same rules, different answer. After mid-September it says too late." (rehearse which input gives which card; e2e tests T04 -> A3, T07 -> A5) |
| 1:40 | Result screen -> "Share with my SAAO" -> consent dialog (Bangla + audio) -> agree. Cases tab shows "Waiting to send" | Case queued on phone | "Nothing leaves the phone unless she taps share." |
| 1:50 | **Airplane mode off** | Cases tab: sent | "Facts first, photo later, on a weak link." |
| 2:00 | Laptop: `/saao` | The new case appears at the top (real, from the phone), below it seeded cases tagged "seeded (demo)" | "The new one is real. The other cases are seeded and labelled." |

## Real vs seeded or simulated (say it on stage and on a slide)
| Part | Real | Seeded / simulated |
|---|---|---|
| Leaf classifier (MobileNetV3-Small, ONNX, WASM, in browser) | Yes, trained by us on 14,134 Bangladeshi rice photos + 747 non-rice | Sample photos come from public datasets, not from Rahim |
| NOT SURE rule, follow-up questions, cards | Yes, deterministic, 16 fixed cards | - |
| Bangla voice cards | Recorded by Zoha | - |
| Flood advisor | Yes, rules cited to BRRI/DAE per rule | **Demo date is simulated** (today, 4 Oct, is past the Aman window) |
| Store-and-forward + SAAO dashboard | Yes, FastAPI on Railway, SAAO-code protected | Other farmers' cases are seeded and tagged; "area update" pack is seeded |
| SMS to a keypad phone | - | Simulated preview only, no gateway |
| Offline Bangla speech input | Planned/partial: see `docs/stt-plan.md` (confirm status before claiming) | - |
| Agronomist review | Fill in honestly (SAAO/BRRI contact: none yet unless Zoha got one) | - |
| Real-phone test on a ~Tk 6,000 Android | **Fill in with the measured number, or say "not yet measured"** | Laptop numbers: 11-14 ms inference |

## Likely failure points and fixes
- Wizard Next needs district + upazila + season picked, else the button does nothing. Pre-fill the profile.
- Service worker not caching: only works from HTTPS and after the green box. Test airplane mode from a force-stop.
- Dashboard says "could not reach server, showing seeded demo cases": the SAAO code is missing/wrong or Railway is asleep. Hit `/api/health` first. Case data lives on a Railway persistent volume (`/data`), so it survives redeploys (checked 4 Oct).
- Dashboard seeded rows show raw debug chips (`where=middle`, `p=0.81`). Cosmetic; tell Zoha.
- `not_rice-1` also shows a follow-up question before NOT SURE ("could be one of two problems"). Tap Don't know and move on; Zoha may want to skip follow-ups when the top class is not_rice.

## Fallbacks
`demo/backup.mp4` recorded by Sun 08:00. Bundled samples. If Railway is down, the dashboard still shows seeded cases and the phone half still works; say so.
