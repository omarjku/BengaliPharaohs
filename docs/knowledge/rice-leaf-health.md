# Rice leaf-health knowledge base (Bangladesh) — DRAFT, needs Zoha review

Drafted Sat 3 Oct 2026 by Claude from memory, then **fact-checked 3 Oct 2026** by web search (tags: VERIFIED / CORRECTED / NEEDS-CHECK). Caveat: knowledgebank.irri.org is blocked from the build sandbox, so IRRI pages were confirmed via search listings and snippets, not opened; open each once on a normal connection. Feeds `frontend/public/data/knowledge.json`, the cross-check rules (PLAN.md Step 3) and cards C1–C8 (`docs/action-cards.md`).
Rules: no pesticide names or doses; carbofuran mentioned only as **banned**. Any spraying → SAAO. `NEEDS-CHECK` = not verified against a Bangladesh source; see list at the end.

Seasons: **Aus** (Mar/Apr–Jul/Aug, pre-monsoon), **Aman** (Jun/Jul–Nov/Dec, monsoon, flood-exposed), **Boro** (Dec/Jan–Apr/May, dry, irrigated, cold nights at seedling/early tillering).

Source ids (used in knowledge.json):
- `irri_blast` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/blast-leaf-collar
- `irri_brownspot` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/brown-spot
- `irri_sheathblight` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/sheath-blight
- `irri_tungro` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/tungro
- `irri_blb` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/bacterial-blight
- `irri_bls` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/bacterial-leaf-streak
- `irri_scald` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/leaf-scald
- `irri_ndef` http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/nitrogen-deficiency
- `irri_kdef` http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/potassium-deficiency
- `irri_zndef` http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/zinc-deficiency
- `irri_sdef` http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/sulfur-deficiency
- `irri_fetox` http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/iron-toxicity
- `irri_salinity` http://www.knowledgebank.irri.org/decision-tools/rice-doctor/rice-doctor-fact-sheets/item/salinity (CORRECTED: it is a Rice Doctor fact sheet, not under deficiencies-and-toxicities)
- `irri_bph` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/insects/item/planthopper
- `irri_stemborer` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/insects/item/stem-borer
- `irri_cold` https://onlinelibrary.wiley.com/doi/full/10.1002/fes3.25 (CORRECTED: Cruz & Milach 2013 review; the old IRRI abiotic-disorders URL was unverified and dropped)
- `bd_cold_review` https://www.researchgate.net/publication/326355540_Cold_Injury_and_Flash_Flood_Damage_in_Boro_Rice_Cultivation_in_Bangladesh_A_Review
- `irri_blast_neck` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/diseases/item/blast-node-neck (VERIFIED)
- `bd_blast_varieties` https://www.dhakatribune.com/bangladesh/268683/mega-rice-varieties-becoming-less-productive-pest · `bd_blast_resistance` https://zenodo.org/records/10398279
- `bd_salt_varieties` https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10810675/ (BRRI dhan97/99 paper)
- `bd_carbofuran_ban` https://businesspostbd.com/front/govt-bans-harmful-carbofuran-pesticides-2023-01-21 · `bd_carbofuran_enforcement` https://www.thedailystar.net/news/bangladesh/crime-justice/news/carbofuran-toxic-tale-3534321
- `brri_rkb` http://knowledgebank-brri.org/photo-rice-diseases/ (BRRI Rice Knowledge Bank disease photos; VERIFIED in search; site returns 403 to scripted fetch)
- `dae_ipm` https://dae.gov.bd/ (DAE homepage only; NEEDS-CHECK exact ban-list page; for the carbofuran ban use `bd_carbofuran_ban`)

URL status: VERIFIED to exist in search listings (title + URL): blast-leaf-collar, blast-node-neck, brown-spot, sheath-blight, tungro, bacterial-blight (also a Rice Doctor copy), bacterial-leaf-streak, leaf-scald, nitrogen/sulfur/zinc deficiency, iron-toxicity, planthopper, salinity (Rice Doctor path). NEEDS-CHECK (not seen in results): `irri_kdef`, `irri_stemborer`, `dae_ipm`.

---

## 1. Healthy (`healthy`)
- **Looks like:** uniform green leaves, no lesions; old bottom leaves yellowing and drying at maturity is **normal senescence**, not disease.
- **Confusers:** mild N deficiency (pale but no lesions), early blast specks too small for the photo.
- **Separating question:** "Are the oldest leaves at the bottom turning yellow while the crop is near harvest?" (yes → normal).
- **Safe action:** keep scouting weekly. SAAO not needed. Source: `irri_ndef`, `brri_rkb`.

