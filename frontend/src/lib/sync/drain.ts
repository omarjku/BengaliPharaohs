// drain(): send what is queued, smallest and most important first, over whatever connection we have.
// Every item is idempotent on the server, so a lost response just means "send again".
import { API_URL } from "../api";
import { getBlob, getCase, getKv, getOutbox, listCases, listOutbox, putOutbox, saveCase, setKv, type OutboxItem } from "../store/db";
import { photoKey, thumbKey, voiceKey } from "./compress";
import { probe, type ProbeResult } from "./probe";
import { enqueue, toBatchCase } from "./outbox";
import type { BatchResult } from "./types";

export type DrainResult = { sent: number; failed: boolean };
export type SyncStatus = {
  pending: { facts: number; thumbs: number; voice: number; photos: number };
  last_success_at: number | null;
  online_probe: ProbeResult["status"];
  kbps: number;
};
export type CaseSyncStatus = { facts_sent: boolean; thumb_sent: boolean; photo_sent: boolean };

const BATCH = 20;
export const PHOTOS_WIFI_ONLY = "photos_wifi_only"; // kv setting (true = photos only on Wi-Fi)

export const timeoutMs = (bytes: number, kbps: number) =>
  Math.min(120_000, Math.max(15_000, kbps > 0 ? (bytes / (kbps * 125)) * 3 * 1000 : 15_000));
export const backoffMs = (attempts: number) => Math.random() * Math.min(300_000, 2000 * 2 ** attempts); // full jitter

function retryAfterMs(res: Response): number | null {
  const v = res.headers.get("Retry-After");
  if (!v) return null;
  if (/^\d+$/.test(v)) return Number(v) * 1000;
  const d = Date.parse(v);
  return Number.isNaN(d) ? null : Math.max(0, d - Date.now());
}

// ---- status + event
let last: Pick<SyncStatus, "online_probe" | "kbps"> = { online_probe: "offline", kbps: 0 };
export async function getSyncStatus(): Promise<SyncStatus> {
  const open = (await listOutbox()).filter((i) => i.state === "queued" || i.state === "sending");
  const n = (k: OutboxItem["kind"]) => open.filter((i) => i.kind === k).length;
  return {
    pending: { facts: n("facts"), thumbs: n("thumb"), voice: n("voice"), photos: n("photo") },
    last_success_at: (await getKv<number>("sync_last_success")) ?? null,
    ...last,
  };
}
export async function getCaseSyncStatus(caseId: string): Promise<CaseSyncStatus> {
  const done = async (k: OutboxItem["kind"]) => (await getOutbox(`${caseId}:${k}`))?.state === "done";
  return { facts_sent: await done("facts"), thumb_sent: await done("thumb"), photo_sent: await done("photo") };
}
function emit() {
  if (typeof window !== "undefined") getSyncStatus().then((detail) => window.dispatchEvent(new CustomEvent("sync:changed", { detail })));
}

// ---- tiers
async function allowedTier(p: ProbeResult): Promise<number> {
  let t = 1; // facts + thumbnail go on any connection
  if (p.kbps >= 100) t = 2;
  const wifiOnly = (await getKv<boolean>(PHOTOS_WIFI_ONLY)) === true;
  const onWifi = (navigator as unknown as { connection?: { type?: string } }).connection?.type === "wifi";
  if (wifiOnly ? onWifi : p.kbps >= 300 && !p.saveData) t = 3;
  return t;
}

// ---- one request
type Outcome = { permanent: boolean; retryAfter: number | null };
const fail = (res: Response | null): Outcome => {
  const s = res?.status ?? 0;
  return { permanent: s >= 400 && s < 500 && s !== 408 && s !== 429, retryAfter: res ? retryAfterMs(res) : null };
};

async function send(url: string, init: RequestInit, bytes: number, kbps: number): Promise<{ res: Response | null }> {
  try {
    return { res: await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs(bytes, kbps)) }) };
  } catch {
    return { res: null }; // dropped / timed out
  }
}

async function mark(items: OutboxItem[], o: Outcome | "done", extra?: Partial<OutboxItem>) {
  for (const i of items) {
    const next: OutboxItem =
      o === "done"
        ? { ...i, state: "done", ...extra }
        : o.permanent
          ? { ...i, state: "failed", attempts: i.attempts + 1 }
          : { ...i, state: "queued", attempts: i.attempts + 1, next_at: Date.now() + (o.retryAfter ?? backoffMs(i.attempts + 1)) };
    await putOutbox(next);
  }
}

async function setShare(caseId: string, share: "synced" | "failed") {
  const c = await getCase(caseId);
  if (c && c.share !== share) await saveCase({ ...c, share, ...(share === "synced" ? { synced_at: new Date().toISOString() } : {}) });
}

