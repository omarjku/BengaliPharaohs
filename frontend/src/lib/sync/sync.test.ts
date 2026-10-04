import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drain, getCaseSyncStatus, getSyncStatus, resetBurstSupport } from "./drain";
import { enqueue } from "./outbox";
import { resetProbe } from "./probe";
import { deleteAllCases, getCase, getOutbox, listOutbox, putBlob, saveCase, setKv, type CaseRecord } from "../store/db";

// Skip real image decoding (not available in node): pretend the shrink step produced these.
vi.mock("./compress", async (orig) => ({
  ...(await orig<typeof import("./compress")>()),
  prepareImages: async (id: string) => {
    const { putBlob } = await import("../store/db");
    await putBlob(`thumb:${id}`, new Blob([new Uint8Array(100)], { type: "image/jpeg" }));
    await putBlob(`photo1024:${id}`, new Blob([new Uint8Array(1000)], { type: "image/jpeg" }));
    return true;
  },
}));

const mkCase = (id: string, over: Partial<CaseRecord> = {}): CaseRecord => ({
  id, created_at: "2026-10-04T08:00:00Z", kind: "flood", card: "c1" as CaseRecord["card"], date_used: "2026-10-04", simulated_date: false,
  upazila: "SRJ", share: "queued", consent: true, ...over,
});

type Call = { method: string; path: string };
let calls: Call[];
let handler: (c: Call, init?: RequestInit) => Response | Promise<Response>;
let kbps = 1000;

const ok = (body: unknown = {}) => new Response(JSON.stringify(body), { status: 200 });
function healthy(c: Call, init?: RequestInit): Response | Promise<Response> {
  if (c.path === "/api/burst") return new Response("", { status: 404 }); // these tests cover the old calls; burst.test.ts covers /api/burst
  if (c.path === "/api/health") return new Response("{}", { status: 200, headers: { "X-Health": "1" } });
  if (c.path === "/api/probe.bin") return new Response(new Uint8Array(32768));
  if (c.path === "/api/cases/batch") {
    const ids = (JSON.parse(String(init!.body)).cases as { case_id: string }[]).map((x) => x.case_id);
    return ok({ accepted: ids, rejected: [] });
  }
  return ok();
}

beforeEach(async () => {
  calls = [];
  kbps = 1000;
  handler = healthy;
  resetProbe();
  resetBurstSupport();
  await deleteAllCases();
  await setKv("photos_wifi_only", false);
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const c = { method: init?.method ?? "GET", path: new URL(url).pathname };
    calls.push(c);
    return handler(c, init);
  });
  // probe.bin timing: 32 KB at the wanted kbps  ->  ms = bits / kbps
  let n = 0;
  vi.spyOn(performance, "now").mockImplementation(() => (n++ % 2 ? (32768 * 8) / kbps : 0));
});
afterEach(() => vi.restoreAllMocks());

async function shared(id: string, withVoice = false) {
  const c = mkCase(id, { kind: "leaf", share_photo: true, share_voice: withVoice, has_voice: withVoice });
  await putBlob(id, new Blob(["x"], { type: "image/jpeg" }));
  if (withVoice) await putBlob(`voice:${id}`, new Blob([new Uint8Array(50)], { type: "audio/webm" }));
  await saveCase(c);
  await enqueue(c);
}
const sent = () => calls.filter((c) => !c.path.startsWith("/api/health") && c.path !== "/api/probe.bin" && c.path !== "/api/burst").map((c) => `${c.method} ${c.path}`);

describe("outbox", () => {
  it("enqueue creates tiered items per consent flags and is idempotent", async () => {
    await shared("a", true);
    await enqueue((await getCase("a"))!);
    const items = (await listOutbox()).map((i) => `${i.kind}:${i.tier}`).sort();
    expect(items).toEqual(["facts:0", "photo:3", "thumb:1", "voice:2"]);
  });
  it("no photo consent -> facts only", async () => {
    const c = mkCase("b");
    await saveCase(c);
    await enqueue(c);
    expect((await listOutbox()).map((i) => i.kind)).toEqual(["facts"]);
  });
});