## 2. Blast (`blast`) — fungus *Magnaporthe oryzae* (*Pyricularia oryzae*)
- **Leaf symptoms:** spindle/diamond (eye-shaped) spots, grey-white centre, brown to red-brown border, pointed ends; spots merge and kill leaves. Can also hit leaf collar, node and neck (neck blast → white/empty panicles). Any leaf; often seedling–tillering for leaf blast.
- **Favours:** long leaf wetness/dew, high humidity, **cool nights (~15–20 °C), RH ~93–99%, long dew duration, cloudy weather** (CORRECTED from 17–24 °C; IRRI leaf-collar fact sheet via search snippet), **high N** fertiliser, upland/aerobic or drought-stressed fields, cloudy weather. In Bangladesh mainly **Boro** (and Aman late-season neck blast). VERIFIED: BRRI dhan28 and dhan29 (≈70% of Boro area) are blast-susceptible, dhan29 notably neck blast; Boro blast incidence reported 39.8% in dhan29 and 20.3% in dhan28; aromatic varieties also vulnerable (`bd_blast_varieties`, `bd_blast_resistance`). Newer dhan88/89/92 are described as less susceptible (news report only; NEEDS-CHECK before naming on stage).
- **Unlikely if:** hot dry nights; spots without grey centre.
- **Field pattern / speed:** patches that enlarge fast (days) in favourable weather; spread by airborne spores.
- **Confusers:** brown spot (round/oval, brown centre, often with yellow halo, no pointed ends). **Question:** "Do the spots have a grey-white centre with pointed ends like an eye?"
- **Safe action:** do not add more urea; keep field flooded if possible (blast is worse in dry soil); remove heavily infected seedlings. Fungicide only a DAE-registered product via SAAO. **SAAO:** any spraying; any panicle/neck symptoms. Source: `irri_blast`, `brri_rkb`.

## 3. Brown spot (`brown_spot`) — fungus *Bipolaris oryzae* (*Cochliobolus miyabeanus*)
- **Leaf symptoms:** small round to oval brown spots, often grey/whitish centre in larger spots, reddish-brown margin, sometimes yellow halo; many spots per leaf; also on seeds (discoloured grain).
- **Favours:** **nutrient-poor or stressed soil** (low N, K, Si, Zn; sandy/acid), drought stress, high humidity (CORRECTED: IRRI gives RH 86–100% and 16–36 °C; the ">89%" and "25–30 °C" figures were unsourced). "Poor farmer's disease". All seasons; often Aus/Aman on poor soils.
- **Unlikely if:** recently well-fertilised with high N (it is more a low-input disease).
- **Field pattern:** fairly uniform across poor parts of the field; slower spread than blast.
- **Confusers:** blast (eye-shaped), K deficiency (brown spots/necrosis on old leaf tips and margins), Zn deficiency (khaira, brown blotches on younger leaves early). **Question:** "Are the spots round and spread over the whole leaf, or mainly on leaf tips and edges of old leaves?"
- **Safe action:** balanced fertiliser (ask SAAO for soil-based dose), avoid drought stress, use clean seed next season. Source: `irri_brownspot`.

## 4. Sheath blight (`sheath_blight`) — fungus *Rhizoctonia solani*
- **Symptoms:** oval/irregular greenish-grey to white lesions with brown border **on the sheath near the water line**, later on leaves ("snake-skin" pattern); sclerotia (small brown balls).
- **Favours:** **high N**, dense planting, high humidity, warm temps (~28–32 °C), tillering to heading (canopy closed); Aman and Boro. Inoculum survives in soil/stubble; floodwater carries sclerotia.
- **Field pattern:** circular patches starting from where water carried sclerotia, spreading plant to plant.
- **Leaf photo limitation:** the key sign is on the **sheath** → symptom_sheath = location guard; ask for sheath photo.
- **Confusers:** stem rot, sheath rot (on flag-leaf sheath at booting). **Question:** "Are the first spots on the stem near the water?"
- **Safe action:** no extra urea, open canopy (wider spacing next season), remove weeds, drain briefly if SAAO agrees. Fungicide only via SAAO. Source: `irri_sheathblight`.

