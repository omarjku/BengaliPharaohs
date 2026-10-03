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
