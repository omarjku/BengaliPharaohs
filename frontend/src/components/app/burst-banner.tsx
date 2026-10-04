"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { burstMessage } from "@/lib/burst-text";
import { useLang } from "@/lib/i18n";
import { getLastSyncReport, SYNC_REPORT_EVENT } from "@/lib/sync";
import type { SyncReport } from "@/lib/sync/types";

const SHOWN = "burst_shown";
const FRESH_MS = 10 * 60_000;

/** Non-blocking toast after a connection window: what went up and what came down, in plain words. Also on the next app open if it happened while the page was closed. */
export function BurstBanner() {
  const { lang } = useLang();
  useEffect(() => {
    const show = (r: SyncReport) => {
      try {
        if (localStorage.getItem(SHOWN) === r.started_at) return;
        localStorage.setItem(SHOWN, r.started_at);
      } catch {}
      toast.success(burstMessage(r, lang), { id: "burst", duration: 9000 });
    };
    const on = (e: Event) => show((e as CustomEvent<SyncReport>).detail);
    window.addEventListener(SYNC_REPORT_EVENT, on);
    getLastSyncReport().then((r) => r && Date.now() - Date.parse(r.started_at) < FRESH_MS && show(r)).catch(() => {});
    return () => window.removeEventListener(SYNC_REPORT_EVENT, on);
  }, [lang]);
  return null;
}
