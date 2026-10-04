export type BatchCase = {
  case_id: string;
  created_at: string;
  kind: "leaf" | "flood" | "drought" | "note";
  upazila: string;
  class: string;
  confidence: number | null;
  taps: Record<string, unknown>;
  output_code: string;
  card: string;
  date_used: string;
  simulated_date: boolean;
  consent: true;
  has_thumb: boolean;
  has_photo: boolean;
  has_voice: boolean;
};
export type BatchResult = { accepted: string[]; rejected: { case_id: string; reason: string }[] };

/** POST /api/burst response (contract/api.md). `pack` holds only the parts whose version changed. */
export type BurstResult = BatchResult & {
  pack: null | {
    upazila: string;
    versions?: { rules?: string; cards?: string };
    parts: Record<string, { version: string; source?: string; seeded?: boolean; fetched_at: string; valid_until?: string; data: unknown }>;
  };
  server_time?: string;
};

/** What one connection window achieved. Stored in kv "sync_report"; see getLastSyncReport(). */
export type SyncReport = {
  started_at: string;
  ms: number;
  budget_ms: number;
  sent: { facts: number; thumbs: number; photos: number; voice: number };
  received: string[]; // pack parts that changed, in the order they arrived
  new_replies: number;
  bytes_up: number;
  bytes_down: number; // decoded size (gzip not counted)
  stopped_by_budget: boolean;
};
