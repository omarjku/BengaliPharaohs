# Rice leaf-health knowledge base (Bangladesh) — DRAFT, needs Zoha review

Drafted Sat 3 Oct 2026 by Claude from IRRI Rice Knowledge Bank fact sheets, BRRI/DAE material and peer-reviewed sources. Feeds `frontend/public/data/knowledge.json`, the cross-check rules (PLAN.md Step 3) and cards C1–C8 (`docs/action-cards.md`).
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
- `irri_salinity` http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/salinity
- `irri_bph` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/insects/item/planthopper
- `irri_stemborer` http://www.knowledgebank.irri.org/training/fact-sheets/pest-management/insects/item/stem-borer
- `irri_cold` http://www.knowledgebank.irri.org/training/fact-sheets/crop-health/abiotic-disorders (NEEDS-CHECK exact page)
- `brri_rkb` http://knowledgebank-brri.org/ (BRRI Rice Knowledge Bank, Bangla; disease and insect pages)
- `dae_ipm` https://dae.gov.bd/ (DAE; pesticide registration and ban list — NEEDS-CHECK exact page)

All IRRI URLs follow the Knowledge Bank pattern; NEEDS-CHECK: open each once before the demo (some may have moved).

---

## 1. Healthy (`healthy`)
- **Looks like:** uniform green leaves, no lesions; old bottom leaves yellowing and drying at maturity is **normal senescence**, not disease.
- **Confusers:** mild N deficiency (pale but no lesions), early blast specks too small for the photo.
- **Separating question:** "Are the oldest leaves at the bottom turning yellow while the crop is near harvest?" (yes → normal).
- **Safe action:** keep scouting weekly. SAAO not needed. Source: `irri_ndef`, `brri_rkb`.

## 2. Blast (`blast`) — fungus *Magnaporthe oryzae* (*Pyricularia oryzae*)
- **Leaf symptoms:** spindle/diamond (eye-shaped) spots, grey-white centre, brown to red-brown border, pointed ends; spots merge and kill leaves. Can also hit leaf collar, node and neck (neck blast → white/empty panicles). Any leaf; often seedling–tillering for leaf blast.
- **Favours:** long leaf wetness/dew, high humidity, **cool nights (~17–24 °C)** with warm days, **high N** fertiliser, upland/aerobic or drought-stressed fields, cloudy weather. In Bangladesh mainly **Boro** (and Aman late-season neck blast); susceptible e.g. BRRI dhan28/29 (neck blast outbreaks in Boro, NEEDS-CHECK which varieties BRRI lists as susceptible).
- **Unlikely if:** hot dry nights; spots without grey centre.
- **Field pattern / speed:** patches that enlarge fast (days) in favourable weather; spread by airborne spores.
- **Confusers:** brown spot (round/oval, brown centre, often with yellow halo, no pointed ends). **Question:** "Do the spots have a grey-white centre with pointed ends like an eye?"
- **Safe action:** do not add more urea; keep field flooded if possible (blast is worse in dry soil); remove heavily infected seedlings. Fungicide only a DAE-registered product via SAAO. **SAAO:** any spraying; any panicle/neck symptoms. Source: `irri_blast`, `brri_rkb`.

## 3. Brown spot (`brown_spot`) — fungus *Bipolaris oryzae* (*Cochliobolus miyabeanus*)
- **Leaf symptoms:** small round to oval brown spots, often grey/whitish centre in larger spots, reddish-brown margin, sometimes yellow halo; many spots per leaf; also on seeds (discoloured grain).
- **Favours:** **nutrient-poor or stressed soil** (low N, K, Si, Zn; sandy/acid), drought stress, high humidity (>~89%), temps ~25–30 °C. "Poor farmer's disease". All seasons; often Aus/Aman on poor soils.
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
- **Favours:** green leafhoppers present, staggered planting, early growth stage (infection <~45 days most damaging), susceptible varieties; **Aman** more often in Bangladesh (NEEDS-CHECK; also Boro outbreaks reported).
- **Unlikely if:** no leafhoppers ever seen AND uniform yellowing over the whole field (→ N/S deficiency).
- **Field pattern:** **scattered hills or patches** of stunted orange plants among healthy ones; spreads in weeks with vector.
- **Confusers:** N deficiency (whole field, oldest leaves first), S deficiency (whole field, young leaves pale), Zn deficiency (early, brown blotches), cold injury, salt. **Question:** "Are only some hills yellow-orange and short, and have you seen small green jumping insects?"
- **Safe action:** no cure. Pull and bury infected hills early, control weeds/volunteer rice, synchronous planting next season. **SAAO:** always (vector control decision). Source: `irri_tungro`.