## 5. Tungro (`tungro`) — virus complex (RTBV + RTSV), vector **green leafhopper** (*Nephotettix virescens*)
- **Symptoms:** yellow to **orange-yellow** leaves starting from the tip of **younger leaves**, stunting, fewer tillers, leaves slightly twisted; mottling.
- **Favours:** green leafhoppers present, staggered planting, early growth stage (infection <~45 days most damaging), susceptible varieties; **Season in BD: NEEDS-CHECK.** BD tungro management trials run in Aus, T. Aman and Boro alike; reported damage cases are Aman (e.g. Rangpur 2022). Say "all seasons, Aman most reported", do not claim Aman-only.
- **Unlikely if:** no leafhoppers ever seen AND uniform yellowing over the whole field (→ N/S deficiency).
- **Field pattern:** **scattered hills or patches** of stunted orange plants among healthy ones; spreads in weeks with vector.
- **Confusers:** N deficiency (whole field, oldest leaves first), S deficiency (whole field, young leaves pale), Zn deficiency (early, brown blotches), cold injury, salt. **Question:** "Are only some hills yellow-orange and short, and have you seen small green jumping insects?"
- **Safe action:** no cure. Pull and bury infected hills early, control weeds/volunteer rice, synchronous planting next season. **SAAO:** always (vector control decision). Source: `irri_tungro`.

## 6. Bacterial leaf blight (`blb`) — bacterium *Xanthomonas oryzae* pv. *oryzae*
- **Symptoms:** water-soaked stripes from **leaf tip and edges** turning yellow then straw/grey-white, **wavy margin** advancing down the leaf; bacterial ooze droplets in the morning; "kresek" (whole seedling wilting) in young plants.
- **Favours:** **storm/strong wind and rain**, **flooding**, wounds, **high N**, warm (25–34 °C, RH >70%: VERIFIED, IRRI) humid weather; **Aman** in Bangladesh (also Boro). Spread by irrigation/flood water, rain splash.
- **Field pattern:** patches enlarging along water flow/wind direction; can spread quickly after storms.
- **Confusers:** BLS (narrow interveinal stripes, translucent, not starting at the edge), leaf scald (zonate bands from tip), K deficiency (old leaf tips brown, no wavy edge), drought leaf-tip drying. **Question:** "Did the yellow start at the leaf tip and edge, after a storm or flood?"
- **Safe action:** no effective chemical; drain field if possible, do not add urea, avoid moving water from infected to healthy fields, destroy stubble after harvest, resistant varieties next season. **SAAO:** confirm. Source: `irri_blb`.

## 7. Leaf scald (`leaf_scald`) — fungus *Microdochium oryzae* (*Monographella albescens*)
- **Symptoms:** **zonate** lesions from the **leaf tip or edge**, alternating light tan and dark brown bands (wavy rings), large oblong scalded areas; mature leaves.
- **Favours:** high N, high humidity, wet weather, close spacing; late season on mature leaves, wounded leaves, infected seed/stubble. IRRI: occurs in upland, rainfed, irrigated and mangrove areas (CORRECTED: not only upland). Bangladesh: reported as a (new) disease there and listed in CABI distribution, but no prevalence data found, so treat as minor/uncommon: **NEEDS-CHECK** (keep C7 low priority, no frequency claims).
- **Confusers:** BLB (no zonate bands, wavy yellow margin). **Question:** "Do you see rings or bands of light and dark brown in the dried part?"
- **Safe action:** avoid high N; SAAO if spreading. Source: `irri_scald`.

---

## Look-alikes (not classifier classes; route to "not sure" + question + SAAO)

### Bacterial leaf streak (`bls`) — *X. oryzae* pv. *oryzicola*
Narrow, dark-green water-soaked **interveinal streaks**, translucent against light, turn yellow-orange-brown, amber ooze beads. Wind/rain, warm humid; Aman. **Q vs BLB:** "Are the lines thin and between the veins, see-through against the sun?" Source: `irri_bls`.

### Nitrogen deficiency (`n_def`)
**Oldest leaves first**, whole leaf pale yellow-green, **uniform over the whole field**, plants short with few tillers. Poor soil, no/late urea, flood leaching. **Q vs tungro:** "Is the whole field evenly pale, starting from old bottom leaves?" Action: urea per SAAO advice. Source: `irri_ndef`.

### Potassium deficiency (`k_def`)
**Old leaves**: yellow-brown **leaf tips and margins**, dark brown necrotic spots, droopy; more disease. Sandy/light soils, high-N-only fertilising. Confuses with brown spot/BLB. Source: `irri_kdef`.

### Zinc deficiency — **khaira** (`zn_def`)
2–4 weeks after transplanting, **young/middle leaves**: dusty brown blotches/streaks, midrib whitish base, stunted uneven growth; continuously flooded, alkaline/calcareous or high-organic soils; very common in Bangladesh **Boro** (named "khaira" in BD literature). Action: SAAO (zinc sulphate application is standard DAE advice; dose via SAAO). Source: `irri_zndef`, `brri_rkb`.

