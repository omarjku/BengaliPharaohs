# Action cards: text and audio script (DRAFT, needs Zoha review + Bangla translation)

Drafted Sat 3 Oct 2026. One card per classifier class and one per advisor output code (`docs/advisor-rules.md`). Every card follows the 7-part safe template in `docs/redteam/README.md` §3.

**Rules for every card**
- English draft, short sentences that work when read aloud. Zoha translates them into everyday spoken Bangla, not formal Bangla.
- **Card body = parts 1–4** (different on every card), **≤ 60 words**, checked by script. Parts 5–7 are **shared lines** (§1), recorded once and played after every body. This keeps the audio to about 30 clips.
- No pesticide brand names and no doses, ever. Carbofuran is named only as a banned product. Fertiliser: "no extra urea" or "ask your SAAO how much", never an amount.
- `{curly}` = value filled in by the app and shown **on screen only**. The audio uses the generic sentence in the manifest (§4), so Zoha does not record numbers or dates.
- Classifier wording always says "looks like … (not certain)". The app shows the confidence bar but **never a %** in the spoken text.

## 1. Shared lines (parts 5–7)

| ID | Part | Text | Used by |
|---|---|---|---|
| SH-SPRAY | 5 If spraying is needed | If spraying is needed: use only a DAE-registered product your SAAO names. Read the label. Wear gloves and a mask. Never use banned products like carbofuran. | Blast, Brown spot, Sheath blight, Leaf scald, Healthy, Not sure |
| SH-SPRAY-VIRUS | 5 | No spray cures tungro. Spraying for the insects that spread it is your SAAO's decision. Never use banned products like carbofuran. | Tungro |
| SH-SPRAY-BLB | 5 | No spray works well against this disease. Do not buy one for it. Never use banned products like carbofuran. | BLB |
| SH-SPRAY-FLOOD | 5 | Spraying does not fix flood damage. Spray only if your SAAO tells you to. Never use banned products like carbofuran. | All advisor cards |
| SH-ASK | 6 Ask a person | Ask your SAAO at the union agriculture office. Or call 16123, from 8 in the morning to 8 at night. It is closed on Friday, Saturday and holidays. | All cards |
| SH-FOOT-PHOTO | 7 Honesty footer | This is computer advice from a photo. It can be wrong. It does not replace your agriculture officer. | Classifier cards |
| SH-FOOT-RULE | 7 Honesty footer | This advice comes from fixed BRRI and DAE rules, not from your field. It can be wrong. You and your agriculture officer decide. | Advisor cards |

BN (all shared lines): (Zoha to translate)

**16123 hours.** The AIS official page (last updated 19 Sep 2024) says 08:00–20:00 every day except Friday, Saturday and government holidays: https://ais.gov.bd/site/page/d9147061-2995-416f-b355-d7feb0d9f9a1/Krishi-call-centre-(16123). **VERIFIED** (official page). The news reports disagree: Dhaka Tribune 2016 says 9–5, closed Friday (https://www.dhakatribune.com/feature/6771/agro-aid-through-the-wire); Dhaka Tribune May 2024 says 9–4, also open Saturdays (https://www.dhakatribune.com/bangladesh/agriculture/345509/farmers%E2%80%99-friend-krishi-call-centre-struggling-to). **NEEDS-CHECK:** call the number once in office hours before the pitch, and on stage say only "office hours, closed Friday and Saturday".

---

## 2. Classifier cards

Disease sources: IRRI Rice Knowledge Bank fact sheets, read 2026-10-03 (VERIFIED). Look-alikes come from the red-team agronomy review (§3). We could not reach the matching BRRI pages (Bangladesh Rice Knowledge Bank, knowledgebank-brri.org) from our sandbox, so each card marks **BRRI cross-check: NEEDS-CHECK**.

### C1 · Healthy
1. **What we see:** The leaf looks healthy (not certain).
2. **How sure and why:** The photo shows only one leaf. Problems can hide at the plant base or in the panicle.
3. **Do now:** Walk the field. Check other plants, the base and the panicles. Check again in a week.
4. **Do not:** Do not spray healthy plants.
5–7: SH-SPRAY · SH-ASK · SH-FOOT-PHOTO

BN: (Zoha to translate)
Sources: red-team §3 (photo limits). No disease source needed.

