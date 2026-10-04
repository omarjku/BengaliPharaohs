// T01–T18: docs/advisor-rules.md §8. X01–X19: docs/knowledge/test-cases.md. Run: npm test
import { describe, expect, it } from "vitest";
import { conditionsFrom } from "./context";
import { crossCheck, DEFAULT_THRESHOLDS } from "./crosscheck";
import { evaluateAdvisor } from "./rules";
import type { AdvisorInput, Prediction } from "./types";

const base = (o: Partial<AdvisorInput>): AdvisorInput => ({ season: "aman", region: "floodplain", ...o });
const cv = (variety_type: AdvisorInput["variety_type"], days: number | undefined, stage: AdvisorInput["stage"], date: string, extra: Partial<AdvisorInput> = {}) =>
  base({ variety_type, submergence: "full", days_under_water: days, stage, date, ...extra });

describe("advisor rules T01–T18", () => {
  const cases: [string, AdvisorInput, string, string, Record<string, unknown>?][] = [
    ["T01", cv("conventional", 2, "tillering", "2026-08-20"), "SURVIVES_CHECK", "D03", { outlook: "usually_survives" }],
    ["T02", cv("sub1", 12, "tillering", "2026-08-25"), "SURVIVES_CHECK", "D04", { outlook: "not_sure", prepare_backup: true }],
    ["T03", cv("sub1", 8, "early_tillering", "2026-10-03"), "SURVIVES_CHECK", "D03", { outlook: "usually_survives" }],
    ["T04", cv("conventional", 9, "tillering", "2026-08-20"), "REPLANT_SHORT_DURATION", "D09", { deadline_md: "09-15" }],
    ["T05", cv("conventional", 9, "tillering", "2026-08-20", { seedlings_available: "no" }), "DIRECT_SEED", "D08", { deadline_md: "08-31" }],
    ["T06", cv("conventional", 10, "tillering", "2026-09-05"), "REPLANT_SHORT_DURATION", "D10", { deadline_md: "09-15" }],
    ["T07", cv("conventional", 10, "tillering", "2026-10-03"), "TOO_LATE_AMAN", "D12"],
    ["T08", cv("unknown", 16, "tillering", "2026-10-03"), "TOO_LATE_AMAN", "D12"],
    ["T09", cv("conventional", 5, "tillering", "2026-10-03", { hills_alive: "few" }), "TOO_LATE_AMAN", "D12"],
    ["T10", cv("conventional", 9, "tillering", "2026-09-18"), "NOT_SURE_ASK_SAAO", "D11", { reason: "cutoff_grey_zone" }],
    ["T11", cv("conventional", 9, "tillering", "2026-09-18", { region: "barind" }), "TOO_LATE_AMAN", "D12"],
    ["T12", cv("conventional", 5, "tillering", "2026-09-02", { hills_alive: "most" }), "GAP_FILL", "D01", { deadline_md: "09-15" }],
    ["T13", cv("conventional", undefined, "tillering", "2026-10-03"), "NOT_SURE_ASK_SAAO", "G01", { reason: "missing_input" }],
    ["T14", cv(undefined, 3, "tillering", "2026-10-03"), "NOT_SURE_ASK_SAAO", "G01", { reason: "missing_input" }],
    ["T15", cv("sub1", 3, "flowering", "2026-10-03"), "NOT_SURE_ASK_SAAO", "G05", { reason: "reproductive_stage_full" }],
    ["T16", cv("conventional", 3, "tillering", "2026-04-10", { season: "boro", region: "haor" }), "NOT_SURE_ASK_SAAO", "G03", { reason: "haor_out_of_scope" }],
    ["T17", cv("conventional", 2, "tillering", "2026-08-20", { region: "coastal" }), "NOT_SURE_ASK_SAAO", "G04", { reason: "possible_salt_water" }],
    ["T18", cv("unknown", 6, "tillering", "2026-08-20"), "NOT_SURE_ASK_SAAO", "D06", { reason: "outlook_unknown" }],
  ];
  it.each(cases)("%s", (_id, input, output, rule, params) => {
    const r = evaluateAdvisor(input);
    expect(r.output).toBe(output);
    expect(r.ruleId).toBe(rule);
    if (params) expect(r.params).toMatchObject(params);
  });

  it("T09 goes through the O12 override", () => {
    expect(evaluateAdvisor(cases[8][1]).outlookRuleId).toBe("O12");
  });
  it("rejects out-of-range days instead of guessing", () => {
    expect(evaluateAdvisor(cv("conventional", 99, "tillering", "2026-08-20")).ruleId).toBe("G01");
  });
});

