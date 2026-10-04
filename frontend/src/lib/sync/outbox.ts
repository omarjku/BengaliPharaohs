// The outbox: one row per thing to upload, so a case's small facts can go before its big photo.
// Rows are keyed `${case_id}:${kind}`, which makes enqueue idempotent.
import type { BatchCase } from "./types";
import { getBlob, getOutbox, listOutbox, putOutbox, type CaseRecord, type OutboxItem, type OutboxKind } from "../store/db";
import { photoKey, prepareImages, thumbKey, voiceKey } from "./compress";

export const TIER: Record<OutboxKind, OutboxItem["tier"]> = { facts: 0, thumb: 1, voice: 2, photo: 3, log: 4 };
export const FACTS_BYTES = 2000; // rough, for timeouts only

async function add(case_id: string, kind: OutboxKind, bytes: number) {
  const id = `${case_id}:${kind}`;
  if (await getOutbox(id)) return;
  await putOutbox({ id, case_id, tier: TIER[kind], kind, state: "queued", attempts: 0, next_at: 0, bytes, created_at: Date.now() });
}

/** Queue everything the farmer agreed to share for this case. Safe to call twice. */
export async function enqueue(c: CaseRecord): Promise<void> {
  if (!c.consent) return;
  await add(c.id, "facts", FACTS_BYTES);
  if (c.share_photo && (await prepareImages(c.id))) {
    await add(c.id, "thumb", (await getBlob(thumbKey(c.id)))?.size ?? 0);
    await add(c.id, "photo", (await getBlob(photoKey(c.id)))?.size ?? 0);
  }
  if (c.share_voice) {
    const v = await getBlob(voiceKey(c.id));
    if (v) await add(c.id, "voice", v.size);
  }
}

/** The facts JSON for POST /api/cases/batch. has_* tell the server which blobs to expect. */
export async function toBatchCase(c: CaseRecord): Promise<BatchCase> {
  const items = (await listOutbox()).filter((i) => i.case_id === c.id);
  const has = (k: OutboxKind) => items.some((i) => i.kind === k);
  const taps: Record<string, unknown> = c.kind === "leaf" ? { ...c.answers, conditions: c.conditions } : { ...c.advisor_input };
  return {
    case_id: c.id,
    created_at: c.created_at,
    kind: c.kind,
    upazila: c.upazila ?? "unknown",
    class: c.kind === "leaf" ? (c.cross?.cls ?? "not_sure") : "n/a",
    confidence: c.prediction ? Number(c.prediction.p1.toFixed(3)) : null,
    taps,
    output_code: c.advisor?.output ?? c.cross?.decision ?? "",
    card: c.card,
    date_used: c.date_used,
    simulated_date: c.simulated_date,
    consent: true,
    has_thumb: has("thumb"),
    has_photo: has("photo"),
    has_voice: has("voice"),
  };
}