### C2 · Blast
1. **What we see:** Looks like blast (not certain). It could also be brown spot.
2. **How sure and why:** Blast spots are pointed at both ends, grey in the centre. To be sure, send a photo of the panicle neck.
3. **Do now:** Keep water in the field. No extra urea. Check again in 2 to 3 days.
4. **Do not:** Do not spray before talking to your SAAO.
5–7: SH-SPRAY · SH-ASK · SH-FOOT-PHOTO

BN: (Zoha to translate)
Sources: IRRI RKB "Blast (leaf and collar)": split nitrogen, too much fertiliser makes blast worse, flood the field, can be confused with brown spot. http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/blast-leaf-collar (VERIFIED). BRRI cross-check: NEEDS-CHECK.

### C3 · Brown spot
1. **What we see:** Looks like brown spot (not certain). It could also be blast, or low zinc or potassium.
2. **How sure and why:** Brown spots are round, grey in the centre, red-brown at the edge. Poor soil makes it worse.
3. **Do now:** Keep water in the field. Ask your SAAO about a soil test. Check again in 2 to 3 days.
4. **Do not:** Do not spray before talking to your SAAO.
5–7: SH-SPRAY · SH-ASK · SH-FOOT-PHOTO

BN: (Zoha to translate)
Sources: IRRI RKB "Brown spot": common in unflooded, nutrient-poor soil; improving soil fertility is the first step; lesions can be mistaken for blast. http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/brown-spot (VERIFIED). Zn/K look-alikes: red-team §3. BRRI cross-check: NEEDS-CHECK.

### C4 · Sheath blight
1. **What we see:** Looks like sheath blight (not certain). It could also be stem rot or stem borer.
2. **How sure and why:** It starts on the stem, near the water. A leaf photo is not enough. Send a photo of the plant base.
3. **Do now:** Pull weeds on the bunds. No extra urea. Check again in 2 to 3 days.
4. **Do not:** Do not spray before talking to your SAAO.
5–7: SH-SPRAY · SH-ASK · SH-FOOT-PHOTO

BN: (Zoha to translate)
Sources: IRRI RKB "Sheath blight": lesions start on the sheath just above the water; favoured by high nitrogen and dense planting; control weeds on levees; similar to stem rot and stem borer. http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/sheath-blight (VERIFIED). BRRI cross-check: NEEDS-CHECK.

### C5 · Tungro
1. **What we see:** Looks like tungro (not certain). Yellow-orange leaves can also come from low nitrogen or zinc, cold, or salt.
2. **How sure and why:** Tungro is a virus spread by small green insects. Send a photo of the whole plant.
3. **Do now:** Pull out yellow, stunted plants and bury them. Tell your SAAO soon.
4. **Do not:** Do not use seedlings from a seedbed with yellow plants.
5–7: SH-SPRAY-VIRUS · SH-ASK · SH-FOOT-PHOTO

BN: (Zoha to translate)
Sources: IRRI RKB "Tungro": two viruses spread by green leafhoppers; yellow or orange-yellow leaves from the tip, stunting; seedlings from infected nurseries raise infection. http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/tungro (VERIFIED). "Remove infected hills", "no cure" and the look-alikes come from red-team §3 (NEEDS-CHECK against BRRI). BRRI 2022–23 report: BRRI dhan87 was badly hit by tungro in Sylhet (context only).

### C6 · Bacterial leaf blight (BLB)
1. **What we see:** Looks like bacterial leaf blight (not certain). It could also be leaf streak or leaf scald.
2. **How sure and why:** A test: put a cut sick leaf in clear water. Cloudy liquid after a few minutes means blight is likely.
3. **Do now:** Drain extra water if you can. Remove weeds and old stubble.
4. **Do not:** Do not add urea until your SAAO says so.
5–7: SH-SPRAY-BLB · SH-ASK · SH-FOOT-PHOTO

BN: (Zoha to translate)
Sources: IRRI RKB "Bacterial blight": worse with high nitrogen; good drainage; remove weeds and stubble; resistant varieties are the main control; the cut-leaf water test. http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/bacterial-blight (VERIFIED). "No effective chemical": red-team §3 (NEEDS-CHECK against BRRI). Note: the Ministry flood notice on krishi.gov.bd names a branded BLB spray with a dose. **We deliberately leave that out.**

