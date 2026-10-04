// Up to 3 photos of the same field: average the calibrated probabilities. One odd photo (blurry, wrong leaf)
// then counts for a third instead of deciding alone. Pure function so it is unit-tested.
import type { Prediction } from "../engine/types";

export function combinePredictions(preds: Prediction[]): Prediction {
  if (preds.length === 0) throw new Error("no predictions");
  if (preds.length === 1) return preds[0];
  const labels = Object.keys(preds[0].probs);
  const probs = Object.fromEntries(labels.map((l) => [l, preds.reduce((s, p) => s + (p.probs[l] ?? 0), 0) / preds.length]));
  const order = [...labels].sort((a, b) => probs[b] - probs[a]);
  return { top1: order[0], p1: probs[order[0]], top2: order[1], p2: probs[order[1]], probs };
}
