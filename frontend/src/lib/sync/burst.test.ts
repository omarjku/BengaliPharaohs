// The 15-second window: one /api/burst round trip (facts up, pack delta down), then thumbs, then big files if they fit.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drain, getLastSyncReport, resetBurstSupport } from "./drain";
import { enqueue } from "./outbox";
import { resetProbe } from "./probe";
import { getPack } from "../pack/pack";
import { deleteAllCases, getKv, getOutbox, putBlob, saveCase, setKv, type CaseRecord } from "../store/db";

vi.mock("./compress", async (orig) => ({
  ...(await orig<typeof import("./compress")>()),
  prepareImages: async (id: string) => {
    const { putBlob } = await import("../store/db");
    await putBlob(`thumb:${id}`, new Blob([new Uint8Array(100)], { type: "image/jpeg" }));
    await putBlob(`photo1024:${id}`, new Blob([new Uint8Array(1000)], { type: "image/jpeg" }));
    return true;
  },
}));

const UP = "SRJ-SIRAJGANJ";
const PARTS = {
  case_replies: { version: "3", fetched_at: null, valid_until: null, seeded: false, data: { replies: [{ id: 3, case_id: "a", text: "spray later", by: "saao", created_at: "x" }] } },
  flood: { version: "f1", source: "SEEDED", fetched_at: new Date().toISOString(), seeded: true, data: { station: "Sirajganj", level_m: 13.1, danger_m: 13.35, trend: "rising", outlook_days: 3 } },
  forecast: { version: "w1", source: "SEEDED", fetched_at: new Date().toISOString(), seeded: true, data: { days: [{ day: 1, rain_mm: 12 }] } },
};

type Call = { method: string; path: string; at: number };
let calls: Call[];
let t0: number;
let latency = 0; // ms per request, aborted by the request's signal like a real fetch
let hook: ((path: string, init?: RequestInit) => Response | undefined) | undefined;

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), rej(new DOMException("aborted", "AbortError"))));
  });

function server(path: string, init?: RequestInit): Response {
  if (path === "/api/health") return new Response("{}", { headers: { "X-Health": "1" } });
  if (path === "/api/probe.bin") return new Response(new Uint8Array(32768));
  if (path === "/api/burst") {
    const b = JSON.parse(String(init!.body));
    const have = b.pack_versions as Record<string, string>;
    const parts = Object.fromEntries(Object.entries(PARTS).filter(([n, p]) => have[n] !== p.version));
    return new Response(JSON.stringify({ accepted: b.cases.map((c: { case_id: string }) => c.case_id), rejected: [], pack: { upazila: b.upazila, parts }, server_time: "t" }));
  }
  return new Response("{}");
}

beforeEach(async () => {
  calls = [];
  latency = 0;
  hook = undefined;
  resetProbe();
  resetBurstSupport();
  await deleteAllCases();
  await setKv("burst_last_at", 0);
  await setKv("pack_current", undefined);
  await setKv("profile", { upazila: UP });
  t0 = Date.now();
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    calls.push({ method: init?.method ?? "GET", path, at: Date.now() - t0 });
    await wait(latency, init?.signal ?? undefined);
    return hook?.(path, init) ?? server(path, init);
  });
  let n = 0;
  vi.spyOn(performance, "now").mockImplementation(() => (n++ % 2 ? (32768 * 8) / 2000 : 0)); // 2 Mbit/s
});
afterEach(() => vi.restoreAllMocks());

const mk = (id: string): CaseRecord => ({
  id, created_at: "2026-10-04T08:00:00Z", kind: "leaf", card: "C3" as CaseRecord["card"], date_used: "2026-10-04", simulated_date: false,
  upazila: UP, share: "queued", consent: true, share_photo: true,
});
async function shared(id: string) {
  await putBlob(id, new Blob(["x"], { type: "image/jpeg" }));
  const c = mk(id);
  await saveCase(c);
  await enqueue(c);
}
const api = () => calls.filter((c) => c.path.startsWith("/api/") && c.path !== "/api/health" && c.path !== "/api/probe.bin").map((c) => `${c.method} ${c.path}`);