### C7 · Leaf scald (only if the trained model keeps this class)
1. **What we see:** Looks like leaf scald (not certain). It could also be bacterial leaf blight.
2. **How sure and why:** Scald makes light and dark brown bands from the leaf tip. In the clear-water test it gives no cloudy liquid.
3. **Do now:** No extra urea. Remove weeds and old stubble. Check again in 2 to 3 days.
4. **Do not:** Do not spray before talking to your SAAO.
5–7: SH-SPRAY · SH-ASK · SH-FOOT-PHOTO

BN: (Zoha to translate)
Sources: IRRI RKB "Leaf scald": zonate lesions from the tips or edges; favoured by high nitrogen; confused with leaf blight, and no ooze means scald. http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/leaf-scald (VERIFIED). IRRI also lists fungicide names on this page; **we deliberately leave them out.** Whether scald is common in Bangladesh: NEEDS-CHECK.

### C8 · Not sure / not a rice leaf
1. **What we see:** Not sure. This does not look like a rice leaf we know, or the photo is not clear.
2. **How sure and why:** We will not guess. A wrong answer could cost you money.
3. **Do now:** Take a new photo in daylight: one leaf, close and sharp. Or show the plant to your SAAO.
4. **Do not:** Do not spray or buy anything because of this app.
5–7: SH-SPRAY · SH-ASK · SH-FOOT-PHOTO

BN: (Zoha to translate)
Sources: red-team §1.5 and §3 (pass/fail responsible AI: "not sure, ask a person").

---

## 3. Advisor cards

On screen every advisor card also shows: the inputs used, the rule ID (e.g. `D10`), the source and its year, the date used (**"simulated" label in the demo**), the deadline, and where to get seedlings. The spoken text uses the generic sentence in the manifest.

### A1 · SURVIVES_CHECK
1. **What we see:** You told us: {variety}, {fully/partly} under water {days} days, {stage}. Date: {date}.
2. **How sure and why:** IRRI and Ministry of Agriculture advice: plants like this {usually survive}.
3. **Do now:** Wait 5 to 7 days after the water goes. Look for new green leaves. Wash mud off the leaves. No fertiliser for about 10 days.
4. **Do not:** Do not plough or replant before you check.
5–7: SH-SPRAY-FLOOD · SH-ASK · SH-FOOT-RULE

Variants: `{usually survive}` becomes "may not survive" when `outlook = not_sure` (clip A1-SURVIVE-UNSURE). If `prepare_backup`, add "Keep spare seedlings ready." (clip A1-BACKUP) after part 4.

BN: (Zoha to translate)
Sources: S_IRRI_CCR, S_CG_SUB1, S_DHAN51, S_MOA (wash mud for 5–7 days; no fertiliser right after; wait ~10 days until new leaves). Rules D03–D05 and G06. Thresholds: see NEEDS-CHECK in `advisor-rules.md` §10.

### A2 · GAP_FILL
1. **What we see:** You told us most hills came back, with gaps. Date: {date}.
2. **How sure and why:** Ministry of Agriculture advice: gap filling helps only before {15 September}.
3. **Do now:** Take extra tillers from healthy hills, keep 2 or 3 per hill, and plant them at once with roots.
4. **Do not:** Do not take tillers from yellow or sick plants.
5–7: SH-SPRAY-FLOOD · SH-ASK · SH-FOOT-RULE

BN: (Zoha to translate)
Sources: S_MOA (split 2–3 tillers, transplant at once), S_BARC (re-transplant missing hills), S_GAIN (15 Sep). Rule D01. "Most hills" threshold: NEEDS-CHECK.

### A3 · REPLANT_SHORT_DURATION
1. **What we see:** You told us the crop is mostly lost. Date: {date}.
2. **How sure and why:** BRRI and DAE flood advice, 2024: transplant Aman by {15 September}.
3. **Do now:** Plant a late variety like BR22, BR23, BRRI dhan46 or 54. Use older seedlings, 4 or 5 per hill, closer together. Get seedlings from your SAAO, upazila office or BADC.
4. **Do not:** Do not plant after {15 September}.
5–7: SH-SPRAY-FLOOD · SH-ASK · SH-FOOT-RULE

