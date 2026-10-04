// Offline pack (docs/sync-plan.md §4): small daily download so the next offline session is better.
// Atomic: parts are collected in memory and `pack_current` is replaced by ONE IndexedDB put, only if
// every changed part arrived. A half download never replaces a working pack.
import { API_URL, type ContextPack } from "../api";
import { getKv, setKv } from "../store/db";

export const FETCH_PARTS = ["forecast", "flood", "case_replies", "advisories", "prices"] as const; // priority order
export type PartName = (typeof FETCH_PARTS)[number];
export const PACK_EVENT = "pack:changed";
const KEY = "pack_current";
const PART_TIMEOUT_MS = 10_000;
/** Engine only uses a part this fresh (hours). Older = ignored, the farmer is asked instead. */
const ENGINE_MAX_AGE_H = { flood: 24, forecast: 48 };

type ManifestPart = { version: string; size?: number; valid_until?: string };
type Manifest = { upazila: string; version: string; generated_at: string; parts: Record<string, ManifestPart> };

export type PackPart = { version: string; etag?: string; source?: string; seeded?: boolean; fetched_at: string; valid_until?: string; data: unknown };
export type Pack = {
  upazila: string;
  version: string;
  manifest_etag?: string;
  fetched_at: string;
  /** rules/cards versions from the manifest (no download, just a flag source). */
  versions: { rules?: string; cards?: string };
  model_update_available: boolean;
  parts: Partial<Record<PartName, PackPart>>;
};

export type RefreshResult = "updated" | "unchanged" | "failed" | "offline";
export type RefreshOpts = { device_id?: string; local?: { rules?: string; cards?: string }; now?: Date };

function deviceId(): string {
  try {
    return localStorage.getItem("device_id") ?? "anon-unknown";
  } catch {
    return "anon-unknown";
  }
}

async function get(path: string, etag?: string): Promise<{ status: number; etag?: string; body?: unknown }> {
  const res = await fetch(`${API_URL}${path}`, { headers: etag ? { "If-None-Match": etag } : {}, signal: AbortSignal.timeout(PART_TIMEOUT_MS) });
  if (res.status === 304) return { status: 304 };
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return { status: res.status, etag: res.headers.get("ETag") ?? undefined, body: await res.json() };
}

let inflight: Promise<RefreshResult> | null = null;
export function refreshPack(upazila: string, opts: RefreshOpts = {}): Promise<RefreshResult> {
  return (inflight ??= doRefresh(upazila, opts).finally(() => (inflight = null)));
}

async function doRefresh(upazila: string, opts: RefreshOpts): Promise<RefreshResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  try {
    const old = await getKv<Pack>(KEY);
    const cur = old?.upazila === upazila ? old : undefined;
    const q = `upazila=${encodeURIComponent(upazila)}`;
    const m = await get(`/api/pack/manifest?${q}`, cur?.manifest_etag);
    if (m.status === 304) return "unchanged";
    const man = m.body as Manifest;

    const parts: Pack["parts"] = { ...cur?.parts };
    let changed = false;
    for (const name of FETCH_PARTS) {
      const mp = man.parts[name];
      if (!mp) continue;
      const have = cur?.parts[name];
      if (have && have.version === mp.version) continue;
      const r = await get(`/api/pack/${name}?${q}&device_id=${encodeURIComponent(opts.device_id ?? deviceId())}`, have?.etag);
      if (r.status === 304 && have) {
        parts[name] = { ...have, version: mp.version, valid_until: mp.valid_until ?? have.valid_until };
      } else {
        const b = r.body as { source?: string; fetched_at: string; valid_until?: string; seeded?: boolean; data: unknown };
        parts[name] = { version: mp.version, etag: r.etag, source: b.source, seeded: b.seeded, fetched_at: b.fetched_at, valid_until: b.valid_until ?? mp.valid_until, data: b.data };
      }
      changed = true;
    }
    // Any throw above leaves `pack_current` untouched.

    const versions = { rules: man.parts.rules?.version, cards: man.parts.cards?.version };
    const l = opts.local;
    const pack: Pack = {
      upazila,
      version: man.version,
      manifest_etag: m.etag,
      fetched_at: (opts.now ?? new Date()).toISOString(),
      versions,
      // ponytail: flag only, no model/rules download.
      model_update_available: !!l && ((!!versions.rules && !!l.rules && versions.rules !== l.rules) || (!!versions.cards && !!l.cards && versions.cards !== l.cards)),
      parts,
    };
    await setKv(KEY, pack);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PACK_EVENT));
    return changed || !cur ? "updated" : "unchanged";
  } catch {
    return "failed";
  }
}

