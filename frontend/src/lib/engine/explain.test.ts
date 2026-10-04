import { describe, expect, it } from "vitest";
import knowledge from "../../../public/data/knowledge.json";
import { alreadyAnswered, CONDITION_PHRASES, candidates, contextTips, fitLines, stageTask } from "./explain";
import { conditionsFrom, LOOK_CONDITIONS } from "./context";

describe("plain-language explanation", () => {
  it("every knowledge-base condition has a phrase the farmer understands", () => {
    for (const c of Object.keys(knowledge.conditions)) expect(CONDITION_PHRASES[c], `add a phrase for "${c}"`).toBeTruthy();
  });
  it("every 'what does it look like' answer maps to conditions with phrases", () => {
    for (const conds of Object.values(LOOK_CONDITIONS)) for (const c of conds) expect(CONDITION_PHRASES[c]).toBeTruthy();
  });
  it("fit lines: favours count for, unlikely_if counts against", () => {
    const conds = conditionsFrom({ look: "eye", urea: "a_lot" }, { season: "boro" });
    const [blast] = fitLines(conds, ["blast"]);
    expect(blast.lines.filter((l) => l.good).length).toBeGreaterThanOrEqual(3); // eye-shaped, urea, boro
    const [bs] = fitLines(conds, ["brown_spot"]);
    expect(bs.lines.some((l) => !l.good)).toBe(true); // eye-shaped + urea speak against brown spot
  });
  it("follow-up already settled by the look answer is not asked again", () => {
    expect(alreadyAnswered("q_eye_shaped_grey_centre", conditionsFrom({ look: "eye" }, {}))).toBe(true);
    expect(alreadyAnswered("q_eye_shaped_grey_centre", conditionsFrom({ look: "round" }, {}))).toBe(true);
    expect(alreadyAnswered("q_eye_shaped_grey_centre", [])).toBe(false);
  });
  it("mould colour shows in the fit list", () => {
    const [blast] = fitLines(conditionsFrom({ mould: "grey" }, {}), ["blast"]);
    expect(blast.lines.some((l) => l.good && l.phrase.en.includes("grey powder"))).toBe(true);
  });
  it("tips fire only for the matching problem + answer", () => {
    expect(contextTips(["urea_high"], ["blast"]).length).toBe(1);
    expect(contextTips(["urea_high"], ["tungro"]).length).toBe(0);
    expect(contextTips(["field_dry"], ["blast"]).length).toBe(0);
  });
  it("stage task respects the season", () => {
    expect(stageTask("early_tillering", "boro")).toBeTruthy();
    expect(stageTask(undefined, "aman")).toBeUndefined();
  });
  it("candidates: chosen class, else top-2, plus look-alike; never not_rice", () => {
    expect(candidates({ decision: "not_sure", cls: null, card: "C8", ask: [], reasons: [], support: {}, lookalike: "zn_def" }, { top1: "brown_spot", p1: 0.5, top2: "not_rice", p2: 0.3, probs: {} })).toEqual(["brown_spot", "zn_def"]);
  });
});