## 6. Bacterial leaf blight (`blb`) — bacterium *Xanthomonas oryzae* pv. *oryzae*
- **Symptoms:** water-soaked stripes from **leaf tip and edges** turning yellow then straw/grey-white, **wavy margin** advancing down the leaf; bacterial ooze droplets in the morning; "kresek" (whole seedling wilting) in young plants.
- **Favours:** **storm/strong wind and rain**, **flooding**, wounds, **high N**, warm (25–34 °C) humid weather; **Aman** in Bangladesh (also Boro). Spread by irrigation/flood water, rain splash.
- **Field pattern:** patches enlarging along water flow/wind direction; can spread quickly after storms.
- **Confusers:** BLS (narrow interveinal stripes, translucent, not starting at the edge), leaf scald (zonate bands from tip), K deficiency (old leaf tips brown, no wavy edge), drought leaf-tip drying. **Question:** "Did the yellow start at the leaf tip and edge, after a storm or flood?"
- **Safe action:** no effective chemical; drain field if possible, do not add urea, avoid moving water from infected to healthy fields, destroy stubble after harvest, resistant varieties next season. **SAAO:** confirm. Source: `irri_blb`.

## 7. Leaf scald (`leaf_scald`) — fungus *Microdochium oryzae* (*Monographella albescens*)
- **Symptoms:** **zonate** lesions from the **leaf tip or edge**, alternating light tan and dark brown bands (wavy rings), large oblong scalded areas; mature leaves.
- **Favours:** high N, high humidity, wet weather, close spacing; reported more in upland/rainfed. Prevalence in Bangladesh: NEEDS-CHECK (C7 may be dropped).
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
"Deadheart" (central shoot dies at vegetative stage) and "whitehead" (white empty panicle at reproductive stage); pulls out easily; small holes in the stem. Not a leaf-spot problem → base/panicle guard. Carbofuran is **banned** in Bangladesh — never recommend (NEEDS-CHECK ban year/scope via DAE). Light traps / perching sticks; SAAO. Source: `irri_stemborer`.

### Cold injury (`cold`)
Boro seedbed/early tillering in Dec–Jan cold spells (night <~15 °C): yellowing/whitish leaves, slow growth, seedling death; at booting → sterility. **Whole seedbed/field uniform**, after a cold spell. Q: "Were there several very cold nights just before this?" Source: `irri_cold`, `brri_rkb`.

### Salt injury (`salt`)
Coastal south-west/south (Satkhira, Khulna, Bagerhat, Patuakhali…), Boro late season and after tidal surge: **leaf tips white/burnt**, then whole leaf, stunting, patchy where salt water entered. Q: "Did salty water (tidal/surge) enter the field, or are you in a coastal district?" Salt-tolerant varieties (e.g. BRRI dhan67, NEEDS-CHECK). Source: `irri_salinity`.

### Iron toxicity (`fe_tox`)
Tiny brown spots from leaf tips of old leaves, coalescing → **orange-brown/bronze** leaves; poorly drained, acid, waterlogged soils; orange film on water. Q: "Is there an oily orange film on the field water?" Source: `irri_fetox`.

---

## Always to the SAAO
Any spraying; suspected tungro, BPH, sheath blight, neck blast, khaira dosing; salt/flood replant decisions; anything on sheath/panicle/base; poisoning → doctor. 16123 = 08:00–20:00, closed Fri, Sat, govt holidays.

## NEEDS-CHECK
1. All IRRI URLs resolve (pattern-based; open each).
2. BRRI-listed blast-susceptible varieties (BRRI dhan28/29 neck blast).
3. Tungro season emphasis in BD (Aman vs Boro).
4. Leaf scald prevalence in BD (keep C7?).
5. Carbofuran ban year/scope (DAE list page).
6. Salt-tolerant variety names (BRRI dhan67 etc.).
7. Cold-injury threshold and IRRI page.
8. Blast night-temp range 17–24 °C (IRRI says cool nights; check figure).
9. Brown spot humidity figure (>89%).
