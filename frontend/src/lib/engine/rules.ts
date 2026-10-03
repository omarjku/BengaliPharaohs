// After-flood advisor: evaluates public/data/rules.json (copied from docs/advisor-rules.md §7).
// Contract (§7): validate → guards → outlook (vegetative only) → rules → fallback. First match wins.
import rulesJson from "../../../public/data/rules.json";
import type { AdvisorInput, AdvisorResult, OutputCode } from "./types";

type Cond = {
  eq?: unknown;
  ne?: unknown;
  in?: unknown[];
  not_in?: unknown[];
  lte?: number | string;
  gte?: number | string;
  between?: [number | string, number | string];
  missing?: boolean;
};
type When = Record<string, Cond | boolean>;
type InputSpec = { type: "enum" | "int" | "date" | "bool"; values?: string[]; min?: number; max?: number; required: boolean };
type RuleRow = { id: string; when: When; output: string; params?: Record<string, unknown>; sources?: string[]; status?: string };
type OutlookRow = { id: string; when: When; outlook: string; sources?: string[]; status?: string };

export type RuleSet = {
  version: string;
  inputs: Record<string, InputSpec>;
  vegetative_stages: string[];
  guards: RuleRow[];
  survival_table: OutlookRow[];
  outlook_overrides: OutlookRow[];
  rules: RuleRow[];
  fallback: { id: string; output: string; params: Record<string, unknown> };
  sources: Record<string, { title: string; year: number | null; url: string }>;
};

export const RULES = rulesJson as unknown as RuleSet;

const absent = (v: unknown) => v === undefined || v === null || v === "";

function cmp(a: number | string, b: number | string): number {
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
}

/** One condition on one field. `ne` is true when the field is absent; every other operator is false on absence. */
function test(value: unknown, c: Cond): boolean {
  if (c.missing !== undefined) return absent(value) === c.missing;
  if (c.ne !== undefined) return absent(value) || value !== c.ne;
  if (absent(value)) return false;
  if (c.eq !== undefined) return value === c.eq;
  if (c.in) return c.in.includes(value);
  if (c.not_in) return !c.not_in.includes(value);
  const v = value as number | string;
  if (c.lte !== undefined) return cmp(v, c.lte) <= 0;
  if (c.gte !== undefined) return cmp(v, c.gte) >= 0;
  if (c.between) return cmp(v, c.between[0]) >= 0 && cmp(v, c.between[1]) <= 0;
  return false;
}

function matches(when: When, facts: Record<string, unknown>): boolean {
  return Object.entries(when).every(([field, c]) => typeof c === "object" && test(facts[field], c));
}

/** Returns the names of required inputs that are missing or invalid, plus any optional input that is invalid. */
export function invalidInputs(input: AdvisorInput, rules: RuleSet = RULES): string[] {
  const bad: string[] = [];
  for (const [name, spec] of Object.entries(rules.inputs)) {
    const v = (input as Record<string, unknown>)[name];
    if (absent(v)) {
      if (spec.required) bad.push(name);
      continue;
    }
    const ok =
      spec.type === "enum" ? spec.values!.includes(v as string)
      : spec.type === "int" ? Number.isInteger(v) && (v as number) >= (spec.min ?? -Infinity) && (v as number) <= (spec.max ?? Infinity)
      : spec.type === "bool" ? typeof v === "boolean"
      : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) && !Number.isNaN(Date.parse(String(v)));
    if (!ok) bad.push(name);
  }
  return bad;
}

export function evaluateAdvisor(input: AdvisorInput, rules: RuleSet = RULES): AdvisorResult {
  const result = (row: RuleRow, extra: Partial<AdvisorResult> = {}): AdvisorResult => ({
    output: row.output as OutputCode,
    ruleId: row.id,
    params: row.params ?? {},
    sources: row.sources ?? [],
    status: row.status,
    ...extra,
  });

  // 1. Validate. Never guess a missing input.
  if (invalidInputs(input, rules).length) {
    const g01 = rules.guards.find((g) => g.id === "G01")!;
    return result(g01);
  }

  // 2. md = "MM-DD", compared as zero-padded strings.
  const md = input.date!.slice(5, 10);
  const facts: Record<string, unknown> = { ...input, md };

  // 3. Guards.
  for (const g of rules.guards) {
    if (g.id === "G01") continue;
    if (matches(g.when, facts)) return result(g, { md });
  }

  // 4. Survival outlook, vegetative stages only.
  let outlookRow: OutlookRow | undefined;
  if (rules.vegetative_stages.includes(input.stage!)) {
    outlookRow = rules.survival_table.find((o) => matches(o.when, facts));
    const override = rules.outlook_overrides.find((o) => matches(o.when, facts));
    if (override) outlookRow = override;
    if (outlookRow) facts.outlook = outlookRow.outlook;
  }
  const extra = { md, outlook: outlookRow?.outlook, outlookRuleId: outlookRow?.id };

  // 5. Rules, then fallback.
  for (const r of rules.rules) {
    if (matches(r.when, facts)) return result(r, extra);
  }
  return result({ ...rules.fallback, when: {} }, extra);
}

/** Drought has no rule engine in v1 (advisor-rules.md §6): always card A7. */
export function droughtResult(): AdvisorResult {
  return { output: "NOT_SURE_ASK_SAAO", ruleId: "DROUGHT", params: { reason: "drought" }, sources: ["S_AMAN_GUIDE"] };
}
