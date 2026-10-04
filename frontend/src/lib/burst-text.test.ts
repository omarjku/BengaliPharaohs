import { describe, expect, it } from "vitest";
import { burstMessage } from "./burst-text";
import type { SyncReport } from "./sync/types";

const rep = (o: Partial<SyncReport>): SyncReport => ({
  started_at: "x", ms: 6200, budget_ms: 15000, sent: { facts: 2, thumbs: 2, photos: 0, voice: 0 }, received: ["forecast", "flood", "case_replies"], new_replies: 1,
  bytes_up: 0, bytes_down: 0, stopped_by_budget: false, ...o,
});

describe("burstMessage", () => {
  it("English: the sentence from the pitch", () => {
    expect(burstMessage(rep({}), "en")).toBe("Synced in 6 s: sent 2 cases, got today's weather, flood level and 1 SAAO reply");
  });
  it("Bangla uses Bangla digits and the same pieces", () => {
    expect(burstMessage(rep({}), "bn")).toBe("৬ সেকেন্ডে সিঙ্ক হলো: ২টি কেস পাঠানো হয়েছে, আজকের আবহাওয়া, নদীর পানির স্তর আর কৃষি অফিসারের ১টি উত্তর পেয়েছেন");
  });
  it("only what happened: nothing sent, one part received", () => {
    expect(burstMessage(rep({ sent: { facts: 0, thumbs: 0, photos: 0, voice: 0 }, received: ["prices"], new_replies: 0, ms: 400 }), "en")).toBe("Synced in 1 s: got paddy prices");
  });
});
