import { beforeEach, describe, expect, it, vi } from "vitest";

const kv = new Map<string, unknown>();
vi.mock("../store/db", () => ({
  getKv: async (k: string) => kv.get(k),
  setKv: async (k: string, v: unknown) => void kv.set(k, structuredClone(v)),
}));
import { getPack, getPackStatus, packToContext, refreshPack } from "./pack";

const NOW = new Date("2026-10-04T10:00:00Z");
const iso = (h: number) => new Date(+NOW - h * 3_600_000).toISOString();
const DATA: Record<string, unknown> = {
  forecast: { days: [{ date: "2026-10-04", rain_mm: 10, tmin_c: 24, tmax_c: 31 }, { date: "2026-10-05", rain_mm: 5.5, tmin_c: 24, tmax_c: 31 }] },
  flood: { station: "Sirajganj", level_m: 14, danger_m: 13.5, trend: "rising", outlook_days: 3 },
  case_replies: { items: [] },
  advisories: { items: [] },
  prices: { markets: [{ name: "Sirajganj", paddy_tk_per_maund: 1200, date: "2026-10-03" }] },
};
const ORDER = ["forecast", "flood", "case_replies", "advisories", "prices"];

function manifest(v = "1") {
  const parts: Record<string, unknown> = {};
  for (const p of [...ORDER, "rules", "cards"]) parts[p] = { version: `${p}${v}`, size: 1, valid_until: iso(-24) };
  return { upazila: "SRJ", version: v, generated_at: iso(0), parts };
}
const json = (b: unknown, etag: string) => new Response(JSON.stringify(b), { status: 200, headers: { ETag: etag } });

/** Fake backend. `fail` = parts that 500; `mv` = manifest version. */
function backend(o: { mv?: string; fail?: string[] } = {}) {
  const calls: string[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    calls.push(u.pathname.replace("/api/pack/", "") + (new Headers(init?.headers).get("If-None-Match") ? "?inm" : ""));
    const name = u.pathname.split("/").pop()!;
    if (name === "manifest") return json(manifest(o.mv), `"m${o.mv ?? 1}"`);
    if (o.fail?.includes(name)) return new Response("x", { status: 500 });
    return json({ source: "seed", fetched_at: iso(0), valid_until: iso(-24), seeded: true, data: DATA[name] }, `"${name}${o.mv ?? 1}"`);
  });
  vi.stubGlobal("fetch", f);
  return { calls, f };
}

beforeEach(() => {
  kv.clear();
  vi.unstubAllGlobals();
});

