"use client";

import { CloudOff, CloudRain, Coins, Loader2, MapPin, Megaphone, MessageSquareText, Waves } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useOnline } from "@/components/app/shell";
import { loadArea, type AreaView } from "@/lib/area";
import { CARDS } from "@/lib/engine/cards";
import { getPack, PACK_EVENT, type Pack } from "@/lib/pack/pack";
import { cn } from "@/lib/utils";
import { formatDate, num, useLang, type Lang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";

type Forecast = { days?: { rain_mm: number; temp_c?: number }[] };
type Flood = { station: string; level_m: number; danger_m: number; trend: "rising" | "steady" | "falling" };
type Prices = { paddy?: { market: string; tk: number }[]; markets?: { name: string; paddy_tk_per_maund: number }[] };
type Replies = { replies?: { id: number; text: string }[] };

const day = (iso: string, lang: Lang) => formatDate(iso.slice(0, 10), lang);

/**
 * The area news for the farmer's upazila, from the offline pack (kept fresh by the burst sync and by opening this screen).
 * It always ends in one of four sentences: fresh data "as of …", "no new data", "offline — showing data from …", or "set your area".
 * The offline answer never depends on it.
 */
export function AreaUpdate({ upazila }: { upazila?: string }) {
  const { t, lang } = useLang();
  const online = useOnline();
  const [view, setView] = useState<AreaView | undefined>(upazila ? undefined : { kind: "noarea" });

  useEffect(() => {
    let live = true;
    setView(upazila ? undefined : { kind: "noarea" });
    if (upazila) loadArea(upazila, online).then((v) => live && setView(v));
    return () => void (live = false);
  }, [online, upazila]);
  // A burst that lands while this screen is open updates the pack: swap it in (storage read only, no network call).
  useEffect(() => {
    const on = () => upazila && getPack(upazila).then((pack) => pack && setView((v) => (v && "pack" in v ? { ...v, pack } : v)));
    window.addEventListener(PACK_EVENT, on);
    return () => window.removeEventListener(PACK_EVENT, on);
  }, [upazila]);

  const box = "rounded-3xl border bg-card p-4";
  const note = (icon: React.ReactNode, text: React.ReactNode) => (
    <div className={cn(box, "flex items-center gap-3 text-sm text-muted-foreground")}>{icon}<span>{text}</span></div>
  );
  if (!view) return note(<Loader2 className="size-5 shrink-0 animate-spin" />, t("area_loading"));
  if (view.kind === "noarea")
    return note(<MapPin className="size-5 shrink-0" />, <>{t("area_noarea")}. <Link href="/profile/" className="font-semibold underline">{t("area_set")}</Link></>);
  if (view.kind === "none") return note(<CloudOff className="size-5 shrink-0" />, t("area_none"));
  if (view.kind === "offline" && !view.pack) return note(<CloudOff className="size-5 shrink-0" />, t("area_offline"));

  const pack = (view as { pack: Pack }).pack;
  const status =
    view.kind === "offline" ? `${t("area_offline_cached")} ${day(pack.fetched_at, lang)}`
    : view.kind === "nodata" ? `${t("area_nonew")} · ${t("area_asof")} ${day(pack.fetched_at, lang)}`
    : `${t("area_asof")} ${day(pack.fetched_at, lang)}`;

  const w = pack.parts.forecast?.data as Forecast | undefined;
  const f = pack.parts.flood?.data as Flood | undefined;
  const pd = pack.parts.prices?.data as Prices | undefined;
  const prices = pd?.paddy?.map((p) => ({ market: p.market, tk: p.tk })) ?? pd?.markets?.map((m) => ({ market: m.name, tk: m.paddy_tk_per_maund })) ?? [];
  const cards = ((pack.parts.advisories?.data as { card_ids?: string[] } | undefined)?.card_ids ?? []).filter((id) => CARDS.cards[id]);
  const replies = ((pack.parts.case_replies?.data as Replies | undefined)?.replies ?? []).slice(-2).reverse();
  const days = (w?.days ?? []).slice(0, 3);
  const rain = Math.round(days.reduce((a, d) => a + d.rain_mm, 0) * 10) / 10;
  const temps = days.map((d) => d.temp_c).filter((x): x is number => typeof x === "number");
  const above = f ? f.level_m >= f.danger_m : false;
  const tile = "flex gap-3 rounded-2xl bg-muted p-3 text-sm";

  return (
    <section className={box} aria-label={t("area_title")}>
      <h3 className="flex flex-wrap items-center gap-2 font-semibold">
        {t("area_title")}
        {Object.values(pack.parts).some((p) => p?.seeded) && <span className="rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{t("seeded")}</span>}
      </h3>
      <p className={cn("mb-3 text-xs", view.kind === "offline" ? "font-semibold text-warn" : "text-muted-foreground")}>{status}</p>
      <div className="grid gap-2">
        {replies.map((r) => (
          <div key={r.id} className={cn(tile, "bg-ok-soft text-ok")}>
            <MessageSquareText className="size-5 shrink-0" />
            <div><div className="font-semibold">{t("area_replies")}</div><div className="text-foreground">{r.text}</div></div>
          </div>
        ))}
        {f && (
          <div className={cn(tile, above && "bg-bad-soft text-bad")}>
            <Waves className="size-5 shrink-0" />
            <div>
              <div className="font-semibold">{f.station}</div>
              <div>{t("area_flood")}: <b>{num(f.level_m, lang)} m</b> / {t("area_danger")} {num(f.danger_m, lang)} m · {t(`trend_${f.trend}` as StringKey)}</div>
            </div>
          </div>
        )}
        {days.length > 0 && (
          <div className={tile}>
            <CloudRain className="size-5 shrink-0" />
            <div>
              {t("area_forecast")}: <b>{num(rain, lang)} mm</b>
              {temps.length > 0 && <> · {num(Math.min(...temps), lang)}–{num(Math.max(...temps), lang)}°C</>}
            </div>
          </div>
        )}
        {cards.length > 0 && (
          <div className={tile}>
            <Megaphone className="size-5 shrink-0" />
            <div>
              <div className="font-semibold">{t("area_advisories")}</div>
              <ul className="list-inside list-disc">{cards.map((id) => <li key={id}>{CARDS.cards[id].title[lang]}</li>)}</ul>
            </div>
          </div>
        )}
        {prices.length > 0 && (
          <div className={tile}>
            <Coins className="size-5 shrink-0" />
            <div>
              <div className="font-semibold">{t("area_price")}</div>
              {prices.map((p) => <div key={p.market}>{p.market}: ৳{num(p.tk, lang)} / {t("maund")}</div>)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
