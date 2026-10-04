// "Is there a real connection to OUR server, and how fast?" navigator.onLine can't say (captive portals, empty data balance).
import { API_URL, timeoutSignal } from "../api";

export type ProbeResult = { status: "ok" | "captive" | "offline"; kbps: number; saveData: boolean };

type Conn = { saveData?: boolean; effectiveType?: string };
const conn = (): Conn => (typeof navigator !== "undefined" ? ((navigator as unknown as { connection?: Conn }).connection ?? {}) : {});
const HINT_KBPS: Record<string, number> = { "slow-2g": 20, "2g": 50, "3g": 400, "4g": 5000 };

let ewma = 0; // kbps, smoothed
let lastMeasured = 0;
export function resetProbe() {
  ewma = 0;
  lastMeasured = 0;
}

/** `bandwidth: false` = only the tiny health check (short connection windows time the bandwidth later, if it is needed). */
export async function probe(opts: { timeoutMs?: number; bandwidth?: boolean } = {}): Promise<ProbeResult> {
  const saveData = !!conn().saveData;
  try {
    const res = await fetch(`${API_URL}/api/health?t=${Date.now()}`, { cache: "no-store", signal: timeoutSignal(opts.timeoutMs ?? 4000) });
    // A captive portal answers 200 with its own HTML: only our server sets X-Health or answers {"ok":true}.
    // (Cross-origin, X-Health is only readable if the backend exposes it via CORS, so the JSON body counts too.)
    const ours = res.ok && (res.headers.get("X-Health") === "1" || (await res.json().catch(() => null))?.ok === true);
    if (!ours) return { status: "captive", kbps: 0, saveData };
  } catch {
    return { status: "offline", kbps: 0, saveData };
  }
  return opts.bandwidth === false ? { status: "ok", kbps: ewma || hintKbps(), saveData } : measureBandwidth(saveData);
}

const hintKbps = () => HINT_KBPS[conn().effectiveType ?? ""] ?? 0;

/** Time a 32 KB download, at most every 30 s. Costs one round trip + ~2 s on 3G: only when photos/voice are waiting. */
export async function measureBandwidth(saveData = !!conn().saveData, maxMs = 10_000): Promise<ProbeResult> {
  if (!ewma || Date.now() - lastMeasured > 30_000) {
    try {
      const t0 = performance.now();
      const res = await fetch(`${API_URL}/api/probe.bin?t=${Date.now()}`, { cache: "no-store", signal: timeoutSignal(maxMs) });
      const bytes = (await res.arrayBuffer()).byteLength;
      const ms = Math.max(1, performance.now() - t0);
      if (res.ok && bytes) {
        const kbps = (bytes * 8) / ms; // bits per ms == kbit/s
        ewma = ewma ? 0.7 * ewma + 0.3 * kbps : kbps;
        lastMeasured = Date.now();
      }
    } catch {
      // keep the old estimate; fall through to the hint
    }
  }
  return { status: "ok", kbps: ewma || hintKbps(), saveData };
}