BN: (Zoha to translate)
On screen only: seedling age {30–45 days} (NEEDS-CHECK), spacing 20×15 cm, own seedbed by {30 Aug} if before that date; short varieties BRRI dhan57/62 when `md` ≤ 08-31.
Sources: S_MOA (varieties, 4–5 per hill, 20×15 cm, seedbed by 30 Aug), S_GAIN (15 Sep, 2024), S_BRJ_PS (2020), S_AMAN_GUIDE (30–45 d). Rules D09, D10. **Do not add BRRI dhan87** (126–128-day normal-window Aman variety, S_BRRI_RA1718).

### A4 · DIRECT_SEED
1. **What we see:** You told us: crop lost, no seedlings. Date: {date}.
2. **How sure and why:** BRRI advice for the 2024 floods. Only for higher land that will not flood again.
3. **Do now:** By {31 August}, sow sprouted seed of BRRI dhan33, 57, 66, 71 or 75, or BINA dhan7 or 17. Ask your SAAO for seed.
4. **Do not:** Do not sow on low land that may flood again.
5–7: SH-SPRAY-FLOOD · SH-ASK · SH-FOOT-RULE

BN: (Zoha to translate)
Sources: S_GAIN (USDA GAIN BG2024-0009, 30 Aug 2024: BRRI list, "by August 31", for the 2024 eastern floods; **not universal advice**), S_MOA (high / medium-high land only). Rule D08.

### A5 · TOO_LATE_AMAN
1. **What we see:** You told us the crop is lost. Date: {date}.
2. **How sure and why:** BRRI and DAE advice: Aman planted after mid-September usually fails. The last date was {15 September}.
3. **Do now:** Ask your SAAO about an early winter (Rabi) crop, then Boro, and about seed and flood help.
4. **Do not:** Do not buy Aman seedlings now. Do not plough under living plants before your SAAO sees them.
5–7: SH-SPRAY-FLOOD · SH-ASK · SH-FOOT-RULE

BN: (Zoha to translate)
Sources: S_MOA (no Aman transplanting after 15 Sep in the north or after 20 Sep in the centre and south; early Rabi crops instead), S_GAIN (15 Sep), S_AMAN_GUIDE (31 Bhadra). Rule D12. **This is the card every lost-Aman case shows today (3 Oct 2026).**

### A6 · NOT_SURE_ASK_SAAO
1. **What we see:** Your case is outside what our rules cover. {reason line, see below}
2. **How sure and why:** We will not guess. A wrong answer could cost you your crop.
3. **Do now:** Take photos of the field and the plants. Show them to your SAAO. Keep spare seedlings if you can.
4. **Do not:** Do not plough, replant or spray until you have asked.
5–7: SH-SPRAY-FLOOD · SH-ASK · SH-FOOT-RULE

Reason lines (one short clip each):

| Reason code | Reason line |
|---|---|
| `missing_input` | Some answers are missing. |
| `reproductive_stage_full` / `reproductive_stage_long` | The flood came when the rice was making grain. |
| `haor_out_of_scope` | Haor floods need local advice. |
| `possible_salt_water` | The water may have been salty. |
| `cutoff_grey_zone` | The last planting date is different in different areas. |
| `outlook_unknown` / `partial_loss` / `no_rule` / `not_aman_replant` / `season_date_mismatch` | We cannot tell from these answers. |

BN: (Zoha to translate)
Sources: red-team §3 (route replant/abandon decisions and panicle-stage problems to the SAAO). Rules G01–G07, D02, D06, D07, D11, D99.

### A7 · NOT_SURE_ASK_SAAO, drought variant (`reason = drought`)
1. **What we see:** You told us the Aman crop is in a dry spell.
2. **How sure and why:** We cannot judge the damage from these answers.
3. **Do now:** If you have a pump or a canal, give the field water now. For next season, ask your SAAO about drought-tolerant varieties, like BRRI dhan56 or BRRI dhan71.
4. **Do not:** Do not plough the crop under before your SAAO sees it.
5–7: SH-SPRAY-FLOOD · SH-ASK · SH-FOOT-RULE

