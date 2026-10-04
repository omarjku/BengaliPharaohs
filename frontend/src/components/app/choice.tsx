"use client";

import { Check, HelpCircle, Square, Volume2 } from "lucide-react";
import * as m from "motion/react-m";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { playClips, stopAudio } from "@/lib/audio/play";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

/** 🔊 Reads the question and its options aloud (pre-generated clip, works offline). */
export function Speak({ clip, className }: { clip: string; className?: string }) {
  const { t } = useLang();
  const [on, setOn] = useState(false);
  useEffect(() => () => void (on && stopAudio()), [on]);
  async function toggle() {
    if (on) {
      stopAudio();
      return setOn(false);
    }
    setOn(true);
    const missing = await playClips([clip]);
    setOn(false);
    if (missing.length) toast(t("audio_missing"));
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("speak_question")}
      aria-pressed={on}
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-colors",
        on ? "bg-primary text-primary-foreground" : "bg-secondary text-primary hover:bg-secondary/70",
        className,
      )}
    >
      {on ? <Square className="size-4" /> : <Volume2 className="size-5" />}
    </button>
  );
}

/** Question title with an optional 🔊 button. */
export function QuestionTitle({ children, clip, as: Tag = "legend" }: { children: React.ReactNode; clip?: string; as?: "legend" | "span" | "h2" }) {
  return (
    <Tag className="mb-2.5 flex w-full items-center justify-between gap-3 text-lg font-semibold leading-snug">
      <span>{children}</span>
      {clip && <Speak clip={clip} />}
    </Tag>
  );
}

export type Option<V extends string> = { value: V; label: string; icon?: React.ReactNode; hint?: string };

/** Big tap-target single choice. Every question gets a "don't know" option unless `noUnknown`. */
export function Choice<V extends string>({
  question,
  hint,
  options,
  value,
  onChange,
  noUnknown,
  cols = 2,
  clip,
}: {
  clip?: string;
  question: string;
  hint?: string;
  options: Option<V>[];
  value: V | "unknown" | undefined;
  onChange: (v: V | "unknown") => void;
  noUnknown?: boolean;
  cols?: 1 | 2 | 3;
}) {
  const { t } = useLang();
  const all: Option<V | "unknown">[] = noUnknown
    ? options
    : [...options, { value: "unknown", label: t("dont_know"), icon: <HelpCircle className="size-6 opacity-60" /> }];
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
      <QuestionTitle clip={clip}>{question}</QuestionTitle>
      {hint && <p className="-mt-1.5 mb-1 text-sm text-muted-foreground">{hint}</p>}
      <div className={cn("grid gap-2.5", cols === 1 ? "grid-cols-1" : cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {all.map((o) => {
          const on = value === o.value;
          return (
            <m.button
              type="button"
              key={o.value}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(o.value)}
              aria-label={o.hint ? `${o.label}, ${o.hint}` : o.label}
              aria-pressed={on}
              className={cn(
                "relative flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-card px-3.5 py-3 text-left text-base font-medium shadow-xs transition-colors",
                on ? "border-primary bg-secondary text-secondary-foreground" : "border-border hover:border-primary/40",
                o.value === "unknown" && !on && "border-dashed text-muted-foreground",
              )}
            >
              {o.icon && <span className="shrink-0 text-2xl leading-none">{o.icon}</span>}
              <span className="min-w-0 flex-1 leading-snug">
                {o.label}
                {o.hint && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{o.hint}</span>}
              </span>
              {on && <Check className="size-5 shrink-0 text-primary" />}
            </m.button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BigButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <m.button
      type={type}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-lg font-semibold transition-colors disabled:opacity-45",
        variant === "primary" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        variant === "outline" && "border-2 border-primary/30 bg-card text-primary hover:bg-secondary",
        variant === "ghost" && "text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </m.button>
  );
}

export function Steps({ step, total }: { step: number; total: number }) {
  const { t, lang } = useLang();
  const n = (x: number) => (lang === "bn" ? String(x).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]) : x);
  return (
    <div className="mb-4 flex items-center gap-3" aria-label={`${t("step_of")} ${step}/${total}`}>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < step ? "bg-primary" : "bg-border")} />
        ))}
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {n(step)}/{n(total)}
      </span>
    </div>
  );
}

/**
 * Tick several answers. "Don't know" / "none" are exclusive: picking one clears the rest, picking anything else clears them.
 */
export function MultiChoice<V extends string>({
  question,
  hint,
  options,
  value,
  onChange,
  exclusive = [],
  noUnknown,
  clip,
}: {
  clip?: string;
  question: string;
  hint?: string;
  options: Option<V>[];
  value: (V | "unknown")[] | undefined;
  onChange: (v: (V | "unknown")[]) => void;
  exclusive?: V[];
  noUnknown?: boolean;
}) {
  const { t } = useLang();
  const sel = value ?? [];
  const all: Option<V | "unknown">[] = noUnknown
    ? options
    : [...options, { value: "unknown", label: t("dont_know"), icon: <HelpCircle className="size-6 opacity-60" /> }];
  const solo = new Set<string>(["unknown", ...exclusive]);
  function toggle(v: V | "unknown") {
    if (sel.includes(v)) return onChange(sel.filter((x) => x !== v));
    onChange(solo.has(v) ? [v] : [...sel.filter((x) => !solo.has(x)), v]);
  }
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
      <QuestionTitle clip={clip}>{question}</QuestionTitle>
      <p className="-mt-1.5 mb-1.5 text-sm text-muted-foreground">{hint ?? t("pick_many")}</p>
      <div className="grid grid-cols-1 gap-2.5">
        {all.map((o) => {
          const on = sel.includes(o.value);
          return (
            <m.button
              type="button"
              key={o.value}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(o.value)}
              role="checkbox"
              aria-checked={on}
              aria-label={o.hint ? `${o.label}, ${o.hint}` : o.label}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-card px-3.5 py-3 text-left text-base font-medium shadow-xs transition-colors",
                on ? "border-primary bg-secondary text-secondary-foreground" : "border-border hover:border-primary/40",
                solo.has(o.value) && !on && "border-dashed text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
                aria-hidden
              >
                {on && <Check className="size-4" />}
              </span>
              {o.icon && <span className="shrink-0 text-2xl leading-none">{o.icon}</span>}
              <span className="min-w-0 flex-1 leading-snug">
                {o.label}
                {o.hint && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{o.hint}</span>}
              </span>
            </m.button>
          );
        })}
      </div>
    </fieldset>
  );
}

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23557' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

/** Native dropdown (on Android it opens a big, familiar bottom sheet). */
export function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
  highlight,
  clip,
}: {
  clip?: string;
  label: string;
  hint?: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
  highlight?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-3 text-lg font-semibold">
        <label htmlFor={id}>{label}</label>
        {clip && <Speak clip={clip} />}
      </span>
      {hint && <span className="-mt-1 text-sm text-muted-foreground">{hint}</span>}
      <select
        id={id}
        className={cn(
          "min-h-14 w-full appearance-none rounded-2xl border-2 bg-card bg-[length:20px] bg-[right_14px_center] bg-no-repeat px-4 pr-10 text-base font-medium focus:border-primary focus:outline-none",
          highlight && !value && "border-warn/60 bg-warn-soft",
        )}
        style={{ backgroundImage: chevron }}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
