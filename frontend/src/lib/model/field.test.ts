import { describe, expect, it } from "vitest";
import type { Prediction } from "../engine/types";
import { combineForEngine, MIN_SPOTS, patternFromSpread, summarizeField } from "./field";

const th = { min_prob: 0.8, min_margin: 0 };
const P = (top1: string, p1: number, top2 = "healthy"): Prediction => ({ top1, p1, top2, p2: (1 - p1) / 2, probs: { [top1]: p1, [top2]: (1 - p1) / 2 } });
const many = (cls: string, n: number, p = 0.95) => Array.from({ length: n }, () => P(cls, p));

describe("summarizeField", () => {
  it("counts classes and applies the per-photo NOT SURE threshold", () => {
    const s = summarizeField([P("blast", 0.95), P("blast", 0.79), P("healthy", 0.9)], th);
    expect(s.counts).toEqual({ blast: 1, not_sure: 1, healthy: 1 });
  });
  it("not_rice and unreadable photos count as not sure", () => {
    const s = summarizeField([P("not_rice", 0.99), undefined, P("blast", 0.9)], th);
    expect(s.counts.not_sure).toBe(2);
    expect(s.spread).toBe("unclear");
  });
  it("whole_field: share above 0.6", () => {
    const s = summarizeField([...many("blast", 7), ...many("healthy", 2), P("blast", 0.3)], th);
    expect(s).toMatchObject({ n: 10, dominant: "blast", spread: "whole_field" });
    expect(s.share).toBeCloseTo(7 / 9);
  });
  it("patches 0.25-0.6 and its edges", () => {
    expect(summarizeField([...many("blast", 3), ...many("healthy", 7)], th).spread).toBe("patches"); // 0.3
    expect(summarizeField([...many("blast", 2), ...many("healthy", 6)], th).spread).toBe("patches"); // 0.25
    expect(summarizeField([...many("blast", 3), ...many("healthy", 2)], th).spread).toBe("patches"); // 0.6 exactly
  });
  it("isolated: one spot, or share under 0.25", () => {
    expect(summarizeField([...many("blast", 1), ...many("healthy", 2)], th).spread).toBe("isolated");
    expect(summarizeField([...many("blast", 2), ...many("healthy", 8)], th).spread).toBe("isolated"); // 0.2
  });
  it("unclear when more than half are not sure, not when exactly half", () => {
    expect(summarizeField([...many("blast", 1), P("blb", 0.3), P("blb", 0.3)], th).spread).toBe("unclear");
    expect(summarizeField([...many("blast", 2), P("blb", 0.3), P("blb", 0.3)], th).spread).toBe("whole_field");
  });
  it("all healthy -> healthy spread, no dominant", () => {
    expect(summarizeField(many("healthy", 3), th)).toMatchObject({ dominant: null, spread: "healthy", healthyShare: 1 });
  });
  it("ties are decided by summed probability, not photo order", () => {
    const a = [P("blast", 0.85), P("brown_spot", 0.99), P("healthy", 0.9)];
    expect(summarizeField(a, th).dominant).toBe("brown_spot");
    expect(summarizeField([...a].reverse(), th).dominant).toBe("brown_spot");
  });
  it("margin rule", () => {
    expect(summarizeField([P("blast", 0.9, "brown_spot")], { min_prob: 0.8, min_margin: 0.95 }).counts).toEqual({ not_sure: 1 });
  });
  it("needs at least 3 spots", () => expect(MIN_SPOTS).toBe(3));
});

describe("combineForEngine / pattern", () => {
  it("one odd not-sure photo does not dilute the confident ones", () => {
    const r = combineForEngine([P("blast", 0.9), P("blast", 0.95), P("healthy", 0.4, "blast")], th);
    expect(r.top1).toBe("blast");
    expect(r.p1).toBeCloseTo(0.925);
  });
  it("falls back to all photos when none is confident", () => {
    expect(combineForEngine([P("blast", 0.5), P("blast", 0.6)], th).p1).toBeCloseTo(0.55);
  });
  it("pattern is pre-filled from the spread", () => {
    expect(patternFromSpread("isolated")).toBe("one_hill");
    expect(patternFromSpread("patches")).toBe("patches");
    expect(patternFromSpread("whole_field")).toBe("whole_field");
    expect(patternFromSpread("healthy")).toBe("none");
    expect(patternFromSpread("unclear")).toBeUndefined();
  });
});
