// Turns a leaf case into plain-language, context-specific explanation. Fixed sentences only (no generated
// text): which sentences appear depends on the farmer's answers. "Fit" lines come straight from
// knowledge.json favours / unlikely_if, so every claim is sourced.
import calendarJson from "../../../public/data/calendar.json";
import type { Text } from "../i18n";
import { LABEL_NAMES } from "../labels";
import { EXTRA_FAVOURS, EXTRA_LOOKALIKE, KNOWLEDGE } from "./crosscheck";
import { FOLLOWUP_NO, FOLLOWUP_YES } from "./context";
import type { CrossResult, Prediction, Stage } from "./types";

/** What each condition means, in the farmer's words. */
export const CONDITION_PHRASES: Record<string, Text> = {
  cold_nights: { bn: "সম্প্রতি রাতে খুব ঠান্ডা পড়েছে", en: "there were very cold nights" },
  deadheart: { bn: "মরা ডগা বা সাদা শীষ টানলে উঠে আসে", en: "dead shoots or white panicles pull out easily" },
  field_dry: { bn: "জমি শুকনো, বৃষ্টি হয়নি", en: "the field is dry, no rain" },
  flooded_recent: { bn: "সম্প্রতি জমিতে বন্যার পানি উঠেছিল", en: "the field was flooded recently" },
  waterlogged: { bn: "এক সপ্তাহের বেশি পানি জমে ছিল", en: "water stood for more than a week" },
  insects_hoppers_base: { bn: "গোড়ায় অনেক ছোট বাদামি পোকা", en: "many small brown insects at the base" },
  insects_leafhoppers: { bn: "পাতায় ছোট সবুজ লাফানো পোকা", en: "small green jumping insects on the leaves" },
  khaira_patches: { bn: "কচি পাতায় মরিচার মতো ধুলোট বাদামি ছোপ", en: "dusty rust-brown patches on young leaves" },
  lesion_eye_shaped: { bn: "দাগ চোখের মতো, দুই মাথা সরু, মাঝখান ছাই রং", en: "the spots are eye-shaped with grey centres" },
  lesion_not_eye_shaped: { bn: "দাগ গোল, চোখের মতো নয়", en: "the spots are round, not eye-shaped" },
  new_leaves_first: { bn: "উপরের নতুন পাতায় আগে শুরু", en: "it started on the young top leaves" },
  old_leaves_first: { bn: "নিচের পুরনো পাতায় আগে শুরু", en: "it started on the old lower leaves" },
  orange_film: { bn: "জমির পানিতে তেলতেলে কমলা আস্তরণ", en: "there is an oily orange film on the water" },
  pattern_one_hill: { bn: "শুধু ১-২টা গাছে", en: "only 1 or 2 plants have it" },
  pattern_patches: { bn: "জমির কয়েক জায়গায়, ছোপ ছোপ", en: "it is in a few spots in the field" },
  pattern_whole_field: { bn: "প্রায় সব গাছে, সমানভাবে", en: "almost all plants have it, evenly" },
  pattern_whole_field_dying: { bn: "অনেক গাছ দ্রুত শুকিয়ে মরছে", en: "many plants are dying fast" },
  rain_heavy_7d: { bn: "এই সপ্তাহে অনেক বৃষ্টি হয়েছে", en: "there was heavy rain this week" },
  region_coastal: { bn: "আপনার জমি উপকূলীয় এলাকায়", en: "your field is in a coastal area" },
  salt_water: { bn: "জমিতে লোনা বা জোয়ারের পানি ঢুকেছিল", en: "salty or tidal water came into the field" },
  season_aman: { bn: "এখন আমন মৌসুম", en: "it is the Aman season" },
  season_aus: { bn: "এখন আউশ মৌসুম", en: "it is the Aus season" },
  season_boro: { bn: "এখন বোরো মৌসুম", en: "it is the Boro season" },
  senescence_near_harvest: { bn: "ফসল কাটার কাছাকাছি, শুধু পুরনো পাতা হলুদ", en: "the crop is near harvest and only old leaves are yellow" },
  stage_seedling: { bn: "ধান এখনো চারা বা সদ্য রোপণ করা", en: "the crop is still young (seedling or just planted)" },
  stage_tillering: { bn: "ধানে কুশি গজাচ্ছে", en: "the crop is tillering" },
  stage_heading: { bn: "ধানে থোড় বা ফুল আসছে", en: "the crop is booting or flowering" },
  storm_recent: { bn: "সম্প্রতি ঝড় বা জোর বাতাস হয়েছে", en: "there was a storm or strong wind" },
  streaks_translucent: { bn: "শিরার মাঝে সরু, আলোয় স্বচ্ছ রেখা", en: "there are thin see-through lines between the veins" },
  symptom_tip_edge: { bn: "সমস্যা পাতার আগা বা কিনারায়", en: "the problem is at the leaf tip or edge" },
  symptom_middle: { bn: "সমস্যা পাতার মাঝখানে", en: "the problem is in the middle of the leaf" },
  symptom_sheath: { bn: "সমস্যা পানির কাছে কাণ্ডে", en: "the problem is on the stem near the water" },
  symptom_panicle: { bn: "সমস্যা শীষে বা দানায়", en: "the problem is on the panicle or grains" },
  symptom_base: { bn: "সমস্যা গাছের গোড়ায়", en: "the problem is at the plant base" },
  symptom_whole_plant: { bn: "পুরো গাছেই সমস্যা", en: "the whole plant is affected" },
  urea_high: { bn: "আপনি অনেক বেশি ইউরিয়া দিয়েছেন", en: "you gave a lot of urea" },
  urea_none: { bn: "সম্প্রতি কোনো ইউরিয়া দেননি", en: "you gave no urea recently" },
  zonate_bands: { bn: "শুকনো অংশে হালকা ও গাঢ় ডোরা", en: "there are light and dark bands in the dry part" },
  mould_white: { bn: "সাদা তুলার মতো ছাতা", en: "there is white cotton-like mould" },
  mould_grey: { bn: "দাগের মাঝখানে ছাই রঙের পাউডার", en: "there is grey powder in the spots" },
  mould_black: { bn: "কালো ঝুল", en: "there is black sooty mould" },
  mould_orange: { bn: "দানায় কমলা বা সবুজ-কালো বল", en: "there are orange or green-black balls on the grains" },
  look_yellow_orange: { bn: "পাতা আগা থেকে হলদে-কমলা", en: "the leaves turn yellow-orange from the tip" },
  look_pale: { bn: "পাতা ফ্যাকাশে, কোনো দাগ নেই", en: "the leaves are pale with no spots" },
  look_bronze: { bn: "পাতা কমলা-বাদামি, তামাটে", en: "the leaves are orange-brown, bronze" },
  no_problem_seen: { bn: "আপনি কোনো সমস্যা দেখছেন না", en: "you see no problem" },
};