const p = (top1: string, p1: number, top2: string, p2: number): Prediction => ({ top1, p1, top2, p2, probs: { [top1]: p1, [top2]: p2 } });

describe("cross-check X01–X19", () => {
  type X = [string, Prediction, string[], { decision: string; cls?: string | null; ask?: string }];
  const cases: X[] = [
    ["X01", p("blb", 0.82, "bls", 0.05), ["storm_recent", "flooded_recent", "urea_high", "symptom_tip_edge", "season_aman"], { decision: "keep", cls: "blb" }],
    ["X02", p("blast", 0.55, "brown_spot", 0.38), ["urea_none", "field_dry", "pattern_whole_field"], { decision: "swap", cls: "brown_spot", ask: "q_eye_shaped_grey_centre" }],
    ["X03", p("brown_spot", 0.52, "blast", 0.4), ["cold_nights", "urea_high", "season_boro", "stage_tillering"], { decision: "swap", cls: "blast" }],
    ["X04", p("tungro", 0.61, "healthy", 0.2), ["pattern_whole_field", "old_leaves_first"], { decision: "not_sure", ask: "q_whole_field_old_leaves" }],
    ["X05", p("tungro", 0.7, "blb", 0.15), ["insects_leafhoppers", "pattern_patches", "new_leaves_first", "stage_tillering"], { decision: "keep", cls: "tungro" }],
    ["X06", p("sheath_blight", 0.66, "blast", 0.2), ["symptom_sheath"], { decision: "location_guard", ask: "q_spots_near_water_on_stem" }],
    ["X07", p("blast", 0.74, "brown_spot", 0.12), ["symptom_panicle"], { decision: "location_guard" }],
    ["X08", p("healthy", 0.58, "tungro", 0.3), ["insects_hoppers_base", "pattern_patches"], { decision: "location_guard", ask: "q_tap_base_hoppers" }],
    ["X09", p("blb", 0.48, "leaf_scald", 0.42), ["rain_heavy_7d", "urea_high", "symptom_tip_edge"], { decision: "not_sure", ask: "q_zonate_bands" }],
    ["X10", p("tungro", 0.5, "brown_spot", 0.3), ["cold_nights", "season_boro", "stage_seedling", "pattern_whole_field"], { decision: "not_sure", ask: "q_cold_spell" }],
    ["X11", p("blb", 0.6, "healthy", 0.25), ["region_coastal", "salt_water", "symptom_tip_edge"], { decision: "not_sure", ask: "q_salty_water" }],
    ["X12", p("brown_spot", 0.65, "blast", 0.1), ["season_boro", "stage_tillering", "new_leaves_first"], { decision: "not_sure", ask: "q_khaira_after_transplant" }],
    ["X14", p("brown_spot", 0.7, "blast", 0.08), ["urea_high", "cold_nights"], { decision: "not_sure", ask: "q_eye_shaped_grey_centre" }],
    ["X15", p("healthy", 0.88, "blast", 0.04), ["stage_heading", "old_leaves_first"], { decision: "keep", cls: "healthy", ask: "q_old_leaves_near_harvest" }],
    ["X16", p("blb", 0.55, "blast", 0.3), ["field_dry", "cold_nights"], { decision: "not_sure" }],
    ["X17", p("leaf_scald", 0.62, "blb", 0.3), ["storm_recent", "flooded_recent", "season_aman"], { decision: "swap", cls: "blb" }],
    ["X18", p("sheath_blight", 0.45, "blast", 0.4), ["symptom_middle", "stage_seedling"], { decision: "not_sure", ask: "q_spots_near_water_on_stem" }],
    ["X19a", p("blast", 0.9, "brown_spot", 0.05), ["symptom_base"], { decision: "location_guard" }],
    ["X19b", p("healthy", 0.9, "blast", 0.05), ["pattern_whole_field_dying", "pattern_whole_field"], { decision: "location_guard" }],
  ];
  it.each(cases)("%s", (_id, pred, ctx, exp) => {
    const r = crossCheck(pred, ctx);
    expect(r.decision).toBe(exp.decision);
    if (exp.cls !== undefined) expect(r.cls).toBe(exp.cls);
    if (exp.ask) expect(r.ask).toContain(exp.ask);
    if (r.cls) expect([pred.top1, pred.top2]).toContain(r.cls); // never a class outside top-2
  });

  it("X13 no context: model threshold alone decides", () => {
    const pred = p("blast", 0.4, "tungro", 0.35);
    expect(crossCheck(pred, []).decision).toBe("not_sure");
    expect(crossCheck(pred, [], { ...DEFAULT_THRESHOLDS, min_prob: 0.35, min_margin: 0 }).cls).toBe("blast");
  });
  it("not_rice on top is NOT SURE (C8), even confident and even if context favours top-2", () => {
    for (const pr of [p("not_rice", 0.95, "blast", 0.02), p("not_rice", 0.6, "blast", 0.38)]) {
      const r = crossCheck(pr, ["symptom_tip_edge", "season_aman", "stage_heading", "humid_cloudy"], { ...DEFAULT_THRESHOLDS, min_prob: 0.8, min_margin: 0 });
      expect([r.decision, r.card, r.cls]).toEqual(["not_sure", "C8", null]);
    }
  });
  it("context can never switch the answer to not_rice", () => {
    const r = crossCheck(p("blast", 0.55, "not_rice", 0.4), ["urea_none", "field_dry", "pattern_whole_field"]);
    expect(r.cls).not.toBe("not_rice");
    expect(r.card).toBe("C8");
  });
  it("a scattered prediction (not a rice leaf) is not sure even with context", () => {
    expect(crossCheck(p("blast", 0.3, "brown_spot", 0.2), ["cold_nights", "urea_high", "season_boro"]).card).toBe("C8");
  });
});