### Sulphur deficiency (`s_def`)
Like N deficiency but **young leaves** pale first; whole field. Source: `irri_sdef`.

### BPH hopperburn (`bph`) — brown planthopper *Nilaparvata lugens*
**Circular patches** of plants turning yellow → brown and drying ("hopperburn"), lodging; **many brown hoppers at the plant base** near water. High N, dense planting, overuse of broad-spectrum insecticides (resurgence); late Aman and Boro (heading). **Q:** "Tap the plant base: do many small brown insects jump onto the water?" Action: drain/alternate wetting, **do not spray broad-spectrum insecticide** (makes it worse), SAAO immediately. Location guard (base). Source: `irri_bph`.

### Stem borer (`stem_borer`)
"Deadheart" (central shoot dies at vegetative stage) and "whitehead" (white empty panicle at reproductive stage); pulls out easily; small holes in the stem. Not a leaf-spot problem → base/panicle guard. Carbofuran is **banned** in Bangladesh (CORRECTED/VERIFIED: ban announced Jan 2023 by DAE, in force from 30 Jun 2023, stock-clearance deadline extended to 30 Oct 2023; still sold openly per Daily Star, so enforcement is weak) — never recommend. Sources `bd_carbofuran_ban`, `bd_carbofuran_enforcement`. Exact DAE order page: NEEDS-CHECK. Light traps / perching sticks; SAAO. Source: `irri_stemborer`.

### Cold injury (`cold`)
Boro seedbed/early tillering in Dec–Jan cold spells (CORRECTED/qualified: damage to germination, emergence and seedlings is reported below ~15 °C, with chlorosis/stunting/fewer tillers at 15–20 °C; lower threshold for vegetative damage ~10–13 °C; reproductive stage is more sensitive at ~18–20 °C. Use "~15 °C" as the seedling rule of thumb, not a hard threshold; BD January minima can fall below 10 °C): yellowing/whitish leaves, slow growth, seedling death; at booting → sterility. **Whole seedbed/field uniform**, after a cold spell. Q: "Were there several very cold nights just before this?" Source: `irri_cold`, `bd_cold_review`.

### Salt injury (`salt`)
Coastal south-west/south (Satkhira, Khulna, Bagerhat, Patuakhali…), Boro late season and after tidal surge: **leaf tips white/burnt**, then whole leaf, stunting, patchy where salt water entered. Q: "Did salty water (tidal/surge) enter the field, or are you in a coastal district?" IRRI: leaf tips turn white/pale, stunting, patchy field (VERIFIED). Salt-tolerant BRRI varieties VERIFIED: dhan47 (Boro), dhan61, dhan67, dhan97 and dhan99 (dhan97 more tolerant than dhan67; seedlings to ~14 dS/m, 8–10 dS/m through growth; `bd_salt_varieties`). Source: `irri_salinity`.

### Iron toxicity (`fe_tox`)
Tiny brown spots from leaf tips of old leaves, coalescing → **orange-brown/bronze** leaves; poorly drained, acid, waterlogged soils; orange film on water. Q: "Is there an oily orange film on the field water?" Source: `irri_fetox`.

---

## Always to the SAAO
Any spraying; suspected tungro, BPH, sheath blight, neck blast, khaira dosing; salt/flood replant decisions; anything on sheath/panicle/base; poisoning → doctor. 16123 = 08:00–20:00, closed Fri, Sat, govt holidays.

## Fact-check results (3 Oct 2026)
1. IRRI URLs: all but `irri_kdef`, `irri_stemborer`, `dae_ipm` seen in search listings; pages not opened (sandbox blocks the host). Salinity and cold URLs CORRECTED.
2. Blast-susceptible varieties: VERIFIED BRRI dhan28/29 (dhan29 neck blast).
3. Tungro season: NEEDS-CHECK (all seasons; Aman most reported).
4. Leaf scald prevalence in BD: NEEDS-CHECK (present, no frequency data; keep low priority).
5. Carbofuran: VERIFIED 2023 (from 30 Jun 2023; stock deadline 30 Oct 2023); DAE order page NEEDS-CHECK.
6. Salt-tolerant varieties: VERIFIED dhan47/61/67/97/99.
7. Cold: CORRECTED to ~15 °C rule of thumb with ranges above.
8. Blast night temp: CORRECTED to ~15–20 °C, RH 93–99%.
9. Brown spot: CORRECTED to RH 86–100%, 16–36 °C.
10. Unchecked (draft from memory, plausible but unsourced here): sheath blight 28–32 °C, BPH/BLS/zinc/iron/N/K/S symptom details, khaira onset 2–4 weeks, 16123 hotline hours, women-labour statistic elsewhere.
