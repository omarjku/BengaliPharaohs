# Cross-check test cases (DRAFT) — PLAN.md Step 3

Engine contract: rules only (a) keep top-1, (b) swap to top-2, (c) move to NOT_SURE (C8 + question), or (d) location guard (leaf-photo-can't-show card + SAAO). Never a class outside top-2. Proposed thresholds (Omar to set): swap only if top-2 p ≥ 0.25 and top-2 has ≥2 more supporting conditions than top-1 with top-1 having ≥1 `unlikely_if`; NOT_SURE if top-1 p < model threshold, or both top-2 have conflicts, or context points to a look-alike.

| # | Top-1 (p) | Top-2 (p) | Context | Expected | Why |
|---|---|---|---|---|---|
| X01 | blb 0.82 | bls 0.05 | storm_recent, flooded_recent, urea_high, symptom_tip_edge, season_aman | keep blb (C6) | all favours |
| X02 | blast 0.55 | brown_spot 0.38 | urea_none, field_dry, pattern_whole_field | swap → brown_spot (C3) + ask q_eye_shaped_grey_centre | brown_spot favours; blast has none |
| X03 | brown_spot 0.52 | blast 0.40 | cold_nights, urea_high, season_boro, stage_tillering | swap → blast (C2) | brown_spot unlikely_if urea_high; blast 4 favours |
| X04 | tungro 0.61 | healthy 0.20 | pattern_whole_field, old_leaves_first, no insects | NOT_SURE (C8) + q_whole_field_old_leaves | tungro conflicts; n_def look-alike not a class |
| X05 | tungro 0.70 | blb 0.15 | insects_leafhoppers, pattern_patches, new_leaves_first, stage_tillering | keep tungro (C5) + SAAO | consistent |
| X06 | sheath_blight 0.66 | blast 0.20 | symptom_sheath | location guard + SAAO, ask sheath photo | sheath answer |
| X07 | blast 0.74 | brown_spot 0.12 | symptom_panicle | location guard (neck blast possible) | panicle answer |
| X08 | healthy 0.58 | tungro 0.30 | insects_hoppers_base, pattern_patches | location guard (base) → BPH card path + SAAO | base hoppers = bph, not leaf |
| X09 | blb 0.48 | leaf_scald 0.42 | rain_heavy_7d, urea_high, symptom_tip_edge | NOT_SURE + q_zonate_bands | both supported, close probs |
| X10 | tungro 0.50 | brown_spot 0.30 | cold_nights, season_boro, stage_seedling, pattern_whole_field | NOT_SURE + q_cold_spell | tungro unlikely_if cold_nights; cold look-alike |
| X11 | blb 0.60 | healthy 0.25 | region_coastal, salt_water, symptom_tip_edge | NOT_SURE + q_salty_water | salt look-alike |
| X12 | brown_spot 0.65 | blast 0.10 | season_boro, stage_tillering, new_leaves_first | NOT_SURE + q_khaira_after_transplant | zn_def (khaira) look-alike |
| X13 | blast 0.40 | tungro 0.35 | — (all "don't know") | keep blast only if p ≥ threshold, else NOT_SURE | no context → model alone |
| X14 | brown_spot 0.70 | blast 0.08 | urea_high, cold_nights | NOT_SURE + q_eye_shaped_grey_centre (no swap: blast p < 0.25) | top-1 conflicts; rules cannot promote a low-p class |
| X15 | healthy 0.88 | blast 0.04 | stage_heading, old_leaves_first | keep healthy (C1) + q_old_leaves_near_harvest | senescence |
| X16 | blb 0.55 | blast 0.30 | field_dry, cold_nights | NOT_SURE | blb conflicts, blast weak |
| X17 | leaf_scald 0.62 | blb 0.30 | storm_recent, flooded_recent, season_aman | swap → blb (C6) | blb 3 favours; scald none (NEEDS-CHECK if C7 shipped) |
| X18 | sheath_blight 0.45 | blast 0.40 | symptom_middle, stage_seedling | NOT_SURE + q_spots_near_water_on_stem | sheath_blight unlikely_if seedling |
| X19 | any | any | symptom_base or pattern_whole_field_dying | location guard + SAAO | guard runs before cross-check |