describe("burst", () => {
  it("one round trip uploads the facts AND brings the changed pack parts; facts go before any file", async () => {
    await shared("a");
    const r = await drain({ force: true });
    expect(r).toEqual({ sent: 1, failed: false });
    expect(api()).toEqual(["POST /api/burst", "PUT /api/cases/a/thumb", "PUT /api/cases/a/photo"]);
    const p = (await getPack(UP))!;
    expect(Object.keys(p.parts).sort()).toEqual(["case_replies", "flood", "forecast"]);
    expect((await getOutbox("a:facts"))!.state).toBe("done");
    const rep = (await getLastSyncReport())!;
    expect(rep.sent).toEqual({ facts: 1, thumbs: 1, photos: 1, voice: 0 });
    expect(rep.received).toEqual(["case_replies", "flood", "forecast"]);
    expect(rep.new_replies).toBe(1);
    expect(rep.bytes_up).toBeGreaterThan(1000);
    expect(rep.bytes_down).toBeGreaterThan(300);
    expect(rep.ms).toBeLessThan(15_000);
  });

  it("sends the versions it has, so a second burst returns no parts and no new reply", async () => {
    await shared("a");
    await drain({ force: true });
    await shared("b");
    await drain({ force: true });
    const rep = (await getLastSyncReport())!;
    expect(rep.sent.facts).toBe(1);
    expect(rep.received).toEqual([]); // nothing changed: no download
    expect(rep.new_replies).toBe(0);
  });

  it("pack delta is atomic: a response cut mid-body changes nothing and keeps the facts queued", async () => {
    await shared("a");
    hook = (path) =>
      path === "/api/burst"
        ? new Response(new ReadableStream({ start: (c) => (c.enqueue(new TextEncoder().encode('{"accepted":["a"],"pa')), c.error(new TypeError("connection lost"))) }))
        : undefined;
    const r = await drain({ force: true });
    expect(r.failed).toBe(true);
    expect(await getPack(UP)).toBeUndefined();
    expect((await getOutbox("a:facts"))!.state).toBe("queued");
    hook = undefined; // next window: the retry is the same idempotent request
    expect((await drain({ force: true })).sent).toBe(1);
    expect(Object.keys((await getPack(UP))!.parts)).toContain("flood");
  });

  it("the budget is respected: nothing starts or runs past the deadline, the rest waits and resumes next time", async () => {
    for (const id of ["a", "b", "c", "d", "e", "f"]) await shared(id);
    latency = 250;
    const start = Date.now();
    await drain({ force: true, budgetMs: 1500 });
    const took = Date.now() - start;
    expect(took).toBeLessThan(1500 + 300); // health 250 + burst 250 + ~4 thumbs, then stop
    expect(calls.every((c) => c.at <= 1500)).toBe(true);
    const rep = (await getLastSyncReport())!;
    expect(rep.sent.facts).toBe(6); // all facts fit in the single burst
    expect(rep.sent.thumbs).toBeLessThan(6);
    expect(rep.sent.photos).toBe(0);
    expect(rep.stopped_by_budget).toBe(true);
    // resume: a fresh window with time finishes the rest, no fact is sent twice
    latency = 0;
    await drain({ force: true });
    const rep2 = (await getLastSyncReport())!;
    expect(rep2.sent.facts).toBe(0);
    expect(rep.sent.thumbs + rep2.sent.thumbs).toBe(6);
    expect(rep2.sent.photos).toBe(6);
    for (const id of ["a", "b", "c", "d", "e", "f"]) expect((await getOutbox(`${id}:photo`))!.state).toBe("done");
  });

  it("a request cut by the end of the window is requeued without penalty (no backoff, attempts unchanged)", async () => {
    await shared("a");
    hook = undefined;
    latency = 0;
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      calls.push({ method: init?.method ?? "GET", path, at: Date.now() - t0 });
      if (path === "/api/burst") await wait(5000, init?.signal ?? undefined); // never answers within the window
      return server(path, init);
    });
    const r = await drain({ force: true, budgetMs: 1500 });
    expect(r.failed).toBe(true);
    const f = (await getOutbox("a:facts"))!;
    expect(f).toMatchObject({ state: "queued", attempts: 0, next_at: 0 });
  });

  it("an older backend (404 on /api/burst) falls back to /api/cases/batch", async () => {
    await shared("a");
    hook = (path, init) =>
      path === "/api/burst" ? new Response("", { status: 404 }) : path === "/api/cases/batch" ? new Response(JSON.stringify({ accepted: JSON.parse(String(init!.body)).cases.map((c: { case_id: string }) => c.case_id), rejected: [] })) : undefined;
    expect((await drain({ force: true })).sent).toBe(1);
    expect(api().slice(0, 2)).toEqual(["POST /api/burst", "POST /api/cases/batch"]);
  });

  it("with nothing to send, a pack-only burst still fetches the weather, but not again within 5 minutes unless forced", async () => {
    await drain();
    expect(api()).toEqual(["POST /api/burst"]);
    expect(await getKv("burst_last_at")).toBeGreaterThan(0);
    calls = [];
    await drain();
    expect(api()).toEqual([]);
  });
});