export type PartStatus = { as_of: string; valid_until?: string; stale: boolean; seeded?: boolean };
export type PackStatus = { as_of: string | null; stale: boolean; model_update_available: boolean; parts: Partial<Record<PartName, PartStatus>> };

const partStale = (p: PackPart, now: number) => !!p.valid_until && Date.parse(p.valid_until) < now;

export async function getPack(upazila?: string): Promise<Pack | undefined> {
  const p = await getKv<Pack>(KEY);
  return p && (!upazila || p.upazila === upazila) ? p : undefined;
}

/** For the UI ("weather as of …"). Listen to the `pack:changed` window event to re-read. */
export async function getPackStatus(now = new Date()): Promise<PackStatus> {
  const p = await getPack();
  const parts: PackStatus["parts"] = {};
  for (const [k, v] of Object.entries(p?.parts ?? {}) as [PartName, PackPart][])
    parts[k] = { as_of: v.fetched_at, valid_until: v.valid_until, stale: partStale(v, +now), seeded: v.seeded };
  const list = Object.values(parts);
  return { as_of: p?.fetched_at ?? null, stale: !p || list.length === 0 || list.some((x) => x.stale), model_update_available: !!p?.model_update_available, parts };
}

const fresh = (p: PackPart | undefined, maxH: number, now: number): p is PackPart =>
  !!p && now - Date.parse(p.fetched_at) < maxH * 3_600_000;

// The backend (contract/api.md) sends forecast days as {day: 1-5, rain_mm} (day 1 = the day it was fetched) and
// prices as {paddy: [{market, tk}]}. The older {date}/{markets} shapes are still accepted.
type Forecast = { days: { date?: string; day?: number; rain_mm: number }[] };
type Flood = { station: string; level_m: number; danger_m: number; trend: "rising" | "steady" | "falling"; outlook_days: number };
type Prices = { markets?: { name: string; paddy_tk_per_maund: number }[]; paddy?: { market: string; tk: number }[] };

/** Pure: pack -> the ContextPack shape the app/engine already uses. Stale parts (flood >24 h, forecast >48 h) become null. */
export function packToContext(pack: Pack | undefined, date: Date = new Date()): ContextPack | null {
  if (!pack) return null;
  const now = +date;
  const f = pack.parts.flood, w = pack.parts.forecast, pr = pack.parts.prices;
  const flood = fresh(f, ENGINE_MAX_AGE_H.flood, now) ? (f.data as Flood) : null;
  const fc = fresh(w, ENGINE_MAX_AGE_H.forecast, now) ? (w.data as Forecast) : null;
  let rain: ContextPack["rain"] = null;
  if (fc) {
    const today = date.toISOString().slice(0, 10);
    const day0 = Date.parse(w!.fetched_at.slice(0, 10));
    const days = (fc.days ?? []).map((d) => ({ date: d.date ?? new Date(day0 + ((d.day ?? 1) - 1) * 86_400_000).toISOString().slice(0, 10), rain_mm: d.rain_mm }));
    const sum = (d: typeof days) => Math.round(d.reduce((a, x) => a + x.rain_mm, 0) * 10) / 10;
    // last_10d_mm only counts past days the pack happens to contain (forecast pack, not observations).
    const past = days.filter((d) => d.date < today && Date.parse(today) - Date.parse(d.date) <= 10 * 86_400_000);
    rain = { last_10d_mm: sum(past), forecast_3d_mm: sum(days.filter((d) => d.date >= today).slice(0, 3)), as_of: w!.fetched_at };
  }
  const pd = pr?.data as Prices | undefined;
  const mk = pd?.markets?.[0] ?? (pd?.paddy?.[0] && { name: pd.paddy[0].market, paddy_tk_per_maund: pd.paddy[0].tk });
  if (!flood && !rain) return null;
  return {
    upazila: pack.upazila,
    as_of: pack.fetched_at,
    seeded: [f, w, pr].some((p) => p?.seeded),
    flood: flood && { ...flood, as_of: f!.fetched_at },
    rain,
    rules_version: pack.versions.rules,
    cards_version: pack.versions.cards,
    price: mk ? { paddy_tk_per_maund: mk.paddy_tk_per_maund, market: mk.name, as_of: pr!.fetched_at } : null,
  };
}
