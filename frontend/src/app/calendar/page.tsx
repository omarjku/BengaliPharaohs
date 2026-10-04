"use client";

import { CalendarDays, CheckCircle2, Eye, Leaf, Sprout } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Choice } from "@/components/app/choice";
import { AppShell } from "@/components/app/shell";
import calendarJson from "../../../public/data/calendar.json";
import { seasonFromDate, stageFromTransplant } from "@/lib/engine/context";
import type { Season, Stage } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { formatDate, num, useLang, type Text } from "@/lib/i18n";
import { upazilaByCode, varietyById } from "@/lib/places";
import { useEffectiveDate } from "@/lib/settings";
import { getProfile, saveProfile, type Profile } from "@/lib/store/db";
import type { StringKey } from "@/lib/strings";

type Tip = Text & { src: string; season: "any" | Season };
type CalendarData = {
  stages: { id: Stage; days: string; do: Tip[]; watch: string[] }[];
  key_dates: (Text & { season: Season; src: string })[];
  next_season: Record<string, Text & { src: string }>;
  watch_names: Record<string, Text>;
};
const CAL = calendarJson as unknown as CalendarData;
const STAGE_ICON: Record<Stage, string> = {
  seedbed: "🌱",
  early_tillering: "🌿",
  tillering: "🌾",
  pi_booting: "🎋",
  flowering: "🌼",
  grain_filling: "🍚",
};

/** Season-aware crop calendar: where the crop is now, what to do this week, what to watch, key dates. Fixed, sourced text only. */
export default function CalendarPage() {
  const { t, tx, lang } = useLang();
  const { date, simulated } = useEffectiveDate();
  const [p, setP] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile().then(setP).catch(() => setP({}));
  }, []);

  async function update(next: Profile) {
    setP(next);
    await saveProfile(next).catch(() => toast.error(t("save_failed")));
  }

  if (!p) return <AppShell title={t("cal_title")} back="/">{null}</AppShell>;

  const season = p.season ?? seasonFromDate(date);
  const stage = stageFromTransplant(p.transplant_date, date);
  const days = p.transplant_date ? Math.round((Date.parse(date) - Date.parse(p.transplant_date)) / 86_400_000) : undefined;
  const place = upazilaByCode(p.upazila);
  const variety = varietyById(p.variety);
  const current = CAL.stages.find((s) => s.id === stage);
  const forSeason = (tips: Tip[]) => tips.filter((x) => x.season === "any" || x.season === season);
  const next = place ? CAL.next_season[place.region] : undefined;
  const dates = CAL.key_dates.filter((d) => d.season === season);

  return (
    <AppShell title={t("cal_title")} back="/">
      {/* What the calendar is based on; tap to change. */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm">
        <CalendarDays className="size-4 text-muted-foreground" />
        <b>{formatDate(date, lang)}</b>
        {simulated && <span className="rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{t("simulated")}</span>}
        <span className="text-muted-foreground">·</span>
        <span>{[t(`season_${season}` as StringKey), variety && tx(variety), place && tx(place)].filter(Boolean).join(" · ")}</span>
        <Link href="/profile/" className="ml-auto font-semibold text-primary">
          {t("home_profile_edit")}
        </Link>
      </div>

      {!p.transplant_date ? (
        <section className="flex flex-col gap-5 rounded-3xl border-2 border-dashed border-primary/30 bg-secondary/40 p-4">
          <p className="text-lg font-semibold">{t("cal_need_date")}</p>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">{t("profile_transplant")}</span>
            <input
              type="date"
              className="min-h-14 rounded-2xl border-2 bg-card px-4 text-base"
              onChange={(e) => e.target.value && update({ ...p, transplant_date: e.target.value, season })}
            />
          </label>
          <Choice<Season>
            question={t("profile_season")}
            noUnknown
            cols={3}
            value={season}
            onChange={(v) => update({ ...p, season: v as Season })}
            options={(["aman", "aus", "boro"] as const).map((s) => ({ value: s, label: t(`season_${s}` as StringKey) }))}
          />
        </section>
      ) : (
        <>
          {/* Stage timeline */}
          <section className="mb-5 rounded-3xl border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-2xl font-bold text-primary">{stage ? t(`stage_${stage}` as StringKey) : "—"}</h2>
              <span className="text-sm text-muted-foreground">
                {days !== undefined && days >= 0 ? t("cal_days").replace("{n}", num(days, lang)) : t("cal_not_yet")}
              </span>
            </div>
            <ol className="grid grid-cols-6 gap-1" aria-label={t("stage")}>
              {CAL.stages.map((s) => {
                const idx = CAL.stages.findIndex((x) => x.id === stage);
                const i = CAL.stages.indexOf(s);
                return (
                  <li key={s.id} className="flex flex-col items-center gap-1 text-center">
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full text-lg",
                        i === idx ? "bg-primary ring-4 ring-primary/25" : i < idx ? "bg-secondary" : "bg-muted opacity-60",
                      )}
                      aria-current={i === idx ? "step" : undefined}
                    >
                      {STAGE_ICON[s.id]}
                    </span>
                    <span className={cn("text-[11px] leading-tight", i === idx ? "font-bold text-primary" : "text-muted-foreground")}>
                      {t(`stage_${s.id}` as StringKey)}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">{t("cal_estimate")}</p>
          </section>

          {current && (
            <>
              <section className="mb-4 rounded-3xl border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <CheckCircle2 className="size-5 text-ok" /> {t("cal_do")}
                </h3>
                <ul className="flex flex-col gap-3">
                  {forSeason(current.do).map((tip, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-ok" aria-hidden />
                      <span className="text-[16px] leading-relaxed">
                        {tx(tip)}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t("cal_source")}: {tip.src}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mb-4 rounded-3xl border-2 border-dashed border-warn/40 bg-warn-soft/50 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-warn">
                  <Eye className="size-5" /> {t("cal_watch")}
                </h3>
                <div className="mb-3 flex flex-wrap gap-2">
                  {current.watch.map((w) => (
                    <span key={w} className="rounded-full bg-card px-3 py-1 text-sm font-medium">
                      {tx(CAL.watch_names[w])}
                    </span>
                  ))}
                </div>
                <Link href="/check/" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <Leaf className="size-4" /> {t("cal_check_leaf")}
                </Link>
                <p className="mt-2 text-xs text-muted-foreground">{t("cal_watch_hint")}</p>
              </section>
            </>
          )}
        </>
      )}

      {dates.length > 0 && (
        <section className="mb-4 rounded-3xl border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-5 text-primary" /> {t("cal_dates")}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {dates.map((d, i) => (
              <li key={i} className="text-[15px] leading-relaxed">
                {tx(d)} <span className="text-xs text-muted-foreground">({d.src})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {next && (
        <section className="mb-4 rounded-3xl bg-secondary/60 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Sprout className="size-5 text-primary" /> {t("cal_next")}
          </h3>
          <p className="text-[15px] leading-relaxed">
            {tx(next)} <span className="text-xs text-muted-foreground">({next.src})</span>
          </p>
        </section>
      )}
    </AppShell>
  );
}
