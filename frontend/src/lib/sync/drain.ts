// drain(): send what is queued, smallest and most important first, over whatever connection we have.
// Every item is idempotent on the server, so a lost response just means "send again".
import { API_URL, timeoutSignal } from "../api";
import { getBlob, getCase, getKv, getOutbox, getProfile, listCases, listOutbox, putOutbox, saveCase, setKv, type OutboxItem } from "../store/db";
import { photoKey, thumbKey, voiceKey } from "./compress";
import { measureBandwidth, probe, type ProbeResult } from "./probe";
import { enqueue, toBatchCase } from "./outbox";
import { applyBurstPack, getPackVersions } from "../pack/pack";
import type { BatchResult, BurstResult, SyncReport } from "./types";

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

/** `deadline` (epoch ms) = end of the connection window: a request never outlives it. `cut` = it died because of the deadline, not the network. */
async function send(url: string, init: RequestInit, bytes: number, kbps: number, deadline = Infinity): Promise<{ res: Response | null; cut: boolean }> {
  try {
    const ms = Math.min(timeoutMs(bytes, kbps), Math.max(300, deadline - Date.now()));
    return { res: await fetch(url, { ...init, signal: timeoutSignal(ms) }), cut: false };
  } catch {
    return { res: null, cut: Date.now() >= deadline - 100 }; // dropped / timed out
  }
}

