// One place that links every code the model or the engine can output to a name people know:
// the Bangla name farmers and SAAOs use, the English name, and the scientific name (for agronomists).
// A unit test fails if public/model/labels.json or knowledge.json gains a code without a name here.
import type { Text } from "./i18n";

export type LabelName = Text & { sci?: string };

export const LABEL_NAMES: Record<string, LabelName> = {
  // Model outputs (public/model/labels.json)
  healthy: { bn: "সুস্থ ধানপাতা", en: "Healthy rice leaf" },
  blast: { bn: "ব্লাস্ট রোগ", en: "Rice blast", sci: "Magnaporthe oryzae (fungus)" },
  brown_spot: { bn: "বাদামি দাগ রোগ", en: "Brown spot", sci: "Bipolaris oryzae (fungus)" },
  sheath_blight: { bn: "খোলপোড়া রোগ", en: "Sheath blight", sci: "Rhizoctonia solani (fungus)" },
  tungro: { bn: "টুংরো রোগ", en: "Rice tungro", sci: "RTBV + RTSV virus, spread by green leafhopper" },
  blb: { bn: "ব্যাকটেরিয়াজনিত পাতাপোড়া রোগ (বিএলবি)", en: "Bacterial leaf blight (BLB)", sci: "Xanthomonas oryzae pv. oryzae" },
  not_rice: { bn: "ধানপাতা নয়", en: "Not a rice leaf" },
  // Card-only class (not in the current model) and the app's own outcome
  leaf_scald: { bn: "পাতা ঝলসানো রোগ", en: "Leaf scald", sci: "Microdochium oryzae (fungus)" },
  not_sure: { bn: "নিশ্চিত নয়", en: "Not sure" },
  // Look-alikes the cross-check names (knowledge.json "lookalikes")
  bls: { bn: "ব্যাকটেরিয়াজনিত পাতার রেখা রোগ", en: "Bacterial leaf streak", sci: "Xanthomonas oryzae pv. oryzicola" },
  n_def: { bn: "নাইট্রোজেনের অভাব", en: "Nitrogen deficiency" },
  k_def: { bn: "পটাশের অভাব", en: "Potassium deficiency" },
  zn_def: { bn: "দস্তার অভাব (খৈরা রোগ)", en: "Zinc deficiency (khaira)" },
  s_def: { bn: "গন্ধকের অভাব", en: "Sulphur deficiency" },
  bph: { bn: "বাদামি গাছফড়িং (কারেন্ট পোকা)", en: "Brown planthopper", sci: "Nilaparvata lugens" },
  stem_borer: { bn: "মাজরা পোকা", en: "Stem borer" },
  cold: { bn: "ঠান্ডায় ক্ষতি", en: "Cold injury" },
  salt: { bn: "লবণাক্ততায় ক্ষতি", en: "Salt injury" },
  fe_tox: { bn: "আয়রনের বিষক্রিয়া", en: "Iron toxicity" },
};

/** Name for any model/engine code; unknown codes (e.g. a retrained model) fall back to the code itself. */
export function labelName(code: string, lang: "bn" | "en"): string {
  const n = LABEL_NAMES[code];
  return n ? n[lang] : code;
}
