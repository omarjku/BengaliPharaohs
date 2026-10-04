// Turns the farmer's taps + profile into knowledge.json condition ids, and derives season/stage from dates.
import type { Region, Season, Stage } from "./types";

export type Unknown = "unknown";
export type Where = "tip_edge" | "middle" | "sheath" | "panicle" | "base";
/** Pests Bangladeshi farmers know by name. Only hoppers, leafhoppers and stem borer change the engine; the rest go to the SAAO. */
export const INSECTS = [
  "green_leafhopper",
  "bph",
  "wbph",
  "stem_borer",
  "hispa",
  "leaf_folder",
  "rice_bug",
  "armyworm",
  "gall_midge",
  "grasshopper",
] as const;
export type Insect = (typeof INSECTS)[number];
/** Insects whose damage a leaf-disease photo model cannot judge: shown as a "show your SAAO" note on the result. */
export const SAAO_PESTS: Insect[] = ["stem_borer", "hispa", "leaf_folder", "rice_bug", "armyworm", "gall_midge", "grasshopper", "bph", "wbph"];

export type LeafAnswers = {
  variety?: string;
  /** Several places can be affected at once; [] or ["unknown"] = not answered. */
  where?: (Where | Unknown)[];
  pattern?: "one_hill" | "patches" | "whole_field" | "whole_field_dying" | Unknown;
  first?: "old" | "new" | Unknown;
  insects?: (Insect | "none" | Unknown)[];
  rain?: "none" | "some" | "heavy" | Unknown;
  flooded?: "yes" | "no" | Unknown;
  flood_days?: number;
  storm?: "yes" | "no" | Unknown;
  cold_nights?: "yes" | "no" | Unknown;
  salty_water?: "yes" | "no" | Unknown;
  urea?: "none" | "normal" | "a_lot" | Unknown;
  /** Targeted follow-up questions (knowledge.json question ids), asked only when the photo leaves a close call. */
  followups?: Record<string, "yes" | "no" | Unknown>;
};

/** What a "yes" to each follow-up question tells the engine (knowledge.json condition ids). */
export const FOLLOWUP_YES: Record<string, string[]> = {
  q_eye_shaped_grey_centre: ["lesion_eye_shaped"],
  q_tips_edges_old_leaves: ["symptom_tip_edge", "old_leaves_first"],
  q_spots_near_water_on_stem: ["symptom_sheath"],
  q_some_hills_green_insects: ["insects_leafhoppers", "pattern_patches"],
  q_whole_field_old_leaves: ["pattern_whole_field", "old_leaves_first"],
  q_tip_edge_after_storm: ["storm_recent", "symptom_tip_edge"],
  q_thin_streaks_translucent: ["streaks_translucent"],
  q_zonate_bands: ["zonate_bands"],
  q_khaira_after_transplant: ["khaira_patches"],
  q_tap_base_hoppers: ["insects_hoppers_base"],
  q_deadheart_pulls_out: ["deadheart"],
  q_cold_spell: ["cold_nights"],
  q_salty_water: ["salt_water"],
  q_orange_film: ["orange_film"],
  q_old_leaves_near_harvest: ["senescence_near_harvest"],
};
/** A "no" only tells us something for a few questions. */
export const FOLLOWUP_NO: Record<string, string[]> = {
  q_eye_shaped_grey_centre: ["lesion_not_eye_shaped"],
};

export function conditionsFrom(a: LeafAnswers, p: { season?: Season; stage?: Stage; region?: Region }): string[] {
  const c: string[] = [];
  if (a.rain === "heavy") c.push("rain_heavy_7d");
  if (a.rain === "none" && a.flooded !== "yes") c.push("field_dry");
  if (a.flooded === "yes") {
    c.push("flooded_recent");
    if ((a.flood_days ?? 0) > 7) c.push("waterlogged");
  }
  if (a.storm === "yes") c.push("storm_recent");
  if (a.cold_nights === "yes") c.push("cold_nights");
  if (a.salty_water === "yes") c.push("salt_water");
  if (p.region === "coastal") c.push("region_coastal");
  if (a.urea === "none") c.push("urea_none");
  if (a.urea === "a_lot") c.push("urea_high");
  if (p.season) c.push(`season_${p.season}`);
  if (p.stage === "seedbed" || p.stage === "early_tillering") c.push("stage_seedling");
  if (p.stage === "tillering") c.push("stage_tillering");
  if (p.stage === "pi_booting" || p.stage === "flowering" || p.stage === "grain_filling") c.push("stage_heading");
  for (const w of a.where ?? []) if (w !== "unknown") c.push(`symptom_${w}`);
  if (a.pattern && a.pattern !== "unknown") {
    c.push(`pattern_${a.pattern}`);
    if (a.pattern === "whole_field_dying") c.push("pattern_whole_field");
  }
  if (a.first === "old") c.push("old_leaves_first");
  if (a.first === "new") c.push("new_leaves_first");
  for (const i of a.insects ?? []) {
    if (i === "none" || i === "unknown") continue;
    if (i === "green_leafhopper") c.push("insects_leafhoppers");
    else if (i === "bph" || i === "wbph") c.push("insects_hoppers_base");
    else c.push(`insects_${i}`);
  }
  for (const [q, v] of Object.entries(a.followups ?? {})) {
    if (v === "yes") c.push(...(FOLLOWUP_YES[q] ?? []));
    if (v === "no") c.push(...(FOLLOWUP_NO[q] ?? []));
  }
  return [...new Set(c)];
}

/** Default season from the calendar month; the farmer can change it. Aman Jul–Nov, Boro Dec–Apr, Aus May–Jun. */
export function seasonFromDate(iso: string): Season {
  const m = Number(iso.slice(5, 7));
  if (m >= 7 && m <= 11) return "aman";
  if (m === 12 || m <= 4) return "boro";
  return "aus";
}

/** Rough growth stage from days since transplanting (Aman, ~140-day variety). Shown as "estimated", editable. */
export function stageFromTransplant(transplantIso: string | undefined, todayIso: string): Stage | undefined {
  if (!transplantIso) return undefined;
  const days = Math.round((Date.parse(todayIso) - Date.parse(transplantIso)) / 86_400_000);
  if (Number.isNaN(days)) return undefined;
  if (days < 0) return "seedbed";
  if (days <= 20) return "early_tillering";
  if (days <= 50) return "tillering";
  if (days <= 70) return "pi_booting";
  if (days <= 85) return "flowering";
  return "grain_filling";
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