export type FitLine = { phrase: Text; good: boolean };
export type Fit = { code: string; name: Text; lines: FitLine[] };

/** For each likely problem: which of the farmer's answers fit it (✓) and which speak against it (✗). */
export function fitLines(conditions: string[], codes: string[]): Fit[] {
  const ctx = new Set(conditions);
  return codes
    .filter((c, i) => c && codes.indexOf(c) === i && c !== "not_rice")
    .map((code) => {
      const info = KNOWLEDGE.classes[code] ?? KNOWLEDGE.lookalikes[code];
      const all = [...(info?.favours ?? []), ...(EXTRA_FAVOURS[code] ?? []), ...(EXTRA_LOOKALIKE[code] ?? [])];
      const favours = [...new Set(all)].filter((c) => ctx.has(c) && CONDITION_PHRASES[c]);
      const against = (info?.unlikely_if ?? []).filter((c) => ctx.has(c) && CONDITION_PHRASES[c]);
      return {
        code,
        name: LABEL_NAMES[code] ?? { bn: code, en: code },
        lines: [...favours.map((c) => ({ phrase: CONDITION_PHRASES[c], good: true })), ...against.map((c) => ({ phrase: CONDITION_PHRASES[c], good: false }))],
      };
    })
    .filter((f) => f.lines.length);
}

