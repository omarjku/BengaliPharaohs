"use client";

// Demo-only simulated date (DEMO.md: the replant rules only fire before mid-September, so the demo needs it, labelled).
import { useEffect, useState } from "react";
import { todayIso } from "./engine/context";

const KEY = "demo_date";
const EVENT = "demo-date-change";

export function getDemoDate(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setDemoDate(iso: string | null) {
  try {
    if (iso) localStorage.setItem(KEY, iso);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** The date the engine should use, and whether it is simulated. */
export function useEffectiveDate(): { date: string; simulated: boolean } {
  const [demo, setDemo] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setDemo(getDemoDate());
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return demo ? { date: demo, simulated: true } : { date: todayIso(), simulated: false };
}
