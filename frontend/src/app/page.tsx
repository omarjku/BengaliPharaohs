"use client";

import { CalendarDays, ChevronRight, ClipboardList, FolderOpen, Leaf, MapPin, Settings2, Waves } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OfflineCheck } from "@/components/app/offline-check";
import { AppShell } from "@/components/app/shell";
import { formatDate, useLang } from "@/lib/i18n";
import { upazilaByCode, varietyById } from "@/lib/places";
import { setDemoDate, useEffectiveDate } from "@/lib/settings";
import { getProfile, listCases, type Profile } from "@/lib/store/db";
import { APP_NAME } from "@/lib/strings";

// Demo dates that make each advisor rule fire (advisor-rules.md: replanting only works before mid-September).
const DEMO_DATES = ["2026-08-20", "2026-09-05", "2026-09-18"];

export default function Home() {
  const { t, tx, lang } = useLang();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [queued, setQueued] = useState(0);
  const { date, simulated } = useEffectiveDate();

  useEffect(() => {
    getProfile().then(setProfile);
    listCases().then((cs) => setQueued(cs.filter((c) => c.share === "queued" || c.share === "failed").length));
  }, []);

  const place = upazilaByCode(profile?.upazila);
  const variety = varietyById(profile?.variety);

  const tiles = [
    { href: "/check/", icon: Leaf, title: t("home_check"), sub: t("home_check_sub"), tone: "bg-primary text-primary-foreground" },
    { href: "/flood/", icon: Waves, title: t("home_flood"), sub: t("home_flood_sub"), tone: "bg-[oklch(0.45_0.09_230)] text-white" },
    { href: "/calendar/", icon: CalendarDays, title: t("home_calendar"), sub: t("home_calendar_sub"), tone: "bg-[oklch(0.62_0.12_75)] text-white" },
    { href: "/cases/", icon: FolderOpen, title: t("home_cases"), sub: t("home_cases_sub"), tone: "border-2 bg-card text-foreground", badge: queued },
  ];

  return (
    <AppShell>
      <section className="mb-5">
        <h2 className="text-3xl font-bold tracking-tight text-primary">{tx(APP_NAME)}</h2>
        <p className="mt-1 text-base text-muted-foreground">{t("tagline")}</p>
      </section>

      <Link
        href="/profile/"
        className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-secondary/60 px-4 py-3 active:bg-secondary"
      >
        <MapPin className="size-6 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          {place ? (
            <>
              <span className="block truncate font-semibold">{tx(place)}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {[variety && tx(variety), profile?.season && t(`season_${profile.season}`)].filter(Boolean).join(" · ")}
              </span>
            </>
          ) : (
            <span className="font-semibold">{t("home_profile_empty")}</span>
          )}
        </span>
        <span className="text-sm font-semibold text-primary">{t("home_profile_edit")}</span>
      </Link>

      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map(({ href, icon: Icon, title, sub, tone, badge }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className={i === 0 ? "sm:col-span-2" : undefined}
          >
            <Link href={href} className={`flex min-h-24 items-center gap-4 rounded-3xl px-5 py-4 shadow-sm transition-transform active:scale-[0.98] ${tone}`}>
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <Icon className="size-8" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-bold leading-tight">{title}</span>
                <span className="mt-0.5 block text-sm opacity-85">{sub}</span>
              </span>
              {!!badge && <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-accent-foreground">{badge}</span>}
              <ChevronRight className="size-6 opacity-70" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-5">
        <OfflineCheck />
      </div>

      <Link href="/saao/" className="mt-5 flex items-center gap-3 rounded-2xl px-1 py-2 text-muted-foreground hover:text-foreground">
        <ClipboardList className="size-5" />
        <span className="flex-1 text-sm font-medium">{t("home_saao")}</span>
        <ChevronRight className="size-4" />
      </Link>

      <details className="mt-2 rounded-2xl border bg-card px-4 py-2 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 py-1 font-medium text-muted-foreground">
          <Settings2 className="size-4" /> {t("demo_set")}
          {simulated && <span className="ml-auto rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{formatDate(date, lang)}</span>}
        </summary>
        <div className="flex flex-wrap gap-2 py-2">
          {DEMO_DATES.map((d) => (
            <button
              key={d}
              onClick={() => setDemoDate(d)}
              className={`rounded-full border px-3 py-1.5 ${simulated && date === d ? "border-primary bg-secondary font-semibold" : ""}`}
            >
              {formatDate(d, lang)}
            </button>
          ))}
          <input
            type="date"
            aria-label={t("demo_set")}
            className="rounded-full border bg-transparent px-3 py-1"
            onChange={(e) => e.target.value && setDemoDate(e.target.value)}
          />
          <button onClick={() => setDemoDate(null)} className="rounded-full px-3 py-1.5 text-muted-foreground underline">
            {t("demo_off")}
          </button>
        </div>
      </details>
    </AppShell>
  );
}
