// Store-and-forward entry point kept for the pages: cases the farmer agreed to share wait in the outbox and go up
// facts-first when there is signal. The engine lives in ./sync/ (outbox, probe, drain); see docs/sync-plan.md.
import { listCases, putOutbox, listOutbox } from "./store/db";
import { drain, type DrainResult } from "./sync/drain";
import { enqueue } from "./sync/outbox";

export { drain, getSyncStatus, getCaseSyncStatus, startSync } from "./sync/drain";
export { enqueue } from "./sync/outbox";

/** Queue every consented, unsent case (and give permanently failed items another chance), then drain. Never throws. */
export async function syncQueued(): Promise<DrainResult> {
  try {
    const open = (await listCases()).filter((c) => c.consent && (c.share === "queued" || c.share === "failed"));
    for (const c of open) await enqueue(c);
    const ids = new Set(open.map((c) => c.id));
    for (const i of await listOutbox()) if (i.state === "failed" && ids.has(i.case_id)) await putOutbox({ ...i, state: "queued", attempts: 0, next_at: 0 });
    // Chrome-only bonus: ask for a Background Sync wake-up if we're killed before the drain finishes.
    navigator.serviceWorker?.ready.then((r) => (r as unknown as { sync?: { register(t: string): Promise<void> } }).sync?.register("drain")).catch(() => {});
    return await drain({ force: true });
  } catch {
    return { sent: 0, failed: true };
  }
}
