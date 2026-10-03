// Store-and-forward: cases the farmer agreed to share wait in IndexedDB ("queued") and go up when there is signal.
// Triggers: the `online` event, app start, and the "Sync now" button. (Background Sync is Chrome-only, so not relied on.)
import { syncCases, type SyncCase } from "./api";
import { getPhoto, getVoice, listCases, saveCase, type CaseRecord } from "./store/db";

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

async function blobToB64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function toSyncCase(c: CaseRecord): Promise<SyncCase> {
  const taps: Record<string, unknown> = c.kind === "leaf" ? { ...c.answers, conditions: c.conditions } : { ...c.advisor_input };
  const photo = c.share_photo ? await getPhoto(c.id) : undefined;
  const voice = c.share_voice ? await getVoice(c.id) : undefined;
  return {
    case_id: c.id,
    created_at: c.created_at,
    upazila: c.upazila ?? "unknown",
    class: c.kind === "leaf" ? (c.cross?.cls ?? "not_sure") : "n/a",
    confidence: c.prediction ? Number(c.prediction.p1.toFixed(3)) : null,
    taps,
    output_code: c.advisor?.output ?? c.cross?.decision ?? "",
    consent: true,
    card: c.card,
    kind: c.kind,
    date_used: c.date_used,
    simulated_date: c.simulated_date,
    photo_jpeg_b64: photo ? await blobToB64(photo) : undefined,
    voice_b64: voice ? await blobToB64(voice) : undefined,
    voice_mime: voice?.type || undefined,
  };
}

let running: Promise<{ sent: number; failed: boolean }> | null = null;

/** Sends every queued case. Never throws; failures stay queued for the next try. */
export function syncQueued(): Promise<{ sent: number; failed: boolean }> {
  running ??= (async () => {
    const queued = (await listCases()).filter((c) => c.consent && (c.share === "queued" || c.share === "failed"));
    if (!queued.length) return { sent: 0, failed: false };
    try {
      const res = await syncCases(deviceId(), await Promise.all(queued.map(toSyncCase)));
      const ok = new Set(res.accepted);
      const now = new Date().toISOString();
      for (const c of queued) {
        await saveCase(ok.has(c.id) ? { ...c, share: "synced", synced_at: now } : { ...c, share: "failed" });
      }
      return { sent: ok.size, failed: ok.size < queued.length };
    } catch {
      return { sent: 0, failed: true };
    }
  })().finally(() => {
    running = null;
  });
  return running;
}
