// On-phone storage (IndexedDB): farmer profile, saved cases (the store-and-forward queue) and photos.
// Nothing here leaves the phone unless the farmer taps "share" (consent) — see src/lib/sync.ts.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LeafAnswers } from "../engine/context";
import type { AdvisorInput, AdvisorResult, CardId, CrossResult, Prediction, Season } from "../engine/types";

export type Profile = {
  upazila?: string;
  variety?: string;
  season?: Season;
  transplant_date?: string;
};

export type ShareState = "local" | "queued" | "synced" | "failed";

export type OutboxKind = "facts" | "thumb" | "voice" | "photo" | "log";
export type OutboxItem = {
  id: string; // `${case_id}:${kind}` so enqueue is idempotent
  case_id: string;
  tier: 0 | 1 | 2 | 3 | 4;
  kind: OutboxKind;
  state: "queued" | "sending" | "done" | "failed";
  attempts: number;
  next_at: number; // epoch ms
  bytes: number;
  created_at: number;
};

export type CaseRecord = {
  id: string; // anonymous uuid
  created_at: string;
  kind: "leaf" | "flood" | "drought";
  card: CardId;
  date_used: string;
  simulated_date: boolean;
  upazila?: string;
  // leaf path
  prediction?: Prediction;
  cross?: CrossResult;
  answers?: LeafAnswers;
  conditions?: string[];
  model_ms?: number;
  model_dummy?: boolean;
  // flood path
  advisor_input?: AdvisorInput;
  advisor?: AdvisorResult;
  // hand-off
  share: ShareState;
  consent: boolean;
  share_photo?: boolean;
  /** Farmer's own voice note for the SAAO (stored in the photos store under voiceKey(id)). */
  has_voice?: boolean;
  share_voice?: boolean;
  synced_at?: string;
};

interface Schema extends DBSchema {
  kv: { key: string; value: unknown };
  cases: { key: string; value: CaseRecord; indexes: { by_created: string } };
  photos: { key: string; value: Blob };
  outbox: { key: string; value: OutboxItem; indexes: { by_case: string } };
}

let dbp: Promise<IDBPDatabase<Schema>> | null = null;
function db() {
  dbp ??= openDB<Schema>("dhansathi", 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore("kv");
        d.createObjectStore("cases", { keyPath: "id" }).createIndex("by_created", "created_at");
        d.createObjectStore("photos");
      }
      // v2: upload outbox (existing data is kept).
      if (oldVersion < 2) d.createObjectStore("outbox", { keyPath: "id" }).createIndex("by_case", "case_id");
    },
    // An older copy of the app (another tab or the installed window) still has the old version open:
    // the upgrade waits until it closes. Tell the page so it can say so instead of spinning forever.
    blocked() {
      if (typeof window !== "undefined") window.dispatchEvent(new Event(DB_BLOCKED_EVENT));
    },
    // This copy is the old one and a newer copy wants to upgrade: let go and reload into the new version.
    blocking() {
      const old = dbp;
      dbp = null;
      void old?.then((d) => d.close());
      if (typeof window !== "undefined") window.location.reload();
    },
    terminated() {
      dbp = null;
    },
  }).catch((e) => {
    dbp = null; // allow a retry instead of caching the failure
    throw e;
  });
  return dbp;
}

/** Window event: the on-phone database is waiting for another open copy of the app to close. */
export const DB_BLOCKED_EVENT = "dhansathi:db-blocked";

export async function getProfile(): Promise<Profile> {
  return ((await (await db()).get("kv", "profile")) as Profile) ?? {};
}
export async function saveProfile(p: Profile) {
  await (await db()).put("kv", p, "profile");
}

export async function saveCase(c: CaseRecord) {
  await (await db()).put("cases", c);
}
export async function getCase(id: string) {
  return (await db()).get("cases", id);
}
export async function listCases(): Promise<CaseRecord[]> {
  return (await (await db()).getAllFromIndex("cases", "by_created")).reverse();
}
export async function deleteAllCases() {
  const d = await db();
  await d.clear("cases");
  await d.clear("photos");
  await d.clear("outbox");
}

export async function savePhoto(id: string, blob: Blob) {
  await (await db()).put("photos", blob, id);
}
export async function getPhoto(id: string) {
  return (await db()).get("photos", id);
}

// Voice notes share the blob store with photos (no schema change), under their own key.
const voiceKey = (id: string) => `voice:${id}`;
export async function saveVoice(id: string, blob: Blob) {
  await (await db()).put("photos", blob, voiceKey(id));
}
export async function getVoice(id: string) {
  return (await db()).get("photos", voiceKey(id));
}
export async function deleteVoice(id: string) {
  await (await db()).delete("photos", voiceKey(id));
}

export async function getKv<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get("kv", key)) as T | undefined;
}
export async function setKv(key: string, v: unknown) {
  await (await db()).put("kv", v, key);
}
export async function putBlob(key: string, blob: Blob) {
  await (await db()).put("photos", blob, key);
}
export async function getBlob(key: string) {
  return (await db()).get("photos", key);
}
export async function putOutbox(item: OutboxItem) {
  await (await db()).put("outbox", item);
}
export async function getOutbox(id: string) {
  return (await db()).get("outbox", id);
}
export async function listOutbox(): Promise<OutboxItem[]> {
  return (await db()).getAll("outbox");
}

/** Ask the browser not to evict our data (cases + cached model) under storage pressure. */
export async function persistStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {}
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
