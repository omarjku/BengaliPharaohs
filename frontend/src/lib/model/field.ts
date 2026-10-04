// Field walk: 3-10 leaf photos from different spots -> one summary of how widespread a problem is.
// Pure and unit-tested. Per-photo NOT SURE rule is the same as crosscheck.ts (p1 >= min_prob, margin, not_rice = not sure).
import type { Prediction } from "../engine/types";
import { combinePredictions } from "./combine";

export const MIN_SPOTS = 3;
export const MAX_SPOTS = 10;

export type Spread = "isolated" | "patches" | "whole_field" | "unclear" | "healthy";
export type FieldSummary = {
  n: number;
  /** Spots per class; `not_sure` also holds not_rice and photos the model could not read. */
  counts: Record<string, number>;
  /** Most frequent confident disease (not healthy), or null. */
  dominant: string | null;
  /** Dominant spots / confident spots (0 when none is confident). */
  share: number;
  spread: Spread;
  healthyShare: number;
};
type Th = { min_prob: number; min_margin: number };

/** The class a photo confidently shows, or null = NOT SURE. */
export function confidentClass(p: Prediction | undefined, th: Th): string | null {
  if (!p || p.top1 === "not_rice") return null;
  return p.p1 >= th.min_prob && p.p1 - p.p2 >= th.min_margin ? p.top1 : null;
}

/** undefined = that photo could not be read (counts as not sure). */
export function summarizeField(spots: (Prediction | undefined)[], th: Th): FieldSummary {
  const n = spots.length;
  const counts: Record<string, number> = {};
  const conf = new Map<string, number>(); // class -> summed p1, only for tie-breaks
  let confident = 0;
  for (const p of spots) {
    const c = confidentClass(p, th);
    counts[c ?? "not_sure"] = (counts[c ?? "not_sure"] ?? 0) + 1;
    if (c) {
      confident++;
      conf.set(c, (conf.get(c) ?? 0) + p!.p1);
    }
  }
  const diseases = Object.keys(counts).filter((k) => k !== "healthy" && k !== "not_sure");
  // Ties: more spots, then higher summed probability, then name (so the result never depends on photo order).
  diseases.sort((a, b) => counts[b] - counts[a] || (conf.get(b) ?? 0) - (conf.get(a) ?? 0) || a.localeCompare(b));
  const dominant = diseases[0] ?? null;
  const share = dominant && confident ? counts[dominant] / confident : 0;
  const notSure = counts.not_sure ?? 0;
  let spread: Spread;
  if (n === 0 || notSure > n / 2) spread = "unclear";
  else if (!dominant) spread = "healthy";
  else if (counts[dominant] === 1 || share < 0.25) spread = "isolated";
  else if (share <= 0.6) spread = "patches";
  else spread = "whole_field";
  return { n, counts, dominant, share, spread, healthyShare: n ? (counts.healthy ?? 0) / n : 0 };
}

/** The engine's single prediction: average of the confident photos (all readable ones if none is confident). */
/** The diagnosis answers "what do the sick leaves have?": average the confidently sick photos.
 *  Healthy spots still count in the spread ("how much of the field"), not in the diagnosis.
 *  No confident disease → confident photos (e.g. all healthy) → all photos. */
export function combineForEngine(preds: Prediction[], th: Th): Prediction {
  const sure = preds.filter((p) => confidentClass(p, th));
  const sick = sure.filter((p) => confidentClass(p, th) !== "healthy");
  return combinePredictions(sick.length ? sick : sure.length ? sure : preds);
}

/** Pre-selected answer for "how is it spread in the field?" (still editable). */
export function patternFromSpread(s: Spread): "one_hill" | "patches" | "whole_field" | "none" | undefined {
  return { isolated: "one_hill", patches: "patches", whole_field: "whole_field", healthy: "none", unclear: undefined }[s] as ReturnType<typeof patternFromSpread>;
}
