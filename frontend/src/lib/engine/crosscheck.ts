// Cross-check the classifier's top-2 against the farmer's context (public/data/knowledge.json).
// It may only: keep top-1, swap to top-2, move to NOT_SURE, or fire the location guard.
// It never invents a class the model did not rank in its top-2 (docs/knowledge/test-cases.md).
import knowledgeJson from "../../../public/data/knowledge.json";
import type { CardId, CrossResult, Prediction } from "./types";

type ClassInfo = { favours: string[]; unlikely_if?: string[]; confusers?: string[]; ask: string[]; sources?: string[] };
export type Knowledge = {
  version: string;
  classes: Record<string, ClassInfo>;
  lookalikes: Record<string, ClassInfo>;
  location_guard: string[];
  questions: Record<string, { en: string; bn: string }>;
  sources: Record<string, string>;
};
export const KNOWLEDGE = knowledgeJson as unknown as Knowledge;

export type Thresholds = {
  /** From threshold.json (Omar): the model alone must reach these to be trusted. */
  min_prob: number;
  min_margin: number;
  /** Placeholders until Omar calibrates (test-cases.md): */
  swap_min_p: number; // top-2 needs at least this probability to be promoted
  min_top2_mass: number; // p1 + p2 below this → the model is lost (e.g. not a rice leaf)
};
export const DEFAULT_THRESHOLDS: Thresholds = { min_prob: 0.7, min_margin: 0.2, swap_min_p: 0.25, min_top2_mass: 0.6 };

export const CLASS_CARD: Record<string, CardId> = {
  healthy: "C1",
  blast: "C2",
  brown_spot: "C3",
  sheath_blight: "C4",
  tungro: "C5",
  blb: "C6",
  leaf_scald: "C7",
};

/** Answers that mean "the problem is not on the leaf blade". Hoppers at the base (BPH) and stem borer are not leaf problems either. */
const GUARD_EXTRA = ["insects_hoppers_base", "insects_stem_borer"];
const GUARD_ASK: Record<string, string> = {
  symptom_sheath: "q_spots_near_water_on_stem",
  symptom_panicle: "q_deadheart_pulls_out",
  symptom_base: "q_tap_base_hoppers",
  insects_hoppers_base: "q_tap_base_hoppers",
  insects_stem_borer: "q_deadheart_pulls_out",
  pattern_whole_field_dying: "q_tap_base_hoppers",
};

function score(info: ClassInfo | undefined, ctx: Set<string>) {
  return {
    favours: (info?.favours ?? []).filter((c) => ctx.has(c)),
    conflicts: (info?.unlikely_if ?? []).filter((c) => ctx.has(c)),
  };
}

const uniq = (xs: string[]) => [...new Set(xs)];
const interleave = (a: string[], b: string[]) => a.flatMap((x, i) => [x, b[i]]).concat(b.slice(a.length)).filter(Boolean);

export function crossCheck(
  pred: Prediction,
  conditions: Iterable<string>,
  th: Thresholds = DEFAULT_THRESHOLDS,
  kb: Knowledge = KNOWLEDGE,
): CrossResult {
  const ctx = new Set(conditions);
  const { top1, p1, top2, p2 } = pred;
  const s1 = score(kb.classes[top1], ctx);
  const s2 = score(kb.classes[top2], ctx);
  const support = { [top1]: s1, [top2]: s2 };
  const ask1 = kb.classes[top1]?.ask ?? [];
  const ask2 = kb.classes[top2]?.ask ?? [];

  // Location guard runs first: a leaf photo cannot show sheath, panicle or base problems.
  const guard = [...kb.location_guard, ...GUARD_EXTRA].filter((c) => ctx.has(c));
  if (guard.length) {
    return {
      decision: "location_guard",
      cls: null,
      card: "C9",
      ask: uniq(guard.map((g) => GUARD_ASK[g]).filter(Boolean)).slice(0, 2),
      reasons: guard.map((g) => `guard:${g}`),
      support,
    };
  }

  // Strongest look-alike that is not one of our classes (nutrient, cold, salt, BPH...).
  let lookalike: { id: string; n: number; ask: string[] } | undefined;
  for (const [id, info] of Object.entries(kb.lookalikes)) {
    const n = info.favours.filter((c) => ctx.has(c)).length;
    if (n >= 2 && (!lookalike || n > lookalike.n)) lookalike = { id, n, ask: info.ask };
  }

  const notSure = (reasons: string[], firstAsk: string[] = []): CrossResult => ({
    decision: "not_sure",
    cls: null,
    card: "C8",
    // Close calls: alternate top-1 / top-2 questions, so the farmer gets the one that separates them.
    ask: uniq([...(lookalike?.ask ?? []), ...firstAsk, ...interleave(ask1, ask2)]).slice(0, 2),
    reasons,
    support,
    lookalike: lookalike?.id,
  });

  // The model spreads its answer over many classes: probably not a rice leaf, or a bad photo.
  if (p1 + p2 < th.min_top2_mass) return notSure(["model_lost"]);

  const n1 = s1.favours.length, c1 = s1.conflicts.length;
  const n2 = s2.favours.length, c2 = s2.conflicts.length;
  const modelConfident = p1 >= th.min_prob && p1 - p2 >= th.min_margin;

  let decision: "keep" | "swap";
  let reason: string;
  if (p2 >= th.swap_min_p && n2 - n1 >= 2 && n2 >= 3 && c2 === 0) {
    decision = "swap";
    reason = "context_supports_top2";
  } else if (c1 >= 1 && n1 <= c1) {
    return notSure(["context_conflicts_top1"], ask1);
  } else if (modelConfident) {
    decision = "keep";
    reason = "model_confident";
  } else if (n1 - n2 >= 2 && n1 >= 3 && c1 === 0) {
    decision = "keep";
    reason = "context_supports_top1";
  } else {
    return notSure(["low_confidence"]);
  }

  const cls = decision === "swap" ? top2 : top1;
  const nChosen = decision === "swap" ? n2 : n1;
  if (lookalike && lookalike.n >= nChosen) return notSure([`lookalike:${lookalike.id}`]);

  return {
    decision,
    cls,
    card: CLASS_CARD[cls] ?? "C8",
    ask: uniq(decision === "swap" ? [...ask2, ...ask1] : ask1).slice(0, 2),
    reasons: [reason],
    support,
  };
}