describe("refreshPack", () => {
  it("fetches changed parts in priority order and stores the pack", async () => {
    const b = backend();
    expect(await refreshPack("SRJ", { now: NOW })).toBe("updated");
    expect(b.calls).toEqual(["manifest", ...ORDER]);
    expect((await getPack("SRJ"))?.parts.flood?.data).toEqual(DATA.flood);
  });

  it("manifest 304 -> nothing else fetched", async () => {
    backend();
    await refreshPack("SRJ", { now: NOW });
    const f = vi.fn(async () => new Response(null, { status: 304 }));
    vi.stubGlobal("fetch", f);
    expect(await refreshPack("SRJ", { now: NOW })).toBe("unchanged");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("new manifest version re-fetches only changed parts (304 on part keeps data)", async () => {
    backend();
    await refreshPack("SRJ", { now: NOW });
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      const name = new URL(url).pathname.split("/").pop()!;
      calls.push(name);
      if (name === "manifest") {
        const m = manifest("1");
        (m.parts.prices as { version: string }).version = "prices2";
        return json({ ...m, version: "2" }, '"m2"');
      }
      return new Response(null, { status: 304 });
    });
    await refreshPack("SRJ", { now: NOW });
    expect(calls).toEqual(["manifest", "prices"]);
    const p = await getPack("SRJ");
    expect(p?.parts.prices?.version).toBe("prices2");
    expect(p?.parts.prices?.data).toEqual(DATA.prices);
  });

  it("partial failure keeps the old pack untouched", async () => {
    backend();
    await refreshPack("SRJ", { now: NOW });
    const before = structuredClone(kv.get("pack_current"));
    backend({ mv: "2", fail: ["advisories"] });
    expect(await refreshPack("SRJ", { now: NOW })).toBe("failed");
    expect(kv.get("pack_current")).toEqual(before);
  });

  it("swap is atomic: nothing written until all parts arrived", async () => {
    let writes = 0;
    const orig = kv.set.bind(kv);
    kv.set = (k, v) => (writes++, orig(k, v));
    backend({ fail: ["prices"] });
    await refreshPack("SRJ", { now: NOW });
    expect(writes).toBe(0);
    backend();
    await refreshPack("SRJ", { now: NOW });
    expect(writes).toBe(1);
  });

  it("offline -> skipped, no fetch", async () => {
    const b = backend();
    vi.stubGlobal("navigator", { onLine: false });
    expect(await refreshPack("SRJ")).toBe("offline");
    expect(b.f).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("model_update_available only when cards/rules version differs", async () => {
    backend();
    await refreshPack("SRJ", { now: NOW, local: { rules: "rules1", cards: "cards1" } });
    expect((await getPackStatus(NOW)).model_update_available).toBe(false);
    backend({ mv: "2" });
    await refreshPack("SRJ", { now: NOW, local: { rules: "rules1", cards: "cards1" } });
    expect((await getPackStatus(NOW)).model_update_available).toBe(true);
  });
});

describe("stale handling + engine context", () => {
  it("fresh pack fills flood + rain context", async () => {
    backend();
    await refreshPack("SRJ", { now: NOW });
    const c = packToContext(await getPack("SRJ"), NOW);
    expect(c?.flood?.level_m).toBe(14);
    expect(c?.flood?.trend).toBe("rising");
    expect(c?.rain?.forecast_3d_mm).toBe(15.5);
    expect(c?.price?.paddy_tk_per_maund).toBe(1200);
    expect(c?.seeded).toBe(true);
  });

  it("stale parts are ignored (flood >24 h, forecast >48 h)", async () => {
    backend();
    await refreshPack("SRJ", { now: NOW });
    const p = (await getPack("SRJ"))!;
    const later = (h: number) => new Date(+NOW + h * 3_600_000);
    const c25 = packToContext(p, later(25))!;
    expect(c25.flood).toBeNull();
    expect(c25.rain).not.toBeNull();
    expect(packToContext(p, later(49))).toBeNull();
  });

  it("status flags stale after valid_until", async () => {
    backend();
    await refreshPack("SRJ", { now: NOW });
    expect((await getPackStatus(NOW)).stale).toBe(false);
    const s = await getPackStatus(new Date(+NOW + 48 * 3_600_000));
    expect(s.stale).toBe(true);
    expect(s.parts.flood?.stale).toBe(true);
  });

  it("real backend shapes (contract): forecast {day}, prices {paddy:[{market,tk}]} -> context, no throw", () => {
    const at = "2026-10-04T06:00:00+06:00";
    const part = (data: unknown) => ({ version: "1", fetched_at: at, data });
    const pack = {
      upazila: "SRJ-SIRAJGANJ", version: "1", fetched_at: at, versions: {}, model_update_available: false,
      parts: {
        forecast: part({ days: [{ day: 1, rain_mm: 0, temp_c: 31 }, { day: 2, rain_mm: 2, temp_c: 30 }, { day: 3, rain_mm: 4, temp_c: 32 }, { day: 4, rain_mm: 6, temp_c: 33 }] }),
        flood: part({ station: "Rajshahi (Padma)", level_m: 15.9, danger_m: 18.5, trend: "falling", outlook_days: 3 }),
        prices: part({ unit: "Tk/maund", paddy: [{ market: "Rajshahi bazar", tk: 1230 }] }),
      },
    };
    const c = packToContext(pack, new Date("2026-10-04T01:00:00Z"))!;
    expect(c.rain?.forecast_3d_mm).toBe(6); // days 1-3 from the fetch date
    expect(c.price).toMatchObject({ paddy_tk_per_maund: 1230, market: "Rajshahi bazar" });
  });

  it("no pack -> null context", () => expect(packToContext(undefined)).toBeNull());
});
