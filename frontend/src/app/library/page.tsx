"use client";

import { Camera, CameraOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/shell";
import libraryJson from "../../../public/data/library.json";
import { cn } from "@/lib/utils";
import { useLang, type Text } from "@/lib/i18n";

type Item = Text & { id: string; group: string; part: string; photo: boolean; status: string; src: string; sign: Text; vs: Text };
type Library = { groups: (Text & { id: string; note: Text })[]; items: Item[]; parts: Record<string, Text> };
const LIB = libraryJson as unknown as Library;
const PART_ORDER = ["leaf", "sheath", "base", "panicle", "grain", "whole_plant"];

/** Rice problem guide: every problem sorted by cause, with where it shows, how to tell it apart, and whether the photo check knows it. */
export default function LibraryPage() {
  const { tx, lang } = useLang();
  const [group, setGroup] = useState<string | "all">("all");
  const [part, setPart] = useState<string | "all">("all");
  const [open, setOpen] = useState<string | null>(null);

  // /library/#blast opens that entry (linked from the result screen).
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const item = LIB.items.find((i) => i.id === id);
    if (item) {
      setOpen(id);
      setTimeout(() => document.getElementById(`lib-${id}`)?.scrollIntoView({ block: "center" }), 100);
    }
  }, []);

  const groups = useMemo(
    () =>
      LIB.groups
        .filter((g) => group === "all" || g.id === group)
        .map((g) => ({
          ...g,
          items: LIB.items
            .filter((i) => i.group === g.id && (part === "all" || i.part === part))
            .sort((a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part) || a[lang].localeCompare(b[lang])),
        }))
        .filter((g) => g.items.length),
    [group, part, lang],
  );

  const chip = (on: boolean) =>
    cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium", on ? "border-primary bg-primary text-primary-foreground" : "bg-card");

  return (
    <AppShell title={lang === "bn" ? "ধানের রোগ ও সমস্যা" : "Rice problem guide"} back="/">
      <p className="mb-3 text-sm text-muted-foreground">
        {lang === "bn"
          ? "কারণ অনুযায়ী সাজানো। 📷 মানে ছবি দেখে অ্যাপ এটা চিনতে পারে; বাকিগুলো কৃষি অফিসারকে দেখান।"
          : "Sorted by cause. 📷 = the photo check can recognise it; for the rest, show your SAAO."}
      </p>
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className={chip(group === "all")} onClick={() => setGroup("all")}>
          {lang === "bn" ? "সব" : "All"}
        </button>
        {LIB.groups.map((g) => (
          <button key={g.id} className={chip(group === g.id)} onClick={() => setGroup(g.id)}>
            {tx(g)}
          </button>
        ))}
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className={chip(part === "all")} onClick={() => setPart("all")}>
          {lang === "bn" ? "গাছের সব অংশ" : "Any part"}
        </button>
        {PART_ORDER.map((p) => (
          <button key={p} className={chip(part === p)} onClick={() => setPart(p)}>
            {tx(LIB.parts[p])}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <section key={g.id}>
            <h2 className="text-lg font-bold">{tx(g)}</h2>
            <p className="mb-2 text-sm text-muted-foreground">{tx(g.note)}</p>
            <ul className="flex flex-col gap-2">
              {g.items.map((i) => {
                const isOpen = open === i.id;
                return (
                  <li key={i.id} id={`lib-${i.id}`} className={cn("rounded-2xl border bg-card", isOpen && "border-primary")}>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(isOpen ? null : i.id)} aria-expanded={isOpen}>
                      {i.photo ? <Camera className="size-5 shrink-0 text-ok" aria-label="photo check" /> : <CameraOff className="size-5 shrink-0 text-muted-foreground" aria-label="no photo check" />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug">{tx(i)}</span>
                        <span className="text-xs text-muted-foreground">
                          {tx(LIB.parts[i.part])}
                          {lang === "bn" ? "" : ` · ${i.bn}`}
                        </span>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="flex flex-col gap-2 border-t px-4 py-3 text-[15px] leading-relaxed">
                        <p>
                          <b>{lang === "bn" ? "লক্ষণ: " : "Signs: "}</b>
                          {tx(i.sign)}
                        </p>
                        <p>
                          <b>{lang === "bn" ? "আলাদা করবেন যেভাবে: " : "How to tell apart: "}</b>
                          {tx(i.vs)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i.photo
                            ? lang === "bn"
                              ? "📷 ছবি দেখে অ্যাপ এটা চিনতে পারে (নিশ্চিত নয়)।"
                              : "📷 The photo check can recognise this (not certain)."
                            : lang === "bn"
                              ? "ছবি দেখে অ্যাপ এটা চেনে না: কৃষি অফিসারকে দেখান।"
                              : "The photo check does not know this: show your SAAO."}{" "}
                          · {i.src}
                          {i.status === "NEEDS-CHECK" && " · NEEDS-CHECK"}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
