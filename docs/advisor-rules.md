# After-flood advisor: decision rules (DRAFT, needs Zoha + agronomist review)

Drafted Sat 3 Oct 2026. Status: **draft**. Nobody has reviewed these rules for agronomy yet: no SAAO, no BRRI scientist. Say this on stage until someone has.

This advisor is **deliberately not AI**. It is a fixed rule table, evaluated in code, offline. The classifier is the only AI part (see `docs/redteam/README.md` §2).

**How to read the status column**
- **VERIFIED**: we read the claim ourselves in the cited source on 2026-10-03 (BRRI, IRRI, USDA GAIN, a Ministry of Agriculture page or a peer-reviewed paper).
- **NEEDS-CHECK**: the claim comes from a secondary source (news or opinion pieces that repeat BRRI or DAE advice), the year is unclear, the sources disagree, or the threshold is our own judgement. A person has to confirm it before we call it BRRI advice on stage.

**Hard rules for the app (from the red-team report)**
- The app only ever returns one of the six output codes below. It never shows a survival %, a yield figure, a pesticide or a fertiliser dose.
- Every result screen shows the inputs it used, the rule ID, the source and its year, and the date used (**labelled "simulated" in the demo**).
- If any answer is missing or out of range, the result is `NOT_SURE_ASK_SAAO`. The app never guesses a missing input.

---

## 1. Inputs

| Field | Values | Required | Notes |
|---|---|---|---|
| `season` | `aman` · `aus` · `boro` | yes | Full rules exist for Aman only. For Aus and Boro the advisor can only say "wait and check" or "ask SAAO". |
| `variety_type` | `sub1` · `conventional` · `unknown` | yes | Sub1 / submergence-tolerant = BRRI dhan51, BRRI dhan52, BRRI dhan79, BINA dhan11, BINA dhan12 [S_CG_SUB1]. The UI shows these names. "I don't know" is a valid answer (`unknown`). |
| `submergence` | `full` (whole plant under water) · `partial` (leaf tips above water) | yes | |
| `days_under_water` | integer 0–60 | yes | Days the plants were **fully** (or partly) under water. |
| `stage` | `seedbed` · `early_tillering` (seedling, just planted) · `tillering` · `pi_booting` (panicle initiation / booting) · `flowering` · `grain_filling` | yes | The UI shows pictures for each stage. |
| `date` | ISO date | yes | The phone date. **In the demo this is simulated and labelled on screen.** The engine compares the `MM-DD` part only (`md`). |
| `region` | `floodplain` · `haor` · `coastal` · `barind` | yes | |
| `north` | `true` · `false` · missing | no | `true` = Rangpur or Rajshahi division (for example Sirajganj, Gaibandha, Kurigram). `barind` implies north. Only used for the 16–20 Sep window. |
| `salty_water` | `yes` · `no` · `unknown` | coastal only | Was the floodwater salty or tidal? |
| `hills_alive` | `most` · `about_half` · `few` · missing | no | Asked **after** the 5–7 day check, as a second pass. |
| `seedlings_available` | `yes` · `no` · `unknown` | no | Can you get seedlings (own, neighbour, SAAO, BADC)? |

## 2. Outputs (fixed set; nothing else may be returned)

| Code | Meaning for the farmer | Card |
|---|---|---|
| `SURVIVES_CHECK` | Plants usually come back (or may come back). Wait 5–7 days after the water goes and check for new leaves. Param `outlook`: `usually_survives` or `not_sure`; `prepare_backup`: true/false. | `docs/action-cards.md` A1 |
| `GAP_FILL` | Most hills came back; fill the gaps with tillers from healthy hills or spare seedlings, by a deadline. | A2 |
| `REPLANT_SHORT_DURATION` | The crop is lost; transplant again with a late or short-duration variety by a deadline. Params: `varieties`, `deadline`, `seedling_age_days`, `seedlings_per_hill`, `alternatives`. | A3 |
| `DIRECT_SEED` | The crop is lost and there are no seedlings; sow sprouted seed of a short-duration variety on higher land by a deadline. | A4 |
| `TOO_LATE_AMAN` | Too late to plant Aman this year; plan an early Rabi crop or Boro with the SAAO. | A5 |
| `NOT_SURE_ASK_SAAO` | Outside what the rules cover, or an input is missing. Param `reason`. | A6 (+ A7 drought variant) |

## 3. Sources