BN: (Zoha to translate)
Sources: S_AMAN_GUIDE (supplementary irrigation in a dry spell; drought-prone varieties 56/57/66/71; NEEDS-CHECK, secondary), S_RT_DROUGHT (56 and 71 are drought-tolerant; VERIFIED). See `advisor-rules.md` §6.

---

## 4. Audio clip manifest (for Zoha's recording)

One clip per card body (parts 1–4 read together) plus the shared lines. **Total: 33 clips.** Record in a quiet room, one file per clip, named `<clip_id>.mp3` (mono, short silence at both ends). Generic text = the words actually spoken; values in `{}` appear on screen only.

| Clip ID | Card | Text to record (English source; Zoha speaks the Bangla) |
|---|---|---|
| C1-HEALTHY | C1 | The leaf looks healthy, but we are not certain. The photo shows only one leaf. Problems can hide at the plant base or in the panicle. Walk the field. Check other plants, the base and the panicles. Check again in a week. Do not spray healthy plants. |
| C2-BLAST | C2 | Looks like blast, but we are not certain. It could also be brown spot. Blast spots are pointed at both ends, grey in the centre. To be sure, send a photo of the panicle neck. Keep water in the field. No extra urea. Check again in two to three days. Do not spray before talking to your SAAO. |
| C3-BROWNSPOT | C3 | Looks like brown spot, not certain. Could also be blast, or low zinc or potassium. Brown spots are round, grey in the centre, red-brown at the edge. Poor soil makes it worse. Keep water in the field. Ask your SAAO about a soil test. Check again in two to three days. Do not spray before talking to your SAAO. |
| C4-SHEATH | C4 | Looks like sheath blight, not certain. Could also be stem rot or stem borer. It starts on the stem, near the water. A leaf photo is not enough. Send a photo of the plant base. Pull weeds on the bunds. No extra urea. Check again in two to three days. Do not spray before talking to your SAAO. |
| C5-TUNGRO | C5 | Looks like tungro, but we are not certain. Yellow-orange leaves can also come from low nitrogen or zinc, cold, or salt. Tungro is a virus spread by small green insects. Send a photo of the whole plant. Pull out yellow, stunted plants and bury them. Tell your SAAO soon. Do not use seedlings from a seedbed with yellow plants. |
| C6-BLB | C6 | Looks like bacterial leaf blight, but we are not certain. It could also be leaf streak or leaf scald. A test: put a cut sick leaf in clear water. Cloudy liquid after a few minutes means blight is likely. Drain extra water if you can. Remove weeds and old stubble. Do not add urea until your SAAO says so. |
| C7-SCALD | C7 | Looks like leaf scald, but we are not certain. It could also be bacterial leaf blight. Scald makes light and dark brown bands from the leaf tip. In the clear-water test it gives no cloudy liquid. No extra urea. Remove weeds and old stubble. Check again in two to three days. Do not spray before talking to your SAAO. |
| C8-NOTSURE | C8 | Not sure. This does not look like a rice leaf we know, or the photo is not clear. We will not guess. A wrong answer could cost you money. Take a new photo in daylight: one leaf, close and sharp. Or show the plant to your SAAO. Do not spray or buy anything because of this app. |
| A1-SURVIVE-USUAL | A1 (`usually_survives`) | Here is what you told us. IRRI and Ministry of Agriculture advice: plants like this usually survive. Wait five to seven days after the water goes. Look for new green leaves. Wash mud off the leaves. No fertiliser for about ten days. Do not plough or replant before you check. |
| A1-SURVIVE-UNSURE | A1 (`not_sure`) | Here is what you told us. IRRI and Ministry of Agriculture advice: plants like this may not survive. Wait five to seven days after the water goes. Look for new green leaves. Wash mud off the leaves. No fertiliser for about ten days. Do not plough or replant before you check. |
| A1-BACKUP | A1 (`prepare_backup`) | Keep spare seedlings ready. |
| A2-GAPFILL | A2 | You told us most hills came back, with gaps. Ministry of Agriculture advice: gap filling helps only before the date on the screen. Take extra tillers from healthy hills, keep two or three per hill, and plant them at once with roots. Do not take tillers from yellow or sick plants. |
| A3-REPLANT | A3 | You told us the crop is mostly lost. BRRI and DAE flood advice, 2024: transplant Aman by the date on the screen. Plant a late variety like BR22, BR23, BRRI dhan46 or 54. Use older seedlings, four or five per hill, closer together. Get seedlings from your SAAO, upazila office or BADC. Do not plant after that date. |
| A4-DIRECTSEED | A4 | You told us: crop lost, no seedlings. BRRI advice for the 2024 floods. Only for higher land that will not flood again. By the date on the screen, sow sprouted seed of BRRI dhan33, 57, 66, 71 or 75, or BINA dhan7 or 17. Ask your SAAO for seed. Do not sow on low land that may flood again. |
| A5-TOOLATE | A5 | You told us the crop is lost. BRRI and DAE advice: Aman planted after mid-September usually fails. The last date is on the screen. Ask your SAAO about an early winter crop, then Boro, and about seed and flood help. Do not buy Aman seedlings now. Do not plough under living plants before your SAAO sees them. |
| A6-NOTSURE | A6 | Your case is outside what our rules cover. We will not guess. A wrong answer could cost you your crop. Take photos of the field and the plants. Show them to your SAAO. Keep spare seedlings if you can. Do not plough, replant or spray until you have asked. |
| A6-R-MISSING | A6 reason | Some answers are missing. |
| A6-R-GRAIN | A6 reason | The flood came when the rice was making grain. |
| A6-R-HAOR | A6 reason | Haor floods need local advice. |
| A6-R-SALT | A6 reason | The water may have been salty. |
| A6-R-DATE | A6 reason | The last planting date is different in different areas. |
| A6-R-GENERIC | A6 reason | We cannot tell from these answers. |
| A7-DROUGHT | A7 | You told us the Aman crop is in a dry spell. We cannot judge the damage from these answers. If you have a pump or a canal, give the field water now. For next season, ask your SAAO about drought-tolerant varieties, like BRRI dhan56 or BRRI dhan71. Do not plough the crop under before your SAAO sees it. |
| SH-SPRAY | shared 5 | If spraying is needed: use only a DAE-registered product your SAAO names. Read the label. Wear gloves and a mask. Never use banned products like carbofuran. |
| SH-SPRAY-VIRUS | shared 5 | No spray cures tungro. Spraying for the insects that spread it is your SAAO's decision. Never use banned products like carbofuran. |
| SH-SPRAY-BLB | shared 5 | No spray works well against this disease. Do not buy one for it. Never use banned products like carbofuran. |
| SH-SPRAY-FLOOD | shared 5 | Spraying does not fix flood damage. Spray only if your SAAO tells you to. Never use banned products like carbofuran. |
| SH-ASK | shared 6 | Ask your SAAO at the union agriculture office. Or call one-six-one-two-three, from 8 in the morning to 8 at night. It is closed on Friday, Saturday and holidays. |
| SH-FOOT-PHOTO | shared 7 | This is computer advice from a photo. It can be wrong. It does not replace your agriculture officer. |
| SH-FOOT-RULE | shared 7 | This advice comes from fixed BRRI and DAE rules, not from your field. It can be wrong. You and your agriculture officer decide. |
| UI-CONSENT | hand-off | Do you want to share this with your SAAO? Only this result and your photo are sent. Nothing leaves the phone unless you tap yes. |
| UI-QUEUED | hand-off | Saved. It will be sent to your SAAO when the phone has a connection. |
| UI-OFFLINE-OK | start | The app is ready. It works without internet. |

Play order: body clip (+ A1-BACKUP or an A6 reason clip if needed) → part-5 clip → SH-ASK → footer clip.

## 5. NEEDS-CHECK (cards)

1. Every disease card against BRRI's own pages (Bangladesh Rice Knowledge Bank / "Adhunik Dhaner Chash"). We read only the IRRI fact sheets.
2. Tungro "pull out and bury" and BLB "no effective spray" come from the red-team review; confirm against BRRI.
3. Whether leaf scald is common enough in Bangladesh to keep the class (C7 ships only if the model keeps it).
4. 16123 hours: the official page says 8–8, closed Fri/Sat; the 2024 news says 9–4, open Saturday. Call once to confirm.
5. A3 seedling age (30–45 days) and A7 varieties 57/66: secondary sources (see `advisor-rules.md` §10).
6. UI-CONSENT wording must match the real data flow (photo, GPS stripped) once Omar's sync is built.