/** The farmer's own answers, as short phrases (season and stage first). */
export function toldPhrases(conditions: string[]): Text[] {
  return conditions.filter((c) => CONDITION_PHRASES[c]).map((c) => CONDITION_PHRASES[c]);
}

type Tip = { for: string[]; when: string[]; text: Text; src: string };
/** Tips that fire only for this problem + this answer. Fixed text, sources from the knowledge base. */
const TIPS: Tip[] = [
  { for: ["blast", "blb", "sheath_blight", "leaf_scald"], when: ["urea_high"], src: "irri_blast, irri_blb, irri_sheathblight",
    text: { bn: "আর ইউরিয়া দেবেন না: বেশি নাইট্রোজেনে এই রোগ বাড়ে। পরে কতটা দেবেন, কৃষি অফিসারকে জিজ্ঞেস করুন।", en: "Give no more urea for now: too much nitrogen makes this disease worse. Ask your SAAO before the next dose." } },
  { for: ["blb", "bls"], when: ["flooded_recent", "storm_recent", "rain_heavy_7d"], src: "irri_blb",
    text: { bn: "ঝড়, বন্যা আর বৃষ্টির পরে এই রোগ পানির সাথে ছড়ায়। পারলে জমির বাড়তি পানি বের করে দিন।", en: "After storms, floods and rain this disease spreads with the water. Drain extra water if you can." } },
  { for: ["brown_spot"], when: ["field_dry", "urea_none"], src: "irri_brownspot",
    text: { bn: "শুকনো, দুর্বল মাটিতে বাদামি দাগ রোগ বাড়ে। জমিতে পানি রাখুন আর মাটি পরীক্ষার কথা কৃষি অফিসারকে জিজ্ঞেস করুন।", en: "Brown spot is worse on dry, poor soil. Keep water in the field and ask your SAAO about a soil test." } },
  { for: ["blast"], when: ["cold_nights"], src: "irri_blast",
    text: { bn: "ঠান্ডা রাতে ব্লাস্ট বাড়ে। ঠান্ডা কমলে আবার জমি দেখুন।", en: "Cold nights favour blast. Check the field again when the cold spell ends." } },
  { for: ["blast"], when: ["stage_heading"], src: "irri_blast_neck",
    text: { bn: "ধানে থোড় বা ফুল আসছে: শীষের গলা দেখুন, শীষ ব্লাস্ট হলে তাড়াতাড়ি কৃষি অফিসারকে জানান।", en: "The crop is booting or flowering: check the panicle necks; tell your SAAO quickly if you see neck blast." } },
  { for: ["tungro"], when: ["insects_leafhoppers"], src: "irri_tungro",
    text: { bn: "আপনি সবুজ পাতাফড়িং দেখেছেন: এরাই টুংরো ছড়ায়। আজই কৃষি অফিসারকে জানান, যাতে পাশের কৃষকরাও সতর্ক হন।", en: "You saw green leafhoppers: they spread tungro. Tell your SAAO today so neighbours can be warned too." } },
  { for: ["sheath_blight"], when: ["flooded_recent", "pattern_patches"], src: "irri_sheathblight",
    text: { bn: "খোলপোড়া পানির উপর দিয়ে গাছ থেকে গাছে ছড়ায়। আইলের আগাছা তুলে ফেলুন।", en: "Sheath blight spreads from plant to plant along the water. Pull the weeds on the bunds." } },
  { for: ["n_def"], when: ["pattern_whole_field", "old_leaves_first", "look_pale"], src: "irri_ndef",
    text: { bn: "পুরো জমি সমানভাবে ফ্যাকাশে, পুরনো পাতা থেকে: এটা নাইট্রোজেনের অভাব হতে পারে, রোগ নয়। কতটা ইউরিয়া দেবেন, কৃষি অফিসারকে জিজ্ঞেস করুন।", en: "The whole field evenly pale from the old leaves can be nitrogen shortage, not a disease. Ask your SAAO how much urea to give." } },
  { for: ["zn_def"], when: ["khaira_patches", "season_boro"], src: "irri_zndef",
    text: { bn: "কচি পাতায় মরিচার মতো ছোপ, বিশেষ করে বোরোতে: এটা দস্তার অভাব (খৈরা) হতে পারে। দস্তার কথা কৃষি অফিসারকে জিজ্ঞেস করুন।", en: "Rust-like patches on young leaves, especially in Boro, can be zinc shortage (khaira). Ask your SAAO about zinc." } },
  { for: ["bph"], when: ["insects_hoppers_base"], src: "irri_bph",
    text: { bn: "গোড়ায় বাদামি গাছফড়িং: নিজে কোনো কীটনাশক দেবেন না, এতে আরো বাড়ে। এখনই কৃষি অফিসারকে জানান।", en: "Brown planthoppers at the base: do not spray insecticide yourself, it makes them worse. Tell your SAAO now." } },
  { for: ["cold"], when: ["cold_nights"], src: "irri_cold",
    text: { bn: "ঠান্ডা রাতের পরে হলুদ ভাব ঠান্ডার ক্ষতিও হতে পারে, রোগ নয়। আবহাওয়া গরম হলে আবার দেখুন।", en: "Yellowing after cold nights can be cold injury, not a disease. Look again when it gets warmer." } },
  { for: ["salt"], when: ["salt_water"], src: "irri_salinity",
    text: { bn: "লোনা পানি ঢুকেছিল: পাতার সাদা পোড়া আগা লবণের ক্ষতি হতে পারে, রোগ নয়। কৃষি অফিসারকে জানান।", en: "Salty water came in: white burnt leaf tips can be salt injury, not a disease. Tell your SAAO." } },
  { for: ["fe_tox"], when: ["orange_film", "look_bronze"], src: "irri_fetox",
    text: { bn: "পানিতে কমলা আস্তরণ বা তামাটে পাতা: এটা আয়রনের বিষক্রিয়া হতে পারে। কৃষি অফিসারকে জিজ্ঞেস করুন।", en: "An orange film on the water or bronze leaves can be iron toxicity. Ask your SAAO." } },
];

