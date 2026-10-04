export type BatchCase = {
  case_id: string;
  created_at: string;
  kind: "leaf" | "flood" | "drought";
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
