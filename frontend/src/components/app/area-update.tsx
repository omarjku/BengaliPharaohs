"use client";

import { CloudOff, CloudRain, Coins, Loader2, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { useOnline } from "@/components/app/shell";
import { getContext, type ContextPack } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate, num, useLang } from "@/lib/i18n";

/**
 * The "better overview when there is internet" part: the small context pack for the farmer's upazila
 * (GET /api/context). The offline answer never depends on it; this only adds what's happening in the area.
 */
export function AreaUpdate({ upazila }: { upazila?: string }) {
  const { t, lang } = useLang();
  const online = useOnline();
  const [pack, setPack] = useState<ContextPack | null | undefined>(undefined);

  useEffect(() => {
    if (!online || !upazila) return;
    const ac = new AbortController();
    setPack(undefined);
    getContext(upazila, ac.signal).then(setPack);
    return () => ac.abort();
  }, [online, upazila]);

  const box = "rounded-3xl border bg-card p-4";
  if (!upazila) return null;
  if (!online)
    return (
      <div className={cn(box, "flex items-center gap-3 text-sm text-muted-foreground")}>
        <CloudOff className="size-5 shrink-0" /> {t("area_offline")}
      </div>
    );
  if (pack === undefined)
    return (
      <div className={cn(box, "flex items-center gap-3 text-sm text-muted-foreground")}>
        <Loader2 className="size-5 animate-spin" /> {t("area_loading")}
      </div>
    );
  if (pack === null)
    return (
      <div className={cn(box, "flex items-center gap-3 text-sm text-muted-foreground")}>
        <CloudOff className="size-5 shrink-0" /> {t("area_none")}
      </div>
    );

  const f = pack.flood;
  const above = f ? f.level_m >= f.danger_m : false;
  return (
    <section className={box}>
      <h3 className="mb-3 flex flex-wrap items-center gap-2 font-semibold">
        {t("area_title")}
        {pack.seeded && <span className="rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{t("seeded")}</span>}
        <span className="ml-auto text-xs font-normal text-muted-foreground">{formatDate(pack.as_of.slice(0, 10), lang)}</span>
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {f && (
          <div className={cn("rounded-2xl p-3", above ? "bg-bad-soft text-bad" : "bg-muted")}>
            <Waves className="mb-1 size-5" />
            <div className="text-sm font-semibold">{f.station}</div>
            <div className="text-sm">
              {num(f.level_m, lang)} / {num(f.danger_m, lang)} m · {t(`trend_${f.trend}`)}
            </div>
          </div>
        )}
        {pack.rain && (
          <div className="rounded-2xl bg-muted p-3">
            <CloudRain className="mb-1 size-5" />
            <div className="text-sm">
              {t("area_rain_past")}: <b>{num(pack.rain.last_10d_mm, lang)} mm</b>
            </div>
            <div className="text-sm">
              {t("area_rain_next")}: <b>{num(pack.rain.forecast_3d_mm, lang)} mm</b>
            </div>
          </div>
        )}
        {pack.price && (
          <div className="rounded-2xl bg-muted p-3">
            <Coins className="mb-1 size-5" />
            <div className="text-sm">
              {t("area_price")} ({pack.price.market})
            </div>
            <div className="text-sm font-semibold">৳{num(pack.price.paddy_tk_per_maund, lang)} / {t("maund")}</div>
          </div>
        )}
      </div>
    </section>
  );
}
