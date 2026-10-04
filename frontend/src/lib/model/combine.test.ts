import { describe, expect, it } from "vitest";
import { combinePredictions } from "./combine";
import type { Prediction } from "../engine/types";

const pred = (probs: Record<string, number>): Prediction => {
  const o = Object.keys(probs).sort((a, b) => probs[b] - probs[a]);
  return { top1: o[0], p1: probs[o[0]], top2: o[1], p2: probs[o[1]], probs };
};

describe("combinePredictions (up to 3 photos)", () => {
  it("one photo is returned unchanged", () => {
    const p = pred({ blast: 0.9, brown_spot: 0.1 });
    expect(combinePredictions([p])).toBe(p);
  });
  it("averages probabilities and re-ranks top-2", () => {
    const r = combinePredictions([
      pred({ blast: 0.6, brown_spot: 0.3, healthy: 0.1 }),
      pred({ blast: 0.2, brown_spot: 0.7, healthy: 0.1 }),
      pred({ blast: 0.1, brown_spot: 0.8, healthy: 0.1 }),
    ]);
    expect(r.top1).toBe("brown_spot");
    expect(r.p1).toBeCloseTo(0.6, 5);
    expect(r.top2).toBe("blast");
    expect(r.p2).toBeCloseTo(0.3, 5);
  });
  it("one odd photo cannot decide alone", () => {
    const r = combinePredictions([pred({ not_rice: 0.95, blast: 0.05 }), pred({ not_rice: 0.05, blast: 0.95 }), pred({ not_rice: 0.05, blast: 0.95 })]);
    expect(r.top1).toBe("blast");
  });
});