async function sendFacts(items: OutboxItem[], kbps: number): Promise<{ sent: number; ok: boolean }> {
  const cases = [];
  const have: OutboxItem[] = [];
  for (const i of items) {
    const c = await getCase(i.case_id);
    if (c?.consent) {
      cases.push(await toBatchCase(c));
      have.push(i);
    } else await mark([i], { permanent: true, retryAfter: null }); // consent withdrawn / case gone
  }
  if (!have.length) return { sent: 0, ok: true };
  const body = JSON.stringify({ device_id: deviceId(), cases });
  const { res } = await send(`${API_URL}/api/cases/batch`, { method: "POST", headers: { "Content-Type": "application/json" }, body }, body.length, kbps);
  if (!res || !res.ok) {
    await mark(have, fail(res));
    return { sent: 0, ok: false };
  }
  const r = (await res.json().catch(() => null)) as BatchResult | null;
  const accepted = new Set(r?.accepted ?? []);
  const rejected = new Set((r?.rejected ?? []).map((x) => x.case_id));
  let sent = 0;
  for (const i of have) {
    if (accepted.has(i.case_id)) {
      await mark([i], "done");
      await setShare(i.case_id, "synced");
      sent++;
    } else if (rejected.has(i.case_id)) {
      await mark([i], { permanent: true, retryAfter: null });
      await setShare(i.case_id, "failed");
    } else await mark([i], { permanent: false, retryAfter: null });
  }
  return { sent, ok: sent === have.length || rejected.size + sent === have.length };
}

const BLOB: Record<string, { key: (id: string) => string; path: string }> = {
  thumb: { key: thumbKey, path: "thumb" },
  photo: { key: photoKey, path: "photo" },
  voice: { key: voiceKey, path: "voice" },
};

async function sendBlob(i: OutboxItem, kbps: number): Promise<boolean> {
  const b = await getBlob(BLOB[i.kind].key(i.case_id));
  if (!b) return mark([i], { permanent: true, retryAfter: null }).then(() => true); // nothing to send; move on
  const { res } = await send(
    `${API_URL}/api/cases/${encodeURIComponent(i.case_id)}/${BLOB[i.kind].path}`,
    { method: "PUT", headers: { "Content-Type": b.type || "application/octet-stream" }, body: b },
    b.size,
    kbps,
  );
  if (res?.ok) {
    await mark([i], "done");
    return true;
  }
  const o = fail(res);
  await mark([i], o);
  return o.permanent; // a permanent 4xx on one blob shouldn't stop the others
}

function deviceId(): string {
  try {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = `anon-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
      localStorage.setItem("device_id", id);
    }
    return id;
  } catch {
    return "anon-unknown";
  }
}

// ---- the loop
async function run(force: boolean): Promise<DrainResult> {
  const p = await probe();
  last = { online_probe: p.status, kbps: Math.round(p.kbps) };
  if (p.status !== "ok") {
    emit();
    return { sent: 0, failed: true };
  }
  // A case shared while offline is only marked "queued"; fill the outbox now, so reconnecting alone sends it
  // (not just app start or "Sync now"). enqueue() is idempotent.
  for (const c of await listCases()) if (c.consent && c.share === "queued") await enqueue(c).catch(() => {});
  const maxTier = await allowedTier(p);
  let sent = 0;
  let failed = false;
  const todo = (await listOutbox())
    .filter((i) => i.state === "queued" && i.tier <= maxTier && i.kind !== "log")
    .sort((a, b) => a.tier - b.tier || a.created_at - b.created_at);
  for (let k = 0; k < todo.length && !failed; ) {
    const i = todo[k];
    if (!force && i.next_at > Date.now()) break; // strict tier order: don't skip ahead of something waiting on backoff
    if (i.kind === "facts") {
      const batch = todo.slice(k).filter((x) => x.kind === "facts" && (force || x.next_at <= Date.now())).slice(0, BATCH);
      const r = await sendFacts(batch, p.kbps);
      sent += r.sent;
      failed = !r.ok;
      k += batch.length;
    } else {
      failed = !(await sendBlob(i, p.kbps));
      k++;
    }
    emit();
  }
  if (sent || !failed) await setKv("sync_last_success", Date.now());
  emit();
  return { sent, failed };
}

let running = false;
/** One drain at a time, across tabs where Web Locks exist. Never throws. */
export async function drain(opts: { force?: boolean } = {}): Promise<DrainResult> {
  const guarded = async (): Promise<DrainResult> => {
    try {
      return await run(!!opts.force);
    } catch {
      return { sent: 0, failed: true };
    }
  };
  if (typeof navigator !== "undefined" && navigator.locks) {
    return (await navigator.locks.request("drain", { ifAvailable: true }, (lock) => (lock ? guarded() : { sent: 0, failed: false }))) as DrainResult;
  }
  if (running) return { sent: 0, failed: false };
  running = true;
  try {
    return await guarded();
  } finally {
    running = false;
  }
}

/** Wire the triggers. Returns a cleanup function. */
export function startSync(onResult?: (r: DrainResult) => void): () => void {
  const go = () => drain().then((r) => onResult?.(r));
  const visible = () => document.visibilityState === "visible";
  const onVis = () => visible() && go();
  const timer = setInterval(() => visible() && go(), 60_000);
  window.addEventListener("pageshow", go);
  window.addEventListener("online", go);
  // Chrome-only Background Sync: the service worker pings us (see public/sw.js); the page does the work.
  const onMsg = (e: MessageEvent) => e.data?.type === "drain" && go();
  navigator.serviceWorker?.addEventListener("message", onMsg);
  document.addEventListener("visibilitychange", onVis);
  return () => {
    clearInterval(timer);
    window.removeEventListener("pageshow", go);
    window.removeEventListener("online", go);
    navigator.serviceWorker?.removeEventListener("message", onMsg);
    document.removeEventListener("visibilitychange", onVis);
  };
}
