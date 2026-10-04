// Client for the backend. The contract is in ../../contract/api.md.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RunHandlers = {
  onToken: (text: string) => void;
  onDone?: (id: number) => void;
  onError?: (message: string) => void;
};

type SSEEvent = { event: string; data: string };

/** Parse one SSE block ("event: x\ndata: y"). Supports "data:" without a space and multi-line data. */
function parseBlock(block: string): SSEEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    const m = /^(\w+):\s?(.*)$/.exec(line);
    if (!m) continue;
    if (m[1] === "event") event = m[2];
    else if (m[1] === "data") data.push(m[2]);
  }
  return data.length ? { event, data: data.join("\n") } : null;
}

/**
 * POST /api/run and read the server-sent events stream.
 * Always ends with exactly one onDone or onError call, so the UI can never get stuck.
 */
export async function streamRun(input: string, h: RunHandlers, signal?: AbortSignal): Promise<void> {
  let finished = false;
  const fail = (m: string) => {
    if (!finished) {
      finished = true;
      h.onError?.(m);
    }
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
      signal,
    });
  } catch {
    if (!signal?.aborted) fail(`Can't reach the backend at ${API_URL}. Is it running?`);
    return;
  }
  if (!res.ok || !res.body) return fail(`Backend returned ${res.status}.`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  const handle = (block: string) => {
    const ev = parseBlock(block);
    if (!ev || finished) return;
    const d = JSON.parse(ev.data);
    if (ev.event === "token") h.onToken(d.text);
    else if (ev.event === "done") {
      finished = true;
      h.onDone?.(d.id);
    } else if (ev.event === "error") fail(d.message);
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      buf += done ? decoder.decode() : decoder.decode(value, { stream: true });
      buf = buf.replace(/\r\n?/g, "\n");
      let i: number;
      while ((i = buf.indexOf("\n\n")) !== -1) {
        handle(buf.slice(0, i));
        buf = buf.slice(i + 2);
      }
      if (done) break;
    }
    if (buf.trim()) handle(buf);
  } catch (e) {
    if (!signal?.aborted) fail(e instanceof Error ? `Stream failed: ${e.message}` : "Stream failed.");
    return;
  }
  if (!signal?.aborted) fail("The stream ended before the answer finished.");
}

export type Health = { ok: boolean; provider: "anthropic" | "openai" | "mock" };

/** GET /api/health. Throws on network failure or a non-2xx status, so callers can show an error state. */
export async function getHealth(signal?: AbortSignal): Promise<Health> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/health`, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error(`Can't reach the backend at ${API_URL}. Is it running?`);
  }
  if (!res.ok) throw new Error(`Backend returned ${res.status}.`);
  return res.json();
}

export type Run = { id: number; input: string; output: string; provider: string; created_at: string };

export async function listRuns(): Promise<Run[]> {
  const res = await fetch(`${API_URL}/api/runs`);
  return res.ok ? res.json() : [];
}

/** Patchy 2G/3G: never wait forever. Combines the caller's signal with a timeout. */
const withTimeout = (signal: AbortSignal | undefined, ms: number) =>
  signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);

// ---- Rice app endpoints: PROPOSED in contract/api.md (agree with Omar, then mark AGREED) ----

export type ContextPack = {
  upazila: string;
  as_of: string;
  seeded?: boolean;
  flood: { station: string; level_m: number; danger_m: number; trend: "rising" | "steady" | "falling"; outlook_days: number; as_of: string } | null;
  rain: { last_10d_mm: number; forecast_3d_mm: number; as_of: string } | null;
  rules_version?: string;
  cards_version?: string;
  price: { paddy_tk_per_maund: number; market: string; as_of: string } | null;
};

/** GET /api/context — small pack for a short connection. Returns null on any failure: the app must work without it. */
export async function getContext(upazila: string, signal?: AbortSignal): Promise<ContextPack | null> {
  try {
    const res = await fetch(`${API_URL}/api/context?upazila=${encodeURIComponent(upazila)}`, { signal: withTimeout(signal, 8000) });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

/** One shared case. No name, no GPS. Fields beyond the contract (card, kind, ...) are extra context for the SAAO. */
export type SyncCase = {
  case_id: string;
  created_at: string;
  upazila: string;
  class: string;
  confidence: number | null;
  taps: Record<string, unknown>;
  output_code: string;
  consent: true;
  card?: string;
  kind?: "leaf" | "flood" | "drought";
  date_used?: string;
  simulated_date?: boolean;
  photo_jpeg_b64?: string;
  /** Farmer's voice note (base64), only with consent. Mime is usually audio/webm (Android) or audio/mp4 (iPhone). */
  voice_b64?: string;
  voice_mime?: string;
};
export type SyncResult = { accepted: string[]; rejected: { case_id: string; reason: string }[] };

/** POST /api/sync — idempotent on case_id. Throws on network failure so the queue keeps the cases. */
export async function syncCases(device_id: string, cases: SyncCase[]): Promise<SyncResult> {
  const res = await fetch(`${API_URL}/api/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id, cases }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  return res.json();
}

export type CaseReply = { id: number; case_id: string; text: string; by: string; created_at: string };
export type ServerCase = SyncCase & {
  received_at: string;
  seeded?: boolean;
  /** Which files the server holds (GET /api/cases/{id}/thumb|photo|voice, SAAO code needed). */
  blobs?: { thumb: boolean; photo: boolean; voice: boolean };
  reply?: CaseReply | null;
};

/** One stored file of a case as a Blob (the files need the SAAO code header, so <img src> cannot fetch them). Null if missing. */
export async function fetchCaseBlob(caseId: string, kind: "thumb" | "photo" | "voice", signal?: AbortSignal): Promise<Blob | null> {
  try {
    const res = await fetch(`${API_URL}/api/cases/${encodeURIComponent(caseId)}/${kind}`, { headers: saaoHeaders(), signal: withTimeout(signal, 20000) });
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

/** POST /api/cases/{id}/reply — the SAAO's short answer; shows up on the farmer's phone via the pack's case_replies. */
export async function postReply(caseId: string, text: string): Promise<CaseReply> {
  const res = await fetch(`${API_URL}/api/cases/${encodeURIComponent(caseId)}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...saaoHeaders() },
    body: JSON.stringify({ text, by: "saao" }),
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 401) forgetSaaoCode();
  if (!res.ok) throw new Error(`Backend returned ${res.status}.`);
  return res.json();
}

/** GET /api/cases — SAAO dashboard, newest first. Throws if the backend is unreachable. */
export async function listServerCases(upazila?: string, signal?: AbortSignal): Promise<ServerCase[]> {
  const q = upazila ? `?upazila=${encodeURIComponent(upazila)}` : "";
  const res = await fetch(`${API_URL}/api/cases${q}`, { headers: saaoHeaders(), signal: withTimeout(signal, 8000) });
  if (res.status === 401) {
    forgetSaaoCode();
    throw new Error("SAAO code required.");
  }
  if (!res.ok) throw new Error(`Backend returned ${res.status}.`);
  return res.json();
}

// The dashboard (case list, photos, replies) needs the SAAO code the backend has in SAAO_TOKEN.
// Asked once and kept on this device; farmers' phones never need it.
function saaoHeaders(): Record<string, string> {
  try {
    let code = localStorage.getItem("saao_code");
    if (!code) {
      code = window.prompt("SAAO code") ?? "";
      if (code) localStorage.setItem("saao_code", code);
    }
    return code ? { "X-SAAO-Token": code } : {};
  } catch {
    return {};
  }
}
function forgetSaaoCode() {
  try {
    localStorage.removeItem("saao_code");
  } catch {}
}
