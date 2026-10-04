"use client";

import { Camera, ImageIcon, Loader2, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BigButton, Speak } from "@/components/app/choice";
import { CameraSheet } from "@/components/app/camera-sheet";
import { fillStr, SHORT } from "@/components/app/field-summary";
import { num, useLang } from "@/lib/i18n";
import { classify, shrinkPhoto } from "@/lib/model/classify";
import { confidentClass, MAX_SPOTS, MIN_SPOTS } from "@/lib/model/field";
import { cn } from "@/lib/utils";

export type SpotOut = Awaited<ReturnType<typeof classify>> | { error: string };
export type WalkSpot = { id: string; blob: Blob; url: string; out?: SpotOut }; // out undefined = still being read

type Slot = { id: string; blob?: Blob; url?: string; out?: SpotOut; v: number };
// Dot positions (% of the field sketch): 4 corners, middle, "worst", then up to 4 extras.
const POS: [number, number][] = [[14, 14], [86, 14], [14, 86], [86, 86], [50, 50], [70, 66], [32, 30], [68, 32], [30, 70], [50, 22]];
const slot = (i: number): Slot => ({ id: `s${i}`, v: 0 });

/** Guided field walk: tap a spot on the sketch, add a leaf photo; it is read right away (one at a time). */
export function FieldWalk({ seed, onChange, onNext }: { seed?: Blob[]; onChange: (spots: WalkSpot[]) => void; onNext: () => void }) {
  const { t, tx, lang } = useLang();
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: Math.max(6, seed?.length ?? 0) }, (_, i) => slot(i)));
  const [active, setActive] = useState(0);
  const [camOpen, setCamOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve()); // photos are read one after another, never in parallel
  const urls = useRef(new Set<string>());
  const seeded = useRef(false);

  useEffect(() => {
    const all = urls.current;
    return () => all.forEach(URL.revokeObjectURL);
  }, []);
  useEffect(() => {
    onChange(slots.filter((s): s is Slot & { blob: Blob; url: string } => !!s.blob && !!s.url).map((s) => ({ id: s.id, blob: s.blob, url: s.url, out: s.out })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const label = (i: number) => (i < 4 ? fillStr(t("walk_corner"), { n: num(i + 1, lang) }) : i === 4 ? t("walk_mid") : i === 5 ? t("walk_worst") : fillStr(t("walk_extra"), { n: num(i - 5, lang) }));

  /** Put a (small) photo into slot i and read it. A retake bumps v so an older read cannot overwrite the new one. */
  function put(i: number, small: Blob) {
    const url = URL.createObjectURL(small);
    urls.current.add(url);
    const v = (slots[i]?.v ?? 0) + 1;
    setSlots((xs) => {
      const old = xs[i]?.url;
      if (old) {
        URL.revokeObjectURL(old);
        urls.current.delete(old);
      }
      return xs.map((s, j) => (j === i ? { ...s, blob: small, url, out: undefined, v } : s));
    });
    chain.current = chain.current.then(async () => {
      const out: SpotOut = await classify(small).catch((e: Error) => ({ error: e.message }));
      setSlots((xs) => xs.map((s, j) => (j === i && s.v === v ? { ...s, out } : s)));
    });
  }

  async function addFiles(files: Blob[]) {
    setError(null);
    const imgs = files.filter((f) => !f.type || f.type.startsWith("image/"));
    if (!imgs.length) return setError(t("photo_not_image"));
    setBusy(true);
    let at = active;
    try {
      for (const f of imgs) {
        // Several photos at once fill the next empty spots after the chosen one.
        while (at < slots.length && at !== active && slots[at].blob) at++;
        if (at >= slots.length) break;
        put(at, await shrinkPhoto(f));
        at++;
      }
      const nextEmpty = slots.findIndex((s, i) => i >= at && !s.blob);
      if (nextEmpty >= 0) setActive(nextEmpty);
    } catch (e) {
      setError(`${t("photo_failed")} (${e instanceof Error ? e.message : String(e)})`);
    } finally {
      setBusy(false);
    }
  }

  // "Change answers": photos of the earlier check come back already shrunk.
  useEffect(() => {
    if (seeded.current || !seed?.length) return;
    seeded.current = true;
    seed.forEach((b, i) => put(i, b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const done = slots.filter((s) => s.blob);
  const reading = done.some((s) => !s.out);
  const ready = done.length >= MIN_SPOTS && !reading && !busy;
  const cur = slots[active];

  return (
    <div className="flex flex-col gap-4">
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addFiles([f]); }} />
      <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) addFiles(f); }} />
      {camOpen && (
        <CameraSheet
          onPhoto={(b) => { setCamOpen(false); addFiles([b]); }}
          onClose={() => setCamOpen(false)}
          onFallback={() => { setCamOpen(false); camRef.current?.click(); }}
        />
      )}
      <div>
        <h2 className="flex items-center justify-between gap-3 text-2xl font-bold">
          {t("walk_title")}
          <Speak clip="Q-PHOTO" />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("walk_sub")}</p>
      </div>

      {/* The field: a square with crop rows; each spot is a real button on top (big tap target). */}
      <div className="relative mx-auto aspect-square w-full max-w-72 overflow-hidden rounded-3xl border-2 border-primary/30 bg-secondary/40">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full text-primary" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={10 + i * 10} y1="6" x2={10 + i * 10} y2="94" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="3 3" />
          ))}
        </svg>
        {slots.map((s, i) => {
          const c = s.out && "pred" in s.out ? confidentClass(s.out.pred, s.out.th) : null;
          const tone = !s.blob ? "border-dashed border-primary/50 bg-card/70 text-muted-foreground" : !s.out ? "border-primary bg-card" : c === "healthy" ? "border-ok bg-ok-soft text-ok" : c ? "border-bad bg-bad-soft text-bad" : "border-unsure bg-unsure-soft text-unsure";
          return (
            <button
              key={s.id}
              type="button"
              aria-label={`${label(i)}${s.blob ? "" : " +"}`}
              aria-pressed={active === i}
              data-spot={i}
              onClick={() => setActive(i)}
              style={{ left: `${POS[i][0]}%`, top: `${POS[i][1]}%` }}
              className={cn("absolute flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 px-0.5 text-center text-[11px] font-bold leading-tight", tone, active === i && "ring-4 ring-primary/40")}
            >
              {!s.blob ? <Plus className="size-5" /> : !s.out ? <Loader2 className="size-5 animate-spin" /> : c ? tx(SHORT[c]) : "?"}
            </button>
          );
        })}
      </div>

      {slots.length < MAX_SPOTS && (
        <button type="button" onClick={() => { setSlots((xs) => [...xs, slot(xs.length)]); setActive(slots.length); }} className="min-h-11 self-center rounded-full border-2 border-primary/30 px-4 text-sm font-semibold text-primary">
          + {t("walk_add")}
        </button>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cur?.url && <img src={cur.url} alt="" className="size-14 rounded-xl object-cover" />}
          <p className="flex-1 font-semibold">{fillStr(t(cur?.blob ? "walk_retake" : "walk_pick"), { spot: label(active) })}</p>
          {busy && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => setCamOpen(true)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-card text-sm font-semibold text-primary disabled:opacity-50">
            {cur?.blob ? <RotateCcw className="size-5" /> : <Camera className="size-5" />} {t("photo_add_camera")}
          </button>
          <button type="button" disabled={busy} onClick={() => galRef.current?.click()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-card text-sm font-semibold text-primary disabled:opacity-50">
            <ImageIcon className="size-5" /> {t("photo_add_gallery")}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t("walk_multi")}</p>
      </div>

      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{error}</p>}
      <p className={cn("text-center text-sm font-medium", done.length >= MIN_SPOTS ? "text-ok" : "text-muted-foreground")} data-testid="walk-hint">
        {done.length >= MIN_SPOTS ? fillStr(t("walk_ok"), { n: num(done.length, lang) }) : fillStr(t("walk_need"), { n: num(done.length, lang) })}
      </p>
      <BigButton onClick={onNext} disabled={!ready}>
        {reading && <Loader2 className="size-5 animate-spin" />} {t("next")}
      </BigButton>
    </div>
  );
}
