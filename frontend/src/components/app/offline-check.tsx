"use client";

import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { num, useLang } from "@/lib/i18n";

type State = { kind: "checking" } | { kind: "dev" } | { kind: "ok"; n: number } | { kind: "missing"; have: number; total: number };

/** Green only if every file of the build is in the service-worker cache (HANDOFF Z2). */
export function OfflineCheck() {
  const { t, lang } = useLang();
  const [s, setS] = useState<State>({ kind: "checking" });
  const [ver, setVer] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (process.env.NODE_ENV !== "production" || !("caches" in window)) return setS({ kind: "dev" });
      try {
        await navigator.serviceWorker?.ready;
        const res = await fetch("/precache-manifest.json", { cache: "no-store" }).catch(() => null);
        const keys = await caches.keys();
        const name = keys.filter((k) => k.startsWith("dhansathi-")).pop();
        if (!name) return alive && setS({ kind: "missing", have: 0, total: 1 });
        if (alive) setVer(name.slice("dhansathi-".length, "dhansathi-".length + 6));
        const urls: string[] = res?.ok ? (await res.json()).urls : [];
        const cache = await caches.open(name);
        // Offline the manifest fetch fails: then trust the cache we have (it was filled from a full manifest).
        if (!urls.length) return alive && setS({ kind: "ok", n: (await cache.keys()).length });
        let have = 0;
        for (const u of urls) if (await cache.match(u, { ignoreSearch: true })) have++;
        if (alive) setS(have === urls.length ? { kind: "ok", n: have } : { kind: "missing", have, total: urls.length });
      } catch {
        if (alive) setS({ kind: "missing", have: 0, total: 1 });
      }
    }
    check();
    const id = setInterval(check, 4000); // first install fills the cache in the background
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Which build this phone runs: compare with precache-manifest.json on the server to confirm an update arrived.
  const version = ver && <p className="mt-1.5 text-center font-mono text-[11px] text-muted-foreground">v {ver}</p>;
  if (s.kind === "ok")
    return (
      <div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-ok-soft px-4 py-3 text-ok">
          <CheckCircle2 className="size-6 shrink-0" />
          <span className="font-semibold">{t("selfcheck_ok")}</span>
        </div>
        {version}
      </div>
    );
  return (
    <div>
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm",
        s.kind === "missing" ? "bg-warn-soft text-warn" : "bg-muted text-muted-foreground",
      )}
    >
      {s.kind === "checking" ? <Loader2 className="size-5 animate-spin" /> : <CircleAlert className="size-5 shrink-0" />}
      <span className="font-medium">
        {s.kind === "checking" && t("offline_checking")}
        {s.kind === "dev" && t("selfcheck_dev")}
        {s.kind === "missing" && `${t("offline_missing")} (${num(s.have, lang)}/${num(s.total, lang)})`}
      </span>
    </div>
    {version}
    </div>
  );
}