export function contextTips(conditions: string[], candidates: string[]): (Text & { src: string })[] {
  const ctx = new Set(conditions);
  return TIPS.filter((t) => t.for.some((c) => candidates.includes(c)) && t.when.some((w) => ctx.has(w))).map((t) => ({ ...t.text, src: t.src }));
}

type CalStage = { id: Stage; do: (Text & { src: string; season: string })[] };
/** One task for this week from the crop calendar, for the farmer's stage and season. */
export function stageTask(stage: Stage | undefined, season: string | undefined): (Text & { src: string }) | undefined {
  const s = (calendarJson as unknown as { stages: CalStage[] }).stages.find((x) => x.id === stage);
  return s?.do.find((t) => t.season === "any" || t.season === season);
}

/** Problems worth explaining: the chosen class, else the model's top-2, plus the look-alike. */
export function candidates(cross: CrossResult | undefined, pred: Prediction | undefined): string[] {
  const out = cross?.cls ? [cross.cls] : pred ? [pred.top1, pred.top2] : [];
  if (cross?.lookalike) out.push(cross.lookalike);
  return out.filter((c) => c && c !== "not_rice");
}

/** Days until "check again", from the card's own advice. */
export const CHECK_AGAIN_DAYS: Record<string, number> = { C1: 7, C2: 3, C3: 3, C4: 3, C6: 3, C7: 3, C8: 2, C9: 2 };

/** A follow-up question is already answered when the farmer's answers settle it (yes or no). */
export function alreadyAnswered(q: string, conditions: string[]): boolean {
  const ctx = new Set(conditions);
  const all = (xs?: string[]) => !!xs?.length && xs.every((c) => ctx.has(c));
  return all(FOLLOWUP_YES[q]) || all(FOLLOWUP_NO[q]);
}
