"use client";

import { Footprints } from "lucide-react";
import { LABEL_NAMES } from "@/lib/labels";
import { num, useLang, type Text } from "@/lib/i18n";
import type { FieldSummary } from "@/lib/model/field";
import { cn } from "@/lib/utils";

export const fillStr = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

/** Short names for the sketch badges and the summary line. Claude draft — Zoha to check. */
export const SHORT: Record<string, Text> = {
  healthy: { bn: "সুস্থ", en: "healthy" },
  blast: { bn: "ব্লাস্ট", en: "blast" },
  brown_spot: { bn: "বাদামি দাগ", en: "brown spot" },
  sheath_blight: { bn: "খোলপোড়া", en: "sheath blight" },
  tungro: { bn: "টুংরো", en: "tungro" },
  blb: { bn: "বিএলবি", en: "BLB" },
  not_sure: { bn: "নিশ্চিত নয়", en: "not sure" },
};

const segColor = (cls: string, dominant: string | null) =>
  cls === "healthy" ? "bg-ok" : cls === "not_sure" ? "bg-border" : cls === dominant ? "bg-bad" : "bg-warn";

/** "Your field" block at the top of the result: counts, spread bar, spread label, one fixed action. No percentages. */
export function FieldSummaryCard({ f }: { f: FieldSummary }) {
  const { t, tx, lang } = useLang();
  const name = (c: string) => tx(SHORT[c] ?? LABEL_NAMES[c]);
  const lead = f.spread === "unclear" ? "not_sure" : (f.dominant ?? "healthy");
  const rest = Object.keys(f.counts)
    .filter((c) => c !== lead && f.counts[c] > 0)
    .sort((a, b) => f.counts[b] - f.counts[a] || a.localeCompare(b));
  const classes = [lead, ...rest].filter((c) => f.counts[c] > 0);
  const tone = f.spread === "whole_field" ? "border-bad/30 bg-bad-soft" : f.spread === "patches" || f.spread === "unclear" ? "border-warn/30 bg-warn-soft" : "border-ok/30 bg-ok-soft";
  return (
    <section className={cn("flex flex-col gap-3 rounded-3xl border-2 p-4", tone)} data-testid="field-summary">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Footprints className="size-4" /> {t("your_field")}
      </h3>
      <p className="text-xl font-bold leading-snug" data-testid="field-lead">
        {fillStr(t("field_lead"), { k: num(f.counts[lead] ?? 0, lang), n: num(f.n, lang), name: name(lead) })}
        {rest.map((c) => (
          <span key={c} className="font-semibold text-muted-foreground">
            {" · "}
            {num(f.counts[c], lang)} {name(c)}
          </span>
        ))}
      </p>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {classes.map((c) => (
          <div key={c} className={segColor(c, f.dominant)} style={{ flex: f.counts[c] }} />
        ))}
      </div>
      <p className="text-lg font-semibold" data-testid="field-spread">{t(`spread_${f.spread}`)}</p>
      <p className="text-[17px] leading-relaxed" data-testid="field-action">{t(`act_${f.spread}`)}</p>
      <p className="text-xs text-muted-foreground">{fillStr(t("field_basis"), { n: num(f.n, lang) })}</p>
    </section>
  );
}