| ID | Source | Year | URL | What we used | Status |
|---|---|---|---|---|---|
| S_GAIN | USDA FAS GAIN report BG2024-0009 "Grain and Feed Update", Dhaka | 30 Aug 2024 | https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Grain+and+Feed+Update_Dhaka_Bangladesh_BG2024-0009 | "Usually, aman season rice can be transplanted until September 15. If … seedbeds by August 31, 10–15 percent of the aman rice fields can be replanted by September 15." BRRI to advise direct seeding of BRRI dhan33, 57, 66, 71, 75, BINA dhan7, 17 "by August 31". ~200,000 ha Aman lost (eastern floods). | VERIFIED (full text read) |
| S_MOA | Ministry of Agriculture flood notice, published on Krishi Batayon (DAE portal) "বন্যার পরে কৃষকদের করণীয়" | **year not shown** (wording matches the 2024 notices) | http://krishi.gov.bd/content/898 | Wash mud off for 5–7 days; **no fertiliser right after the water goes (plants may rot); after ~10 days, when new leaves appear, top-dress urea + potash** (we show no dose); split 2–3 tillers from unflooded 30–40-day crops for other fields; photoperiod-sensitive varieties BR5, BR22, BR23, BRRI dhan34, 46, 54, Nizersail and local; short BRRI dhan57, 62; **seedbed until 30 Aug**; **late planting 4–5 seedlings per hill, 20×15 cm**; direct-seed sprouted seed on high/medium-high land; **no Aman transplanting after 15 Sep in the north and after 20 Sep in the centre and south (early cold) → early Rabi crops**. | VERIFIED text · NEEDS-CHECK year |
| S_BRRI24 | BRRI leaflet "বন্যায় ক্ষতিগ্রস্ত এলাকায় নাবী আমন ধান চাষ ও পরিচর্যায় জরুরি করণীয়_২০২৪" (urgent steps for late Aman in flood-hit areas, 2024), listed on BRRI's portal | 2024 | http://brri.portal.gov.bd/pages/static-pages/6922e079933eb65569e273d3 | **Primary source we could not open** (the download was blocked from our sandbox). Probably the source of S_MOA's numbers. | NEEDS-CHECK (open it and compare with S_MOA) |
| S_AMAN_GUIDE | "আমন ধানের উৎপাদন বৃদ্ধিতে করণীয়" (secondary copy of BRRI's Aman guide), motshoprani.org | Nov 2024 | https://motshoprani.org/archives/14824 | Late (নাবী) varieties: transplant until **15 Sep (31 Bhadra)** at the latest; seedling age **30–45 days** for late varieties; post-flood late varieties BR22, BR23, BRRI dhan34, 46, 54, Binashail, Nizersail; flood-prone: BRRI dhan51, 52, 79, BINA dhan11, 12; drought-prone: **BRRI dhan56, 57, 66, 71**; give supplementary irrigation in a dry spell. Primary = BRRI "আমন ধানের উৎপাদন বৃদ্ধিতে করণীয়_২০২৩" on the same BRRI page as S_BRRI24. | NEEDS-CHECK (secondary) |
| S_IRRI_CCR | IRRI Rice Knowledge Bank "Climate change-ready rice" | n.d. (accessed 2026-10-03) | http://knowledgebank.irri.org/step-by-step-production/pre-planting/rice-varieties/item/climate-change-ready-rice | "Rice plants normally die within four days of submergence." Sub1 yield advantage after 10–15 days of flooding. | VERIFIED |
| S_CG_SUB1 | IRRI/CGIAR outcome report "Flood-tolerant rice varieties for Bangladesh (sub1)" | n.d. (~2021) | https://cgspace.cgiar.org/server/api/core/bitstreams/9f81047a-c5e1-41b4-9039-ebf77ee1d094/content | Five Sub1 varieties for Aman: BRRI dhan51, 52, 79, BINA dhan11, 12; "can survive at least 7–14 days under water". | VERIFIED · year NEEDS-CHECK |
| S_DHAN51 | Adoption of BRRI dhan51 (Bangladesh J. Political Economy 29(1), citing BRRI 2012) | 2012–13 | https://bea-bd.org/assets/articlesPhoto/VolNo_20230301122926.pdf | BRRI dhan51 "can survive up to 10 to 14 days of complete submergence **at vegetative stage**". | VERIFIED |
| S_DHAN79 | Shalahuddin et al., "Development of Submergence Tolerant Rice Variety BRRI dhan79", Asian J. Research in Crop Science | 2024 | https://journalajrcs.com/index.php/AJRCS/article/view/253 | dhan79 tolerates up to ~3 weeks at vegetative stage; dhan52 ~2 weeks; T. Aman, 140 days. | VERIFIED (we still use 14 days, to be cautious) |
| S_BRRI_RA1617 | BRRI Research Achievement 2016–17 | 2017 | https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-brri/2024/12/e496e53ff7ea484faea0747ad72e79ed.pdf | **BRRI dhan83 = drought-tolerant variety for broadcast (B.) Aus**, ~105 days; "may be cultivated in some selected areas of Barind". | VERIFIED |
| S_BRJ_DHAN83 | Karmakar et al., Bangladesh Rice Journal | 2019 | https://banglajol.info/index.php/BRJ/article/download/48246/34857 | BR6855-3B-12 released 2017 as BRRI dhan83 **for broadcast Aus**. | VERIFIED |
| S_BRRI_RA1718 | BRRI Research Achievement 2017–18 | 2018 | https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-brri/2024/12/eb7051af04884a59a432b49d132b8f0e.pdf | **BRRI dhan87 = T. Aman, 126–128 days** (7 days earlier than dhan49), a replacement for BR11. Medium duration, **normal planting window, not a late-replant variety**. | VERIFIED |
| S_BRRI_RA2021 | BRRI Research Achievement 2020–21 | 2021 | https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-brri/2024/12/9f60fc59529d4c2f96dbf9e18b91e42a.pdf | **BRRI dhan97 and BRRI dhan99 = salinity-tolerant Boro varieties** (152 and 154 days). | VERIFIED |
| S_PLOS_9799 | "Developing climate-resilient rice varieties (BRRI dhan97 and BRRI dhan99)…", PLOS ONE | 2024 | https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0294573 | Same: Boro, coastal saline areas. Released 2020. | VERIFIED |
| S_BRJ_PS | "Photosensitive rice varieties under delayed planting…flood affected T. Aman", Bangladesh Rice Journal | 2020 | https://www.banglajol.info/index.php/BRJ/article/view/46082 | BR22, BR23, BRRI dhan46, BRRI dhan54 suit delayed planting; BRRI dhan54 the most stable when planted late. | VERIFIED |
| S_ALI2015 | Ali, Sarkar & Paul, "Number of seedlings hill⁻¹ … late transplant Aman rice (cv. BR23)", IJASBT | 2015 | https://nepjol.info/index.php/IJASBT/article/download/13978/11516 | BR23 can be transplanted up to the last week of September; 30-day-old seedlings planted 25 Sep; **4–6 seedlings per hill** gave the best yield late. | VERIFIED (one-site trial) |
| S_BARC | BARC Krishi Projukti Hatboi (rice chapter) | year NEEDS-CHECK | https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-barc/2024/12/053a0722429448d4903412ce683a7d06.pdf | Normal Aman seedlings 25–35 days; "If seedlings are dead or hills are missing, re-transplanting should be done within 7–10 days" (normal gap filling); BRRI dhan46 photoperiod-sensitive, late. | VERIFIED text · NEEDS-CHECK year |
| S_RT_DROUGHT | Rice Today (IRRI), "Adoption trend of climate-resilient rice varieties in Bangladesh" | 2022 | https://www.ricetoday.irri.org/adoption-trend-of-climate-resilient-rice-varieties-in-bangladesh/ | BRRI dhan56 and BRRI dhan71 are drought-tolerant, with on-farm yield advantage. | VERIFIED |
| S_OPINION_2024 | Op-ed "বন্যা পরবর্তী কৃষির পুনর্নির্মাণ", amarbanglabd.com | 2024 | http://www.amarbanglabd.com/news/article/opinion/6123 | Repeats the 15 Sep (north) / 20 Sep (centre, south) cut-off; plant late varieties densely with more seedlings per hill. | NEEDS-CHECK (secondary, supports S_MOA only) |

## 4. Rule table (human-readable; the JSON in §7 is the source of truth for code)

Rules are evaluated **top to bottom; the first match wins**. `md` = month-day of `date`.

### 4a. Guards (run first)

| ID | When | Output | Source | Status |
|---|---|---|---|---|
| G01 | Any required input missing or out of range | `NOT_SURE_ASK_SAAO` (`missing_input`) | red-team §3 (pass/fail guardrail) | VERIFIED (design rule) |
| G02 | `season = aman` and `md` ≤ 05-31 (outside the Aman season) | `NOT_SURE_ASK_SAAO` (`season_date_mismatch`) | S_GAIN (season calendar) | VERIFIED |
| G03 | `region = haor` | `NOT_SURE_ASK_SAAO` (`haor_out_of_scope`). Haor flash floods hit Boro near harvest; that decision (harvest early or not) is not in v1. | out of scope | VERIFIED (scope decision) |
| G04 | `region = coastal` and `salty_water` ≠ `no` | `NOT_SURE_ASK_SAAO` (`possible_salt_water`). Salt or tidal damage is not covered. | out of scope | VERIFIED (scope decision) |
| G05 | `stage ∈ {pi_booting, flowering, grain_filling}` and `submergence = full` | `NOT_SURE_ASK_SAAO` (`reproductive_stage_full`). Card says: do not plough under before the SAAO sees it. Sub1 tolerance applies only at the vegetative stage. | S_DHAN51 ("at vegetative stage"), red-team §3 | VERIFIED (vegetative-only) · NEEDS-CHECK (how often a crop recovers) |
| G06 | reproductive stage, `partial`, `days` ≤ 7 | `SURVIVES_CHECK` (`outlook=not_sure`, no backup) | our judgement | NEEDS-CHECK |
| G07 | reproductive stage, `partial`, `days` > 7 | `NOT_SURE_ASK_SAAO` (`reproductive_stage_long`) | our judgement | NEEDS-CHECK |

### 4b. Survival outlook (vegetative stages only: seedbed, early_tillering, tillering)

| ID | When | Outlook | Source | Status |
|---|---|---|---|---|
| O01 | `partial`, `days` ≤ 14 | `likely_survives` | IRRI general physiology; no BD number found | NEEDS-CHECK |
| O02 | `partial`, `days` > 14 | `unknown` | – | NEEDS-CHECK |
| O03 | `full`, `sub1`, `days` ≤ 10 | `likely_survives` | S_CG_SUB1, S_DHAN51 (10–14 d) | VERIFIED |
| O04 | `full`, `sub1`, 11–14 days | `uncertain` | S_CG_SUB1 ("at least 7–14 days"), S_IRRI_CCR | VERIFIED |
| O05 | `full`, `sub1`, ≥ 15 days | `likely_lost` | S_IRRI_CCR, S_DHAN79 (dhan79 may last ~21 d; we stay cautious) | VERIFIED |
| O06 | `full`, `conventional`, `days` ≤ 3 | `likely_survives` | S_IRRI_CCR ("normally die within four days") | VERIFIED |
| O07 | `full`, `conventional`, 4–6 days | `uncertain` | S_IRRI_CCR; red-team said 4–7 | NEEDS-CHECK (clear vs muddy water, depth and temperature change this) |
| O08 | `full`, `conventional`, ≥ 7 days | `likely_lost` | S_IRRI_CCR, S_DHAN51 ("BR11 … completely destroyed") | VERIFIED (direction) · NEEDS-CHECK (exact day) |
| O09 | `full`, `unknown`, `days` ≤ 3 | `likely_survives` | as O06 | VERIFIED |
| O10 | `full`, `unknown`, 4–14 days | `unknown` (might be Sub1, might not) | – | VERIFIED (design rule) |
| O11 | `full`, `unknown`, ≥ 15 days | `likely_lost` | as O05 | VERIFIED |
| O12 | `hills_alive = few` (overrides O01–O11) | `likely_lost` | S_MOA ("fully damaged → re-transplant") | VERIFIED (direction) |

### 4c. Decision (vegetative stages)

| ID | When | Output + params | Source | Status |
|---|---|---|---|---|
| D01 | `hills_alive = most`, `aman`, `md` ≤ 09-15 | `GAP_FILL` (deadline 09-15; split 2–3 tillers from healthy hills or use spare seedlings) | S_MOA (tiller splitting), S_BARC (re-transplant missing hills), S_GAIN (15 Sep) | VERIFIED (method) |
| D02 | `hills_alive ∈ {most, about_half}` (anything else) | `NOT_SURE_ASK_SAAO` (`partial_loss`) | **No BRRI threshold found for gap-fill vs replant.** We do not invent one. | NEEDS-CHECK |
| D03 | outlook `likely_survives` | `SURVIVES_CHECK` (`usually_survives`) | S_MOA (wait, wash mud, fertiliser only after ~10 days and new leaves) | VERIFIED |
| D04 | outlook `uncertain`, `aman`, `md` ≤ 09-15 | `SURVIVES_CHECK` (`not_sure`, `prepare_backup=true`) | as D03 | VERIFIED (action) · NEEDS-CHECK (thresholds) |
| D05 | outlook `uncertain` | `SURVIVES_CHECK` (`not_sure`, no backup) | as D03 | as D04 |
| D06 | outlook `unknown` | `NOT_SURE_ASK_SAAO` (`outlook_unknown`) | – | VERIFIED (design rule) |
| D07 | `likely_lost`, `season ≠ aman` | `NOT_SURE_ASK_SAAO` (`not_aman_replant`) | no Aus/Boro replant rules in v1 | VERIFIED (scope) |
| D08 | `likely_lost`, `md` ≤ 08-31, `seedlings_available = no` | `DIRECT_SEED` (deadline 08-31; BRRI dhan33, 57, 66, 71, 75, BINA dhan7, 17; higher land only) | S_GAIN (2024 eastern floods), S_MOA (high / medium-high land) | VERIFIED (2024 eastern-flood advice; not universal) |
| D09 | `likely_lost`, `md` ≤ 08-31 | `REPLANT_SHORT_DURATION` (seedbed by 08-30, transplant by 09-15; late photoperiod-sensitive BR22, BR23, BRRI dhan34, 46, 54 or local Nizersail; short BRRI dhan57, 62; alternative `DIRECT_SEED`) | S_MOA, S_GAIN, S_BRJ_PS | VERIFIED (S_MOA year NEEDS-CHECK) |
| D10 | `likely_lost`, 09-01 ≤ `md` ≤ 09-15 | `REPLANT_SHORT_DURATION` (no time for own seedbed: get **30–45-day-old** seedlings of a late variety from the SAAO, upazila office, BADC or an unflooded neighbour; **4–5 per hill, 20×15 cm**; deadline 09-15) | S_MOA (4–5/hill, 20×15), S_AMAN_GUIDE (30–45 d), S_ALI2015 (4–6/hill) | VERIFIED (4–5/hill) · NEEDS-CHECK (30–45 d) |
| D11 | `likely_lost`, 09-16 ≤ `md` ≤ 09-20, `region ≠ barind`, `north ≠ true` | `NOT_SURE_ASK_SAAO` (`cutoff_grey_zone`): the centre and south may still plant until 20 Sep, the north may not | S_MOA, S_OPINION_2024 vs S_GAIN, S_AMAN_GUIDE (15 Sep) | NEEDS-CHECK (sources differ) |
| D12 | `likely_lost`, `md` ≥ 09-16 | `TOO_LATE_AMAN` (plan an early Rabi crop or Boro with the SAAO) | S_MOA, S_GAIN, S_AMAN_GUIDE | VERIFIED |
| D99 | anything else | `NOT_SURE_ASK_SAAO` (`no_rule`) | – | VERIFIED (design rule) |

**Note on today (Sat 3 Oct 2026):** every lost Aman crop returns `TOO_LATE_AMAN` today. The replant rules only fire with a **simulated date** (e.g. 2026-08-20), which must be labelled on screen.

## 5. Questions the red team asked us to resolve

| Question | Answer | Status |
|---|---|---|
| Non-Sub1 survival days | IRRI: "Rice plants normally die within four days of submergence." BRRI dhan51 paper: BR11 "can be completely destroyed" by 10–14 days. Rules: ≤3 d usually survives, 4–6 d not sure, ≥7 d usually lost. | 4 days VERIFIED; our 4–6 / 7 split NEEDS-CHECK |
| Sub1 survival days | 10–14 days, **vegetative stage only** (BRRI dhan51 via BRRI 2012; CGIAR "at least 7–14 days"); dhan79 up to ~3 weeks (2024 paper). Rules: ≤10 usually survives, 11–14 not sure, ≥15 usually lost. | VERIFIED |
| BRRI dhan87 timing | T. Aman, **126–128 days**, released 2017 as a replacement for BR11/dhan49. Normal-window variety (transplant 15 Jul–15 Aug), **not** for late replanting. Not in the 2024 flood list. | VERIFIED |
| BRRI dhan83 season | **Broadcast Aus**, drought-tolerant, ~105 days, released 2017; suggested for parts of Barind. Not an Aman replant variety. | VERIFIED |
| BRRI dhan97 / 99 season | **Boro**, salinity-tolerant (coastal), released 2020 (gazette 2021). Not for flood replanting. | VERIFIED |
| Late-Aman replant cut-off | 15 Sep (USDA GAIN citing BRRI 2024; Aman guide "31 Bhadra"). Ministry notice: 15 Sep in the north, 20 Sep in the centre and south. Rules: hard stop after 15 Sep for north/Barind, "ask SAAO" for 16–20 Sep elsewhere, too late after 20 Sep. Seedbed by 30–31 Aug; direct seeding by 31 Aug. | VERIFIED (15 Sep) · NEEDS-CHECK (20 Sep, and which districts count as "north") |
| Seedling age / density for late transplanting | 4–5 seedlings per hill, 20×15 cm (Ministry notice); 4–6 per hill (2015 BR23 trial). Seedling age for late varieties 30–45 days (secondary copy of BRRI's Aman guide; the 2003 BRRI Barisal trial used 45–48-day seedlings after 30 Aug, 3–5 per hill). | per hill VERIFIED · age NEEDS-CHECK |
| Gap-fill vs replant threshold | **No published BRRI or DAE % threshold found.** Ministry advice only says "partly damaged → gap fill / tiller splitting; fully damaged → re-transplant". The app asks `hills_alive` (most / about half / few); only "most" leads to GAP_FILL, "about half" goes to the SAAO. | NEEDS-CHECK (ask a SAAO what they use) |
| Post-flood nitrogen | Ministry notice: **do not apply fertiliser right after the water goes (plants may rot)**; after ~10 days, when new leaves appear, top-dress urea and potash. The app only says "wait about 10 days, then ask your SAAO how much"; **no dose**. Extra urea also raises BLB risk (IRRI BLB fact sheet). One older blog advises urea immediately; we follow the Ministry. | VERIFIED (Ministry page; year NEEDS-CHECK) |

## 6. Drought (short, cautious; text-only in v1)

There is no drought rule engine in v1. If the farmer picks "dry spell" instead of "flood", the app returns `NOT_SURE_ASK_SAAO` with `reason = drought` and shows card A7.

| Situation | What the card says | Source | Status |
|---|---|---|---|
| Aman crop in a dry spell (no rain, field cracking) | Give supplementary irrigation if a pump or canal is available. We cannot judge the damage; ask the SAAO. | S_AMAN_GUIDE ("সম্পূরক সেচ") | NEEDS-CHECK (secondary) |
| Planning next Aman in drought-prone areas (e.g. Barind) | Ask the SAAO about drought-tolerant or short varieties: BRRI dhan56, 57, 66, 71. | S_AMAN_GUIDE, S_RT_DROUGHT (56, 71) | 56/71 VERIFIED · 57/66 NEEDS-CHECK |
| Aus in Barind | BRRI dhan83 (broadcast Aus, drought-tolerant). Mention only if asked; not in the demo. | S_BRRI_RA1617 | VERIFIED |

Do not give irrigation amounts, fertiliser advice for dry soil or yield promises.

## 7. Machine-readable rules (JSON)

The engine contract:
1. Validate the inputs. If a `required` field is missing or invalid, return G01.
2. Compute `md` = `date` as `"MM-DD"`. Compare `md` values as zero-padded strings.
3. Run `guards` top to bottom. The first match wins.
4. If `stage` is vegetative, compute `outlook` from `survival_table` (first match). If `hills_alive = "few"`, set `outlook = "likely_lost"`.
5. Run `rules` top to bottom. The first match wins. If nothing matches, return `fallback`.
6. Show the output card with `params`, the inputs used, the rule `id`, and every `sources[*]` title and year.

Condition operators: `eq`, `ne`, `in`, `not_in`, `lte`, `gte`, `between` (inclusive `[lo, hi]`), `missing` (true = field absent). `ne` is **true when the field is absent** (e.g. `salty_water` missing ≠ `"no"`, so G04 fires); every other operator is false on an absent field. Several fields in one `when` are combined with AND. All 18 test cases in §8 were checked against this JSON with a small Python evaluator on 2026-10-03 (all pass).

```json
{
  "version": "0.1.0-draft",
  "drafted": "2026-10-03",
  "review_status": "DRAFT - not reviewed by an agronomist or SAAO",
  "outputs": ["SURVIVES_CHECK", "GAP_FILL", "REPLANT_SHORT_DURATION", "DIRECT_SEED", "TOO_LATE_AMAN", "NOT_SURE_ASK_SAAO"],
  "inputs": {
    "season": {"type": "enum", "values": ["aman", "aus", "boro"], "required": true},
    "variety_type": {"type": "enum", "values": ["sub1", "conventional", "unknown"], "required": true},
    "submergence": {"type": "enum", "values": ["full", "partial"], "required": true},
    "days_under_water": {"type": "int", "min": 0, "max": 60, "required": true},
    "stage": {"type": "enum", "values": ["seedbed", "early_tillering", "tillering", "pi_booting", "flowering", "grain_filling"], "required": true},
    "date": {"type": "date", "required": true},
    "region": {"type": "enum", "values": ["floodplain", "haor", "coastal", "barind"], "required": true},
    "north": {"type": "bool", "required": false},
    "salty_water": {"type": "enum", "values": ["yes", "no", "unknown"], "required": false},
    "hills_alive": {"type": "enum", "values": ["most", "about_half", "few"], "required": false},
    "seedlings_available": {"type": "enum", "values": ["yes", "no", "unknown"], "required": false}
  },
  "sub1_varieties": ["BRRI dhan51", "BRRI dhan52", "BRRI dhan79", "BINA dhan11", "BINA dhan12"],
  "vegetative_stages": ["seedbed", "early_tillering", "tillering"],
  "guards": [
    {"id": "G01", "when": {"_invalid_or_missing_required": true}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "missing_input"}, "sources": ["S_REDTEAM"], "status": "VERIFIED"},
    {"id": "G02", "when": {"season": {"eq": "aman"}, "md": {"lte": "05-31"}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "season_date_mismatch"}, "sources": ["S_GAIN"], "status": "VERIFIED"},
    {"id": "G03", "when": {"region": {"eq": "haor"}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "haor_out_of_scope"}, "sources": [], "status": "VERIFIED"},
    {"id": "G04", "when": {"region": {"eq": "coastal"}, "salty_water": {"ne": "no"}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "possible_salt_water"}, "sources": [], "status": "VERIFIED"},
    {"id": "G05", "when": {"stage": {"in": ["pi_booting", "flowering", "grain_filling"]}, "submergence": {"eq": "full"}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "reproductive_stage_full"}, "sources": ["S_DHAN51", "S_REDTEAM"], "status": "NEEDS-CHECK"},
    {"id": "G06", "when": {"stage": {"in": ["pi_booting", "flowering", "grain_filling"]}, "submergence": {"eq": "partial"}, "days_under_water": {"lte": 7}}, "output": "SURVIVES_CHECK", "params": {"outlook": "not_sure", "prepare_backup": false, "check_after_days": [5, 7]}, "sources": [], "status": "NEEDS-CHECK"},
    {"id": "G07", "when": {"stage": {"in": ["pi_booting", "flowering", "grain_filling"]}, "submergence": {"eq": "partial"}, "days_under_water": {"gte": 8}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "reproductive_stage_long"}, "sources": [], "status": "NEEDS-CHECK"}
  ],
  "survival_table": [
    {"id": "O01", "when": {"submergence": {"eq": "partial"}, "days_under_water": {"lte": 14}}, "outlook": "likely_survives", "sources": ["S_IRRI_CCR"], "status": "NEEDS-CHECK"},
    {"id": "O02", "when": {"submergence": {"eq": "partial"}, "days_under_water": {"gte": 15}}, "outlook": "unknown", "sources": [], "status": "NEEDS-CHECK"},
    {"id": "O03", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "sub1"}, "days_under_water": {"lte": 10}}, "outlook": "likely_survives", "sources": ["S_CG_SUB1", "S_DHAN51"], "status": "VERIFIED"},
    {"id": "O04", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "sub1"}, "days_under_water": {"between": [11, 14]}}, "outlook": "uncertain", "sources": ["S_CG_SUB1", "S_IRRI_CCR"], "status": "VERIFIED"},
    {"id": "O05", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "sub1"}, "days_under_water": {"gte": 15}}, "outlook": "likely_lost", "sources": ["S_IRRI_CCR", "S_DHAN79"], "status": "VERIFIED"},
    {"id": "O06", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "conventional"}, "days_under_water": {"lte": 3}}, "outlook": "likely_survives", "sources": ["S_IRRI_CCR"], "status": "VERIFIED"},
    {"id": "O07", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "conventional"}, "days_under_water": {"between": [4, 6]}}, "outlook": "uncertain", "sources": ["S_IRRI_CCR"], "status": "NEEDS-CHECK"},
    {"id": "O08", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "conventional"}, "days_under_water": {"gte": 7}}, "outlook": "likely_lost", "sources": ["S_IRRI_CCR", "S_DHAN51"], "status": "NEEDS-CHECK"},
    {"id": "O09", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "unknown"}, "days_under_water": {"lte": 3}}, "outlook": "likely_survives", "sources": ["S_IRRI_CCR"], "status": "VERIFIED"},
    {"id": "O10", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "unknown"}, "days_under_water": {"between": [4, 14]}}, "outlook": "unknown", "sources": [], "status": "VERIFIED"},
    {"id": "O11", "when": {"submergence": {"eq": "full"}, "variety_type": {"eq": "unknown"}, "days_under_water": {"gte": 15}}, "outlook": "likely_lost", "sources": ["S_IRRI_CCR"], "status": "VERIFIED"}
  ],
  "outlook_overrides": [
    {"id": "O12", "when": {"hills_alive": {"eq": "few"}}, "outlook": "likely_lost", "sources": ["S_MOA"], "status": "VERIFIED"}
  ],
  "rules": [
    {"id": "D01", "when": {"hills_alive": {"eq": "most"}, "season": {"eq": "aman"}, "md": {"lte": "09-15"}}, "output": "GAP_FILL",
     "params": {"deadline_md": "09-15", "tillers_to_keep_per_hill": [2, 3], "method": ["split_tillers_from_healthy_hills", "spare_seedlings"]},
     "sources": ["S_MOA", "S_BARC", "S_GAIN"], "status": "VERIFIED"},
    {"id": "D02", "when": {"hills_alive": {"in": ["most", "about_half"]}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "partial_loss"}, "sources": [], "status": "NEEDS-CHECK"},
    {"id": "D03", "when": {"outlook": {"eq": "likely_survives"}}, "output": "SURVIVES_CHECK",
     "params": {"outlook": "usually_survives", "prepare_backup": false, "check_after_days": [5, 7], "fertiliser_wait_days": 10},
     "sources": ["S_MOA", "S_IRRI_CCR"], "status": "VERIFIED"},
    {"id": "D04", "when": {"outlook": {"eq": "uncertain"}, "season": {"eq": "aman"}, "md": {"lte": "09-15"}}, "output": "SURVIVES_CHECK",
     "params": {"outlook": "not_sure", "prepare_backup": true, "check_after_days": [5, 7], "fertiliser_wait_days": 10},
     "sources": ["S_MOA", "S_IRRI_CCR"], "status": "NEEDS-CHECK"},
    {"id": "D05", "when": {"outlook": {"eq": "uncertain"}}, "output": "SURVIVES_CHECK",
     "params": {"outlook": "not_sure", "prepare_backup": false, "check_after_days": [5, 7], "fertiliser_wait_days": 10},
     "sources": ["S_MOA", "S_IRRI_CCR"], "status": "NEEDS-CHECK"},
    {"id": "D06", "when": {"outlook": {"eq": "unknown"}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "outlook_unknown"}, "sources": [], "status": "VERIFIED"},
    {"id": "D07", "when": {"outlook": {"eq": "likely_lost"}, "season": {"ne": "aman"}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "not_aman_replant"}, "sources": [], "status": "VERIFIED"},
    {"id": "D08", "when": {"outlook": {"eq": "likely_lost"}, "md": {"lte": "08-31"}, "seedlings_available": {"eq": "no"}}, "output": "DIRECT_SEED",
     "params": {"deadline_md": "08-31", "varieties": ["BRRI dhan33", "BRRI dhan57", "BRRI dhan66", "BRRI dhan71", "BRRI dhan75", "BINA dhan7", "BINA dhan17"], "land": "high_or_medium_high_only", "advice_origin": "BRRI advice for the Aug 2024 eastern floods"},
     "sources": ["S_GAIN", "S_MOA"], "status": "VERIFIED"},
    {"id": "D09", "when": {"outlook": {"eq": "likely_lost"}, "md": {"lte": "08-31"}}, "output": "REPLANT_SHORT_DURATION",
     "params": {"seedbed_deadline_md": "08-30", "deadline_md": "09-15", "varieties_late": ["BR22", "BR23", "BRRI dhan34", "BRRI dhan46", "BRRI dhan54", "Nizersail (local)"], "varieties_short": ["BRRI dhan57", "BRRI dhan62"], "seedlings_per_hill": [4, 5], "spacing_cm": [20, 15], "seedling_sources": ["SAAO", "upazila agriculture office", "BADC", "unflooded neighbour"], "alternatives": ["DIRECT_SEED"]},
     "sources": ["S_MOA", "S_GAIN", "S_BRJ_PS"], "status": "VERIFIED"},
    {"id": "D10", "when": {"outlook": {"eq": "likely_lost"}, "md": {"between": ["09-01", "09-15"]}}, "output": "REPLANT_SHORT_DURATION",
     "params": {"deadline_md": "09-15", "own_seedbed": false, "varieties_late": ["BR22", "BR23", "BRRI dhan46", "BRRI dhan54"], "seedling_age_days": [30, 45], "seedlings_per_hill": [4, 5], "spacing_cm": [20, 15], "seedling_sources": ["SAAO", "upazila agriculture office", "BADC", "unflooded neighbour"], "alternatives": []},
     "sources": ["S_MOA", "S_AMAN_GUIDE", "S_ALI2015", "S_GAIN"], "status": "NEEDS-CHECK"},
    {"id": "D11", "when": {"outlook": {"eq": "likely_lost"}, "md": {"between": ["09-16", "09-20"]}, "region": {"ne": "barind"}, "north": {"ne": true}}, "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "cutoff_grey_zone"}, "sources": ["S_MOA", "S_GAIN"], "status": "NEEDS-CHECK"},
    {"id": "D12", "when": {"outlook": {"eq": "likely_lost"}, "md": {"gte": "09-16"}}, "output": "TOO_LATE_AMAN",
     "params": {"cutoff_md": "09-15", "cutoff_md_centre_south": "09-20", "next": ["early_rabi_crop", "boro"]},
     "sources": ["S_MOA", "S_GAIN", "S_AMAN_GUIDE"], "status": "VERIFIED"}
  ],
  "fallback": {"id": "D99", "output": "NOT_SURE_ASK_SAAO", "params": {"reason": "no_rule"}},
  "sources": {
    "S_REDTEAM": {"title": "Team red-team review, docs/redteam/README.md", "year": 2026, "url": "docs/redteam/README.md"},
    "S_GAIN": {"title": "USDA FAS GAIN BG2024-0009 Grain and Feed Update (citing BRRI)", "year": 2024, "url": "https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Grain+and+Feed+Update_Dhaka_Bangladesh_BG2024-0009"},
    "S_MOA": {"title": "Ministry of Agriculture flood notice (Krishi Batayon)", "year": null, "url": "http://krishi.gov.bd/content/898"},
    "S_BRRI24": {"title": "BRRI: urgent steps for late Aman in flood-affected areas", "year": 2024, "url": "http://brri.portal.gov.bd/pages/static-pages/6922e079933eb65569e273d3"},
    "S_AMAN_GUIDE": {"title": "Aman production guide (secondary copy of BRRI advice)", "year": 2024, "url": "https://motshoprani.org/archives/14824"},
    "S_IRRI_CCR": {"title": "IRRI Rice Knowledge Bank: Climate change-ready rice", "year": null, "url": "http://knowledgebank.irri.org/step-by-step-production/pre-planting/rice-varieties/item/climate-change-ready-rice"},
    "S_CG_SUB1": {"title": "IRRI/CGIAR: Flood-tolerant rice varieties for Bangladesh (Sub1)", "year": null, "url": "https://cgspace.cgiar.org/server/api/core/bitstreams/9f81047a-c5e1-41b4-9039-ebf77ee1d094/content"},
    "S_DHAN51": {"title": "Adoption of BRRI dhan51 (citing BRRI 2012)", "year": 2013, "url": "https://bea-bd.org/assets/articlesPhoto/VolNo_20230301122926.pdf"},
    "S_DHAN79": {"title": "Shalahuddin et al., BRRI dhan79 for flash-flood ecosystems", "year": 2024, "url": "https://journalajrcs.com/index.php/AJRCS/article/view/253"},
    "S_BRJ_PS": {"title": "Photosensitive varieties under delayed planting, Bangladesh Rice Journal", "year": 2020, "url": "https://www.banglajol.info/index.php/BRJ/article/view/46082"},
    "S_ALI2015": {"title": "Ali, Sarkar & Paul, late transplant Aman (BR23), IJASBT", "year": 2015, "url": "https://nepjol.info/index.php/IJASBT/article/download/13978/11516"},
    "S_BARC": {"title": "BARC Krishi Projukti Hatboi, rice chapter", "year": null, "url": "https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-barc/2024/12/053a0722429448d4903412ce683a7d06.pdf"}
  }
}
```

## 8. Test cases

The first 15 are required; T16–T18 are extra. `md` comes from `date`. Inputs not listed are absent. Region is `floodplain` unless stated.

| # | Inputs | Expected | Rule |
|---|---|---|---|
| T01 | aman, conventional, full, 2 d, tillering, 2026-08-20 | `SURVIVES_CHECK` (usually_survives) | D03 |
| T02 | aman, sub1, full, 12 d, tillering, 2026-08-25 | `SURVIVES_CHECK` (not_sure, prepare_backup) | D04 |
| T03 | aman, sub1, full, 8 d, early_tillering, **2026-10-03** | `SURVIVES_CHECK` (usually_survives) | D03 |
| T04 | aman, conventional, full, 9 d, tillering, 2026-08-20 | `REPLANT_SHORT_DURATION` (alt DIRECT_SEED, deadline 09-15) | D09 |
| T05 | as T04 + seedlings_available = no | `DIRECT_SEED` (by 08-31) | D08 |
| T06 | aman, conventional, full, 10 d, tillering, 2026-09-05 | `REPLANT_SHORT_DURATION` (buy 30–45 d seedlings, deadline 09-15) | D10 |
| T07 | aman, conventional, full, 10 d, tillering, **2026-10-03** | `TOO_LATE_AMAN` | D12 |
| T08 | aman, unknown, full, 16 d, tillering, **2026-10-03** | `TOO_LATE_AMAN` | D12 |
| T09 | aman, conventional, full, 5 d, tillering, **2026-10-03**, hills_alive = few | `TOO_LATE_AMAN` | O12 → D12 |
| T10 | aman, conventional, full, 9 d, tillering, 2026-09-18 (north unknown) | `NOT_SURE_ASK_SAAO` (cutoff_grey_zone) | D11 |
| T11 | as T10 but region = barind | `TOO_LATE_AMAN` | D12 |
| T12 | aman, conventional, full, 5 d, tillering, 2026-09-02, hills_alive = most | `GAP_FILL` (by 09-15) | D01 |
| T13 | aman, conventional, full, **days missing**, tillering, 2026-10-03 | `NOT_SURE_ASK_SAAO` (missing_input) | G01 |
| T14 | aman, **variety missing**, full, 3 d, tillering, 2026-10-03 | `NOT_SURE_ASK_SAAO` (missing_input) | G01 |
| T15 | aman, sub1, full, 3 d, flowering, **2026-10-03** | `NOT_SURE_ASK_SAAO` (reproductive_stage_full) | G05 |
| T16 | boro, conventional, full, 3 d, tillering, 2026-04-10, region = haor | `NOT_SURE_ASK_SAAO` (haor_out_of_scope) | G03 |
| T17 | aman, conventional, full, 2 d, tillering, 2026-08-20, region = coastal (salty_water missing) | `NOT_SURE_ASK_SAAO` (possible_salt_water) | G04 |
| T18 | aman, unknown, full, 6 d, tillering, 2026-08-20 | `NOT_SURE_ASK_SAAO` (outlook_unknown) | D06 |

## 9. What these rules do NOT cover (say it on stage)

- Haor flash floods on Boro, salt or tidal surge damage, river erosion, sand casting, and repeated floods (a second flood before recovery).
- Aus and Boro replanting; deepwater and floating rice; local varieties other than Nizersail.
- Water quality (muddy, hot or stagnant water kills plants faster). The day thresholds assume "average" water.
- How much yield a recovered crop gives. Fertiliser doses. Pests and diseases after the flood (the photo classifier and the SAAO cover those).
- Seed or seedling availability, prices and government support. The app only says where to ask.
- Varieties released after 2023 that we have not checked (e.g. newer BRRI or BINA flood-tolerant lines).

## 10. NEEDS-CHECK list (for Zoha + any SAAO or agronomist we reach this weekend)

1. Open the BRRI 2024 late-Aman flood leaflet (S_BRRI24) and confirm the Ministry numbers: seedbed by 30 Aug, 4–5 seedlings per hill, 20×15 cm, 15 Sep (north) / 20 Sep (centre, south).
2. Find the year of the Krishi Batayon notice (S_MOA).
3. Conventional-variety thresholds: "not sure" at 4–6 days and "usually lost" from 7 days.
4. Partial-submergence rules (≤14 days usually survives), and partial submergence at the reproductive stage.
5. Gap-fill vs replant threshold: there is no published number. Ask a SAAO what they use; until then "about half" goes to the SAAO.
6. Seedling age of 30–45 days for late varieties (secondary source only).
7. The 16–20 Sep grey zone, and which districts count as "north".
8. BRRI dhan57 and 66 described as drought-tolerant (secondary; 56 and 71 are verified).
9. Years for S_CG_SUB1 and S_BARC.
