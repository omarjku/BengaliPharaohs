// Spoken questions: each clip reads a question and then its answer options, so a farmer who cannot read can
// listen and tap. Used by the 🔊 buttons (src/components/app/choice.tsx) and by scripts/gen-audio-script.mjs,
// which builds the voice text from these string keys. Plain data only (Node imports this file directly).
import type { StringKey } from "./strings";

export type QuestionClip = { q: StringKey[]; opts?: StringKey[] };

export const QUESTION_CLIPS = {
  "Q-PHOTO": { q: ["photo_title", "photo_tips"], opts: ["photo_camera", "photo_gallery"] },
  "Q-FIELD": { q: ["field_title", "field_sub"] },
  "Q-VARIETY": { q: ["profile_variety", "variety_hint"] },
  "Q-UPAZILA": { q: ["profile_district", "profile_upazila"] },
  "Q-SEASON": { q: ["profile_season"], opts: ["season_aman", "season_aus", "season_boro"] },
  "Q-WHERE": {
    q: ["q_where", "pick_many"],
    opts: ["where_tip_edge", "where_middle", "where_sheath", "where_panicle", "where_base", "where_whole_plant", "where_grain", "where_none"],
  },
  "Q-PATTERN": {
    q: ["q_pattern", "q_pattern_hint"],
    opts: ["pattern_one_hill", "pattern_patches", "pattern_whole_field", "pattern_whole_field_dying", "pattern_none"],
  },
  "Q-MOULD": { q: ["q_mould", "q_mould_hint"], opts: ["mould_white", "mould_grey", "mould_black", "mould_orange", "mould_none"] },
  "Q-LOOK": { q: ["q_look"], opts: ["look_eye", "look_round", "look_stripe_tip_edge", "look_thin_lines", "look_bands", "look_stem_patch", "look_yellow_orange", "look_dusty_rust", "look_brown_tips_old", "look_bronze", "look_pale", "look_none"] },
  "Q-FIRST": { q: ["q_first"], opts: ["first_old", "first_new", "first_none"] },
  "Q-INSECTS": {
    q: ["q_insects", "pick_many"],
    opts: [
      "ins_green_leafhopper",
      "ins_bph",
      "ins_wbph",
      "ins_stem_borer",
      "ins_hispa",
      "ins_leaf_folder",
      "ins_rice_bug",
      "ins_armyworm",
      "ins_gall_midge",
      "ins_grasshopper",
      "insects_none",
    ],
  },
  "Q-RAIN": { q: ["q_weather", "q_rain"], opts: ["rain_none", "rain_some", "rain_heavy"] },
  "Q-FLOODED": { q: ["q_flooded"] },
  "Q-STORM": { q: ["q_storm"] },
  "Q-COLD": { q: ["q_cold"] },
  "Q-SALTY": { q: ["q_salty"] },
  "Q-UREA": { q: ["q_urea"], opts: ["urea_none", "urea_normal", "urea_a_lot"] },
  "Q-EVENT": { q: ["q_event"], opts: ["event_flood", "event_drought"] },
  "Q-VARIETY-TYPE": { q: ["q_variety_type", "variety_sub1_hint"] },
  "Q-SUBMERGENCE": { q: ["q_submergence"], opts: ["sub_full", "sub_partial"] },
  "Q-DAYS": { q: ["q_days"] },
  "Q-STAGE": {
    q: ["stage"],
    opts: ["stage_seedbed", "stage_early_tillering", "stage_tillering", "stage_pi_booting", "stage_flowering", "stage_grain_filling"],
  },
  "Q-HILLS": { q: ["q_hills", "q_hills_hint"], opts: ["hills_most", "hills_about_half", "hills_few"] },
  "Q-SEEDLINGS": { q: ["q_seedlings"] },
  "Q-VOICE": { q: ["voice_title", "voice_hint"] },
} satisfies Record<string, QuestionClip>;

export type QuestionClipId = keyof typeof QUESTION_CLIPS;