describe("farmer answers → conditions", () => {
  it("multi-select places and insects all count; don't-know adds nothing", () => {
    const c = conditionsFrom({ where: ["tip_edge", "sheath"], insects: ["green_leafhopper", "bph", "hispa"] }, {});
    expect(c).toEqual(expect.arrayContaining(["symptom_tip_edge", "symptom_sheath", "insects_leafhoppers", "insects_hoppers_base", "insects_hispa"]));
    expect(conditionsFrom({ where: ["unknown"], insects: ["unknown"] }, {})).toEqual([]);
  });
  it("stem borer is a location guard (not a leaf problem)", () => {
    expect(crossCheck(p("blast", 0.9, "brown_spot", 0.05), ["insects_stem_borer"]).decision).toBe("location_guard");
  });
});

describe("targeted follow-up answers", () => {
  const p = (top1: string, p1: number, top2: string, p2: number): Prediction => ({ top1, p1, top2, p2, probs: { [top1]: p1, [top2]: p2 } });

  it("map to existing conditions; 'don't know' adds nothing", () => {
    const c = conditionsFrom({ followups: { q_tip_edge_after_storm: "yes", q_cold_spell: "unknown", q_eye_shaped_grey_centre: "no" } }, {});
    expect(c).toEqual(expect.arrayContaining(["storm_recent", "symptom_tip_edge", "lesion_not_eye_shaped"]));
    expect(c).not.toContain("cold_nights");
  });

  it("eye-shaped spots let context promote blast over brown spot", () => {
    const ctx = conditionsFrom({ followups: { q_eye_shaped_grey_centre: "yes" }, urea: "a_lot", cold_nights: "yes" }, { season: "boro" });
    const r = crossCheck(p("brown_spot", 0.55, "blast", 0.4), ctx, DEFAULT_THRESHOLDS);
    expect(r.decision).toBe("swap");
    expect(r.cls).toBe("blast");
  });

  it("eye-shaped spots conflict with brown spot → NOT SURE rather than a confident brown spot", () => {
    const ctx = conditionsFrom({ followups: { q_eye_shaped_grey_centre: "yes" } }, {});
    expect(crossCheck(p("brown_spot", 0.6, "healthy", 0.3), ctx, DEFAULT_THRESHOLDS).decision).toBe("not_sure");
  });

  it("hoppers at the base from a follow-up fire the location guard", () => {
    const ctx = conditionsFrom({ followups: { q_tap_base_hoppers: "yes" } }, {});
    expect(crossCheck(p("blb", 0.9, "healthy", 0.05), ctx, DEFAULT_THRESHOLDS).decision).toBe("location_guard");
  });
});
