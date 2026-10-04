import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { drain } from "./drain";
import { timeoutSignal } from "../api";
import { enqueue } from "./outbox";
import { probe, resetProbe } from "./probe";
import { deleteAllCases, getCase, newId, listOutbox, putBlob, saveCase, type CaseRecord } from "../store/db";

// A photo the browser cannot decode/re-encode (HEIC, corrupt): prepareImages throws.
vi.mock("./compress", async (orig) => ({
  ...(await orig<typeof import("./compress")>()),
  prepareImages: async () => {
    throw new Error("could not decode image");
  },
}));

beforeEach(async () => {
  await deleteAllCases();
  resetProbe();
  vi.unstubAllGlobals();
});

describe("robustness", () => {
  it("newId is a real UUID even without crypto.randomUUID (old Android WebView), else the server answers 422", () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(newId()).toMatch(UUID);
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => a.fill(7) });
    expect(newId()).toMatch(UUID);
    vi.stubGlobal("crypto", undefined);
    expect(newId()).toMatch(UUID);
  });

  it("undecodable photo: facts and voice note are still queued, photo/thumb are skipped", async () => {
    const c: CaseRecord = {
      id: "h", created_at: "2026-10-04T08:00:00Z", kind: "leaf", card: "C1" as CaseRecord["card"], date_used: "2026-10-04",
      simulated_date: false, share: "queued", consent: true, share_photo: true, has_voice: true, share_voice: true,
    };
    await putBlob("voice:h", new Blob([new Uint8Array(50)], { type: "audio/webm" }));
    await enqueue(c);
    expect((await listOutbox()).map((i) => i.kind).sort()).toEqual(["facts", "voice"]);
  });

  it("case shared while offline (marked queued, outbox still empty): reconnecting + drain() sends it", async () => {
    const c: CaseRecord = { id: "o", created_at: "2026-10-04T08:00:00Z", kind: "flood", card: "A1" as CaseRecord["card"], date_used: "2026-10-04", simulated_date: false, share: "queued", consent: true };
    await saveCase(c); // what result/page.tsx does offline: no enqueue
    const posted: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      if (path === "/api/health") return new Response("{}", { headers: { "X-Health": "1" } });
      if (path === "/api/probe.bin") return new Response(new Uint8Array(32768));
      posted.push(path);
      return new Response(JSON.stringify({ accepted: JSON.parse(String(init!.body)).cases.map((x: { case_id: string }) => x.case_id), rejected: [] }));
    });
    expect((await drain()).sent).toBe(1);
    expect(posted).toEqual(["/api/cases/batch"]);
    expect((await getCase("o"))!.share).toBe("synced");
  });

  it("old WebView without AbortSignal.timeout: probe still works and the fallback signal aborts", async () => {
    vi.stubGlobal("AbortSignal", class extends AbortSignal {});
    (globalThis.AbortSignal as unknown as { timeout?: unknown }).timeout = undefined;
    vi.stubGlobal("fetch", async (url: string) => (new URL(url).pathname === "/api/health" ? new Response('{"ok":true}') : new Response(new Uint8Array(32768))));
    expect((await probe()).status).toBe("ok");
    vi.useFakeTimers();
    const sig = timeoutSignal(50);
    expect(sig.aborted).toBe(false);
    vi.advanceTimersByTime(60);
    expect(sig.aborted).toBe(true);
    vi.useRealTimers();
  });

  it("cross-origin: X-Health hidden by CORS, but our JSON body {ok:true} still proves it is our server", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      new URL(url).pathname === "/api/health" ? new Response('{"ok":true,"provider":"mock"}') : new Response(new Uint8Array(32768)),
    );
    expect((await probe()).status).toBe("ok");
  });

  it("a captive-portal page that is JSON-ish but not ours is still captive", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>login</html>"));
    expect((await probe()).status).toBe("captive");
  });
});
