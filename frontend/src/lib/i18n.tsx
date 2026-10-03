"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { S, type StringKey } from "./strings";

export type Lang = "bn" | "en";
export type Text = { bn: string; en: string };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: StringKey) => string; tx: (x: Text | undefined) => string };
const LangContext = createContext<Ctx | null>(null);

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const bnDigits = (s: string | number) => String(s).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "en" || saved === "bn") setLangState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
  }, []);
  const t = useCallback((k: StringKey) => S[k][lang], [lang]);
  const tx = useCallback((x: Text | undefined) => (x ? x[lang] || x.en : ""), [lang]);
  return <LangContext.Provider value={{ lang, setLang, t, tx }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const c = useContext(LangContext);
  if (!c) throw new Error("useLang outside LangProvider");
  return c;
}

const MONTHS: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  bn: ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"],
};

/** "2026-08-20" → "20 August 2026" / "২০ আগস্ট ২০২৬". "08-31" (month-day only) → "31 August". */
export function formatDate(iso: string, lang: Lang): string {
  const parts = iso.split("-").map(Number);
  const [y, m, d] = parts.length === 3 ? parts : [undefined, parts[0], parts[1]];
  const s = `${d} ${MONTHS[lang][m - 1]}${y ? ` ${y}` : ""}`;
  return lang === "bn" ? bnDigits(s) : s;
}

export const num = (n: number | string, lang: Lang) => (lang === "bn" ? bnDigits(n) : String(n));
