"use client";

import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { LangProvider } from "@/lib/i18n";
import { persistStorage } from "@/lib/store/db";
import { syncQueued } from "@/lib/sync";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Service worker only in production builds: in `next dev` it would cache stale dev chunks.
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      // The app is served cache-first, so a new deploy only shows after the new worker takes over.
      // Reload once when that happens, but not on the very first install (nothing old to replace).
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController && !reloaded) {
          reloaded = true;
          window.location.reload();
        }
      });
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => reg.update()) // check for a new version on every app start
        .catch(() => {});
    }
    persistStorage();
    const trySync = () =>
      syncQueued().then((r) => {
        if (r.sent) toast.success(`✓ ${r.sent}`);
      });
    if (navigator.onLine) trySync();
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
  }, []);

  return (
    <LangProvider>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LangProvider>
  );
}
