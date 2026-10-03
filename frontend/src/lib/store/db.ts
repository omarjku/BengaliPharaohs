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
}

let dbp: Promise<IDBPDatabase<Schema>> | null = null;
function db() {
  dbp ??= openDB<Schema>("dhansathi", 1, {
    upgrade(d) {
      d.createObjectStore("kv");
      d.createObjectStore("cases", { keyPath: "id" }).createIndex("by_created", "created_at");
      d.createObjectStore("photos");
    },
  });
  return dbp;
}

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