describe("drain", () => {
  it("good link: facts before thumb before voice before photo", async () => {
    await shared("a", true);
    const r = await drain();
    expect(r).toEqual({ sent: 1, failed: false });
    expect(sent()).toEqual(["POST /api/cases/batch", "PUT /api/cases/a/thumb", "PUT /api/cases/a/voice", "PUT /api/cases/a/photo"]);
    expect(await getCaseSyncStatus("a")).toEqual({ facts_sent: true, thumb_sent: true, photo_sent: true });
    expect((await getCase("a"))!.share).toBe("synced");
    expect((await getSyncStatus()).pending).toEqual({ facts: 0, thumbs: 0, voice: 0, photos: 0 });
  });

  it("slow link: only tiers 0-1 go", async () => {
    kbps = 40;
    await shared("a", true);
    await drain();
    expect(sent()).toEqual(["POST /api/cases/batch", "PUT /api/cases/a/thumb"]);
    expect((await getSyncStatus()).pending).toMatchObject({ voice: 1, photos: 1 });
  });

  it("medium link (150 kbps): voice yes, photo no", async () => {
    kbps = 150;
    await shared("a", true);
    await drain();
    expect(sent()).toEqual(["POST /api/cases/batch", "PUT /api/cases/a/thumb", "PUT /api/cases/a/voice"]);
  });

  it("photos-on-Wi-Fi-only setting holds the photo back even on a fast link", async () => {
    await setKv("photos_wifi_only", true);
    await shared("a");
    await drain();
    expect(sent()).toEqual(["POST /api/cases/batch", "PUT /api/cases/a/thumb"]);
  });

  it("connection drops mid-photo: facts stay done, photo retried later", async () => {
    await shared("a");
    handler = (c, init) => {
      if (c.path === "/api/cases/a/photo") throw new TypeError("network dropped");
      return healthy(c, init);
    };
    const r = await drain();
    expect(r.failed).toBe(true);
    expect((await getOutbox("a:facts"))!.state).toBe("done");
    const photo = (await getOutbox("a:photo"))!;
    expect(photo).toMatchObject({ state: "queued", attempts: 1 });
    expect(photo.next_at).toBeGreaterThan(Date.now() - 1); // backoff set

    // link is back; retry (forced so the test doesn't wait out the backoff)
    handler = healthy;
    calls = [];
    expect((await drain({ force: true })).failed).toBe(false);
    expect(sent()).toEqual(["PUT /api/cases/a/photo"]);
    expect((await getOutbox("a:photo"))!.state).toBe("done");
  });

  it("captive portal (200 HTML without X-Health): nothing is sent", async () => {
    await shared("a");
    handler = () => new Response("<html>Log in to Wi-Fi</html>", { status: 200 });
    const r = await drain();
    expect(r).toEqual({ sent: 0, failed: true });
    expect(calls.map((c) => c.path)).toEqual(["/api/health"]);
    expect((await getSyncStatus()).online_probe).toBe("captive");
    expect((await getOutbox("a:facts"))!.state).toBe("queued");
  });

  it("offline: probe fails, nothing sent", async () => {
    await shared("a");
    handler = () => {
      throw new TypeError("offline");
    };
    expect((await drain()).failed).toBe(true);
    expect((await getSyncStatus()).online_probe).toBe("offline");
  });

  it("429 with Retry-After is honoured; later items are not attempted", async () => {
    await shared("a");
    handler = (c, init) => (c.path === "/api/cases/batch" ? new Response("", { status: 429, headers: { "Retry-After": "120" } }) : healthy(c, init));
    const before = Date.now();
    expect((await drain()).failed).toBe(true);
    const f = (await getOutbox("a:facts"))!;
    expect(f.state).toBe("queued");
    expect(f.next_at - before).toBeGreaterThanOrEqual(119_000);
    expect(sent()).toEqual(["POST /api/cases/batch"]); // photos did not jump the queue
    // within the backoff window a normal drain sends nothing
    calls = [];
    await drain();
    expect(sent()).toEqual([]);
  });

  it("4xx (not 408/429) is permanent: marked failed, other items continue", async () => {
    await shared("a");
    handler = (c, init) => (c.path === "/api/cases/a/thumb" ? new Response("", { status: 422 }) : healthy(c, init));
    await drain();
    expect((await getOutbox("a:thumb"))!.state).toBe("failed");
    expect((await getOutbox("a:photo"))!.state).toBe("done");
  });

  it("idempotent retry: a lost response resends the same facts, server dedupes", async () => {
    await shared("a");
    const seen = new Set<string>();
    let lose = true;
    handler = (c, init) => {
      if (c.path === "/api/cases/batch") {
        for (const x of JSON.parse(String(init!.body)).cases) seen.add(x.case_id); // server upsert
        if (lose) {
          lose = false;
          throw new TypeError("response lost");
        }
      }
      return healthy(c, init);
    };
    await drain();
    await drain({ force: true });
    expect(seen.size).toBe(1);
    expect((await getOutbox("a:facts"))!.state).toBe("done");
  });

  it("batches facts, max 20 per request", async () => {
    for (let i = 0; i < 25; i++) {
      const c = mkCase(`c${String(i).padStart(2, "0")}`);
      await saveCase(c);
      await enqueue(c);
    }
    const r = await drain();
    expect(r.sent).toBe(25);
    expect(sent()).toEqual(["POST /api/cases/batch", "POST /api/cases/batch"]);
  });

  it("two cases: all facts go before any photo", async () => {
    await shared("a");
    await shared("b");
    await drain();
    const kinds = sent().map((s) => (s.includes("batch") ? "facts" : s.split("/").pop()));
    expect(kinds).toEqual(["facts", "thumb", "thumb", "photo", "photo"]);
  });
});