async function mark(items: OutboxItem[], o: Outcome | "done" | "requeue", extra?: Partial<OutboxItem>) {
  for (const i of items) {
    const next: OutboxItem =
      o === "requeue"
        ? { ...i, state: "queued" } // window ended mid-request: no penalty, try again at the next window
        : o === "done"
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

/** Facts JSON for outbox items; consent withdrawn / case gone -> permanently dropped. */
async function collectFacts(items: OutboxItem[]) {
  const cases = [];
  const have: OutboxItem[] = [];
  for (const i of items) {
    const c = await getCase(i.case_id);
    if (c?.consent) {
      cases.push(await toBatchCase(c));
      have.push(i);
    } else await mark([i], { permanent: true, retryAfter: null });
  }
  return { cases, have };
}

async function applyFactsResult(have: OutboxItem[], r: BatchResult | null): Promise<{ sent: number; ok: boolean }> {
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

/** Old path (backends without /api/burst): facts alone in POST /api/cases/batch. */
async function sendFacts(items: OutboxItem[], kbps: number, deadline: number): Promise<{ sent: number; ok: boolean }> {
  const { cases, have } = await collectFacts(items);
  if (!have.length) return { sent: 0, ok: true };
  const body = JSON.stringify({ device_id: deviceId(), cases });
  const { res, cut } = await send(`${API_URL}/api/cases/batch`, { method: "POST", headers: { "Content-Type": "application/json" }, body }, body.length, kbps, deadline);
  if (!res || !res.ok) {
    await mark(have, cut ? "requeue" : fail(res));
    return { sent: 0, ok: false };
  }
  return applyFactsResult(have, (await res.json().catch(() => null)) as BatchResult | null);
}

// ---- burst: facts up + pack delta down in ONE request (latency, not bytes, is what a short LTE window runs out of)
let burstUnsupported = false; // an older backend answered 404/405: use the old calls until the page reloads
export const resetBurstSupport = () => (burstUnsupported = false);

async function sendBurst(items: OutboxItem[], upazila: string | undefined, kbps: number, deadline: number, rep: SyncReport): Promise<"ok" | "failed" | "unsupported"> {
  const { cases, have } = await collectFacts(items);
  const body = JSON.stringify({ device_id: deviceId(), upazila: upazila ?? null, pack_versions: upazila ? await getPackVersions(upazila) : {}, cases });
  const { res, cut } = await send(`${API_URL}/api/burst`, { method: "POST", headers: { "Content-Type": "application/json" }, body }, body.length, kbps, deadline);
  if (res && (res.status === 404 || res.status === 405)) return "unsupported";
  if (!res || !res.ok) {
    await mark(have, cut ? "requeue" : fail(res));
    return "failed";
  }
  let r: BurstResult | null = null;
  let text = "";
  try {
    text = await res.text();
    r = JSON.parse(text);
  } catch {
    r = null;
  }
  if (r && !Array.isArray(r.accepted)) return "unsupported"; // valid JSON but not a burst answer: an older backend
  if (!r) {
    // Cut mid-body or a proxy page: nothing is confirmed, so keep everything queued.
    await mark(have, cut || Date.now() >= deadline - 100 ? "requeue" : { permanent: false, retryAfter: null });
    return "failed";
  }
  rep.bytes_up += body.length;
  rep.bytes_down += text.length;
  const f = await applyFactsResult(have, r);
  rep.sent.facts += f.sent;
  if (r.pack && upazila) {
    const a = await applyBurstPack(upazila, r.pack);
    rep.received.push(...a.received);
    rep.new_replies += a.newReplies;
  }
  return f.ok ? "ok" : "failed";
}

const BLOB: Record<string, { key: (id: string) => string; path: string }> = {
  thumb: { key: thumbKey, path: "thumb" },
  photo: { key: photoKey, path: "photo" },
  voice: { key: voiceKey, path: "voice" },
};

async function sendBlob(i: OutboxItem, kbps: number, deadline: number, rep: SyncReport): Promise<boolean> {
  const b = await getBlob(BLOB[i.kind].key(i.case_id));
  if (!b) return mark([i], { permanent: true, retryAfter: null }).then(() => true); // nothing to send; move on
  const { res, cut } = await send(
    `${API_URL}/api/cases/${encodeURIComponent(i.case_id)}/${BLOB[i.kind].path}`,
    { method: "PUT", headers: { "Content-Type": b.type || "application/octet-stream" }, body: b },
    b.size,
    kbps,
    deadline,
  );
  if (res?.ok) {
    await mark([i], "done");
    rep.bytes_up += b.size;
    rep.sent[i.kind === "thumb" ? "thumbs" : i.kind === "photo" ? "photos" : "voice"]++;
    return true;
  }
  if (cut) {
    await mark([i], "requeue");
    return false;
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
export const BURST_BUDGET_MS = 15_000; // the pitch: "15 seconds of LTE was enough"
const PACK_ONLY_EVERY_MS = 5 * 60_000; // a pack-only burst (nothing to send) at most this often, unless forced
const REPORT_KEY = "sync_report";
export const SYNC_REPORT_EVENT = "sync:report";

export async function getLastSyncReport(): Promise<SyncReport | null> {
  return (await getKv<SyncReport>(REPORT_KEY)) ?? null;
}

/** One connection window. Plan: (a) probe <=2 s, (b) /api/burst, (c) thumbs, (d) voice/photos if the time and measured speed allow,
 *  (e) stop at the deadline; whatever is not confirmed stays queued for the next window. */
async function run(force: boolean, budgetMs?: number): Promise<DrainResult> {
  const t0 = Date.now();
  const onWifi = (navigator as unknown as { connection?: { type?: string } }).connection?.type === "wifi";
  const budget = budgetMs ?? (onWifi ? 120_000 : BURST_BUDGET_MS);
  const deadline = t0 + budget;
  const left = () => deadline - Date.now();
  const rep: SyncReport = {
    started_at: new Date(t0).toISOString(), ms: 0, budget_ms: budget, sent: { facts: 0, thumbs: 0, photos: 0, voice: 0 },
    received: [], new_replies: 0, bytes_up: 0, bytes_down: 0, stopped_by_budget: false,
  };

  // (a) probe: our own server answers, within 2 s
  const p = await probe({ timeoutMs: Math.min(2000, budget), bandwidth: false });
  last = { online_probe: p.status, kbps: Math.round(p.kbps) };
  if (p.status !== "ok") {
    emit();
    return { sent: 0, failed: true };
  }
  // A case shared while offline is only marked "queued"; fill the outbox now, so reconnecting alone sends it. enqueue() is idempotent.
  for (const c of await listCases()) if (c.consent && c.share === "queued") await enqueue(c).catch(() => {});

  let failed = false;
  const due = async (kind: OutboxItem["kind"]) =>
    (await listOutbox()).filter((i) => i.state === "queued" && i.kind === kind && (force || i.next_at <= Date.now())).sort((a, b) => a.created_at - b.created_at);
  const upazila = (await getProfile().catch(() => ({}) as { upazila?: string })).upazila;

  // (b) one round trip: up to 20 facts + the changed pack parts. A pack-only burst when there is nothing to send, but not every minute.
  const lastBurst = (await getKv<number>("burst_last_at")) ?? 0;
  let facts = await due("facts");
  if (!burstUnsupported && left() > 1000 && (facts.length || (upazila && (force || Date.now() - lastBurst > PACK_ONLY_EVERY_MS)))) {
    do {
      const r = await sendBurst(facts.slice(0, BATCH), upazila, p.kbps, deadline, rep);
      if (r === "unsupported") {
        burstUnsupported = true;
        break;
      }
      if (r === "failed") failed = true;
      else await setKv("burst_last_at", Date.now());
      facts = r === "ok" ? facts.slice(BATCH) : [];
      emit();
    } while (!failed && facts.length && left() > 1000);
  }
  if (burstUnsupported && !failed) {
    // Old backend: facts alone, in batches (the pack is then refreshed by refreshPack when the area news is opened).
    while (facts.length && left() > 500) {
      const r = await sendFacts(facts.slice(0, BATCH), p.kbps, deadline);
      rep.sent.facts += r.sent;
      if (!r.ok) {
        failed = true;
        break;
      }
      facts = facts.slice(BATCH);
      emit();
    }
  }

  // (c) thumbnails: small, any connection; (d) voice, then photos, only if the measured speed says they fit in what is left
  let kbps = p.kbps;
  const blobs = async () => {
    if (failed) return;
    // strict order: nothing jumps ahead of facts that are still waiting (backoff, cut by the window)
    if ((await listOutbox()).some((i) => i.state === "queued" && i.kind === "facts")) return;
    for (const kind of ["thumb", "voice", "photo"] as const) {
      if (kind !== "thumb") {
        if (left() < 5000 && !onWifi) return;
        if (!kbps || Date.now() - lastBandwidthAt > 30_000) {
          const m = await measureBandwidth(p.saveData, Math.min(4000, Math.max(500, left() / 3)));
          kbps = m.kbps;
          lastBandwidthAt = Date.now();
          last = { ...last, kbps: Math.round(kbps) };
        }
      }
      const maxTier = await allowedTier({ ...p, kbps });
      const items = await due(kind);
      const waiting = (await listOutbox()).filter((i) => i.state === "queued" && i.kind === kind).length > items.length;
      for (const i of items) {
        if (i.tier > maxTier) break;
        const need = kbps > 0 ? (i.bytes / (kbps * 125)) * 1.3 * 1000 : 0; // ms; only the big ones are checked against the window
        if (left() < 500 || (kind !== "thumb" && need > left())) return;
        if (!(await sendBlob(i, kbps, deadline, rep))) {
          failed = true;
          return;
        }
        emit();
      }
      if (waiting) return; // an item of this kind is in backoff: do not skip ahead of it
    }
  };
  await blobs();

  rep.stopped_by_budget = left() <= 0 || (!failed && (await listOutbox()).some((i) => i.state === "queued" && i.kind !== "log" && i.tier <= 3 && left() < 500));
  rep.ms = Date.now() - t0;
  const did = rep.sent.facts + rep.sent.thumbs + rep.sent.photos + rep.sent.voice + rep.received.length > 0;
  if (did) {
    await setKv(REPORT_KEY, rep);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SYNC_REPORT_EVENT, { detail: rep }));
  }
  if (rep.sent.facts || !failed) await setKv("sync_last_success", Date.now());
  emit();
  return { sent: rep.sent.facts, failed };
}
let lastBandwidthAt = 0;

let running = false;
/** One drain at a time, across tabs where Web Locks exist. Never throws. */
export async function drain(opts: { force?: boolean; budgetMs?: number } = {}): Promise<DrainResult> {
  const guarded = async (): Promise<DrainResult> => {
    try {
      return await run(!!opts.force, opts.budgetMs);
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
