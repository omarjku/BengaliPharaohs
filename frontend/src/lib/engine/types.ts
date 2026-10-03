// Shared types for the offline decision engine. No LLM: every path ends in a fixed card id.

export type OutputCode =
  | "SURVIVES_CHECK"
  | "GAP_FILL"
  | "REPLANT_SHORT_DURATION"
  | "DIRECT_SEED"
  | "TOO_LATE_AMAN"
  | "NOT_SURE_ASK_SAAO";

export type Season = "aman" | "aus" | "boro";
export type Stage = "seedbed" | "early_tillering" | "tillering" | "pi_booting" | "flowering" | "grain_filling";
export type Region = "floodplain" | "haor" | "coastal" | "barind";

/** Inputs of the after-flood advisor (docs/advisor-rules.md §1). Absent = not answered. */
export type AdvisorInput = {
  season?: Season;
  variety_type?: "sub1" | "conventional" | "unknown";
  submergence?: "full" | "partial";
  days_under_water?: number;
  stage?: Stage;
  date?: string; // ISO yyyy-mm-dd
  region?: Region;
  north?: boolean;
  salty_water?: "yes" | "no" | "unknown";
  hills_alive?: "most" | "about_half" | "few";
  seedlings_available?: "yes" | "no" | "unknown";
};

export type AdvisorResult = {
  output: OutputCode;
  ruleId: string;
  params: Record<string, unknown>;
  sources: string[];
  status?: string;
  outlook?: string;
  outlookRuleId?: string;
  md?: string;
};

/** Classifier output after calibration (src/lib/model/classify.ts). */
export type Prediction = {
  top1: string;
  p1: number;
  top2: string;
  p2: number;
  probs: Record<string, number>;
};

export type CrossDecision = "keep" | "swap" | "not_sure" | "location_guard";

export type CrossResult = {
  decision: CrossDecision;
  /** Chosen class (never outside the model's top-2), or null for not_sure / location_guard. */
  cls: string | null;
  card: CardId;
  /** Follow-up question ids from knowledge.json, most useful first (max 2). */
  ask: string[];
  /** Machine-readable reasons, shown in the "why" list. */
  reasons: string[];
  support: Record<string, { favours: string[]; conflicts: string[] }>;
  lookalike?: string;
};

export type CardId =
  | "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8" | "C9"
  | "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7";
