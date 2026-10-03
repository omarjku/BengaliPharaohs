"use client";

import { ChevronLeft, CloudOff, FolderOpen, House, Leaf, Waves, Wifi } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate, useLang } from "@/lib/i18n";
import { setDemoDate, useEffectiveDate } from "@/lib/settings";
import { APP_NAME } from "@/lib/strings";

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", up);
    };
  }, []);
  return online;
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-full border border-primary-foreground/30 p-0.5 text-sm font-semibold" role="group" aria-label="Language">
      {(["bn", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "min-h-9 min-w-11 rounded-full px-2.5 transition-colors",
            lang === l ? "bg-primary-foreground text-primary" : "text-primary-foreground/85",
          )}
        >
          {l === "bn" ? "বাংলা" : "EN"}
        </button>
      ))}
    </div>
  );
}

const NAV = [
  { href: "/", icon: House, key: "nav_home" },
  { href: "/check/", icon: Leaf, key: "nav_check" },
  { href: "/flood/", icon: Waves, key: "nav_flood" },
  { href: "/cases/", icon: FolderOpen, key: "nav_cases" },
] as const;

export function AppShell({
  children,
  title,
  back,
  wide,
  hideNav,
}: {
  children: React.ReactNode;
  title?: string;
  back?: string;
  wide?: boolean;
  hideNav?: boolean;
}) {
  const { t, tx, lang } = useLang();
  const online = useOnline();
  const { date, simulated } = useEffectiveDate();
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path?.startsWith(href.replace(/\/$/, "")));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-sm pt-[env(safe-area-inset-top)]">
        <div className={cn("mx-auto flex h-14 w-full items-center gap-2 px-3", wide ? "max-w-6xl" : "max-w-2xl")}>
          {back ? (
            <Link href={back} aria-label={t("back")} className="-ml-1 flex size-11 items-center justify-center rounded-full active:bg-white/15">
              <ChevronLeft className="size-7" />
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" className="size-9 rounded-xl ring-1 ring-white/25" />
            </Link>
          )}
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title ?? tx(APP_NAME)}</h1>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn("rounded-full px-3 py-1.5 text-sm font-medium", active(n.href) ? "bg-white/20" : "hover:bg-white/10")}
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
              online ? "bg-white/15" : "bg-accent text-accent-foreground",
            )}
            aria-live="polite"
          >
            {online ? <Wifi className="size-3.5" /> : <CloudOff className="size-3.5" />}
            <span className="hidden min-[380px]:inline">{online ? t("online") : t("no_net")}</span>
          </span>
          <LangToggle />
        </div>
        {simulated && (
          <div className="bg-accent text-accent-foreground">
            <div className={cn("mx-auto flex w-full items-center justify-between gap-2 px-4 py-1.5 text-sm font-semibold", wide ? "max-w-6xl" : "max-w-2xl")}>
              <span>
                ⚠ {t("demo_banner")}: {formatDate(date, lang)}
              </span>
              <button onClick={() => setDemoDate(null)} className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs underline-offset-2 hover:underline">
                {t("demo_off")}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className={cn("mx-auto w-full flex-1 px-4 pt-4", wide ? "max-w-6xl" : "max-w-2xl", hideNav ? "pb-8" : "pb-28 md:pb-10")}>
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-2xl grid-cols-4">
            {NAV.map(({ href, icon: Icon, key }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 text-[13px] font-medium",
                  active(href) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-6", active(href) && "stroke-[2.5]")} />
                {t(key)}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
