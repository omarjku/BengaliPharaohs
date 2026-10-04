"use client";

import { Camera, ImageIcon, Loader2, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BigButton, Choice, MultiChoice, QuestionTitle, Speak, Steps } from "@/components/app/choice";
import { UpazilaPicker, VarietyPicker } from "@/components/app/pickers";
import { CameraSheet } from "@/components/app/camera-sheet";
import { AppShell } from "@/components/app/shell";
import { conditionsFrom, INSECTS, seasonFromDate, stageFromTransplant, type LeafAnswers } from "@/lib/engine/context";
import { crossCheck, DEFAULT_THRESHOLDS, KNOWLEDGE } from "@/lib/engine/crosscheck";
import type { Prediction, Season } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { classify, loadModel, shrinkPhoto, type ThresholdFile } from "@/lib/model/classify";
import { upazilaByCode } from "@/lib/places";
import { useEffectiveDate } from "@/lib/settings";
import { getProfile, newId, saveCase, saveProfile, savePhoto, type Profile } from "@/lib/store/db";
import type { StringKey } from "@/lib/strings";

const TOTAL = 5;

type ModelOut = { pred: Prediction; ms: number; dummy: boolean; th: ThresholdFile } | { error: string };

/** Which knowledge conditions each weather question can produce (to skip questions that can't change the answer). */
const ROW_CONDITIONS: Record<string, string[]> = {
  rain: ["rain_heavy_7d", "field_dry"],
  flooded: ["flooded_recent", "waterlogged", "field_dry"],
  storm: ["storm_recent"],
  cold_nights: ["cold_nights"],
  salty_water: ["salt_water"],
  urea: ["urea_high", "urea_none"],
};

function relevantConditions(pred?: Prediction): Set<string> | null {
  if (!pred) return null; // model not finished: ask everything
  const out = new Set<string>();
  for (const cls of [pred.top1, pred.top2]) {
    const c = KNOWLEDGE.classes[cls];
    if (!c) continue;
    [...c.favours, ...(c.unlikely_if ?? [])].forEach((x) => out.add(x));
    for (const l of c.confusers ?? []) KNOWLEDGE.lookalikes[l]?.favours.forEach((x) => out.add(x));
  }
  return out;
}

const INSECT_ICON: Record<(typeof INSECTS)[number], string> = {
  green_leafhopper: "🦗",
  bph: "🟤",
  wbph: "⚪",
  stem_borer: "🐛",
  hispa: "🪲",
  leaf_folder: "🌀",
  rice_bug: "🐞",
  armyworm: "🐛",
  gall_midge: "🦟",
  grasshopper: "🦗",
};

function Segmented<V extends string>({ label, value, options, onChange, clip }: { label: string; value?: V; options: { v: V; label: string }[]; onChange: (v: V) => void; clip?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3">
      <QuestionTitle as="span" clip={clip}>
        {label}
      </QuestionTitle>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={value === o.v}
            className={cn(
              "min-h-12 rounded-xl border-2 px-1 text-[15px] font-medium leading-tight transition-colors",
              value === o.v ? "border-primary bg-secondary text-secondary-foreground" : "border-transparent bg-muted",
              o.v === "unknown" && value !== o.v && "text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CheckPage() {
  const { t, tx } = useLang();
  const router = useRouter();
  const { date, simulated } = useEffectiveDate();
  const [step, setStep] = useState(1);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [caseId] = useState(newId);
  const [model, setModel] = useState<ModelOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [a, setA] = useState<LeafAnswers>({});
  const [profile, setProfile] = useState<Profile>({});
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const modelRun = useRef<Promise<ModelOut> | null>(null);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setA((x) => ({ ...x, variety: x.variety ?? p.variety }));
    });
    loadModel().catch(() => {}); // warm up while the farmer frames the photo
  }, []);
  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]); // each step starts at the top on small screens

  const place = upazilaByCode(profile.upazila);
  const set = <K extends keyof LeafAnswers>(k: K, v: LeafAnswers[K]) => setA((x) => ({ ...x, [k]: v }));

  // Camera photos on some Androids arrive with an empty type, so only reject files that are clearly not images.
  const looksLikeImage = (f: Blob) => !f.type || f.type.startsWith("image/");

  async function onFile(f: Blob | undefined) {
    setPhotoError(null);
    if (!f) return;
    if (!looksLikeImage(f)) return setPhotoError(t("photo_not_image"));
    setProcessing(true);
    try {
      // Save first: on 1 GB phones the page can be killed; the photo must already be safe.
      const small = await shrinkPhoto(f);
      await savePhoto(caseId, small);
      setPhotoUrl(URL.createObjectURL(small));
      setModel(null);
      modelRun.current = classify(small).catch((e: Error) => ({ error: e.message }));
      modelRun.current.then(setModel);
      setStep(2);
    } catch (e) {
      // e.g. a format the browser can't open (some phones save HEIC). Show it instead of failing silently.
      setPhotoError(`${t("photo_failed")} (${e instanceof Error ? e.message : String(e)})`);
    } finally {
      setProcessing(false);
    }
  }

  /** Native file inputs don't fire again for the same file unless the value is cleared. */
  const fromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    onFile(f);
  };

  const pred = model && "pred" in model ? model.pred : undefined;
  const relevant = useMemo(() => relevantConditions(pred), [pred]);
  const showRow = (row: string) => !relevant || ROW_CONDITIONS[row].some((c) => relevant.has(c));

  async function finish() {
    setBusy(true);
    const out = model ?? (await modelRun.current!);
    const season = profile.season ?? seasonFromDate(date);
    const stage = stageFromTransplant(profile.transplant_date, date);
    const conditions = conditionsFrom(a, { season, stage, region: place?.region });
    const base = {
      id: caseId,
      created_at: new Date().toISOString(),
      kind: "leaf" as const,
      date_used: date,
      simulated_date: simulated,
      upazila: profile.upazila,
      answers: a,
      conditions,
      share: "local" as const,
      consent: false,
    };
    if ("error" in out) {
      await saveCase({
        ...base,
        card: "C8",
        cross: { decision: "not_sure", cls: null, card: "C8", ask: [], reasons: ["model_error"], support: {} },
      });
    } else {
      const th = { ...DEFAULT_THRESHOLDS, min_prob: out.th.min_prob, min_margin: out.th.min_margin };
      const cross = crossCheck(out.pred, conditions, th);
      await saveCase({ ...base, card: cross.card, prediction: out.pred, cross, model_ms: out.ms, model_dummy: out.dummy });
    }
    router.push(`/result/?id=${caseId}`);
  }

  const yn = (k: StringKey) => [
    { v: "yes" as const, label: t("yes") },
    { v: "no" as const, label: t("no") },
    { v: "unknown" as const, label: t(k) },
  ];

  return (
    <AppShell title={t("check_title")} back="/">
      <Steps step={step} total={TOTAL} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={fromInput} />
      <input ref={galRef} type="file" accept="image/*" hidden onChange={fromInput} />
      {camOpen && (
        <CameraSheet
          onPhoto={(b) => {
            setCamOpen(false);
            onFile(b);
          }}
          onClose={() => setCamOpen(false)}
          onFallback={() => {
            // No in-page camera (permission refused, old browser): use the phone's camera app instead.
            setCamOpen(false);
            camRef.current?.click();
          }}
        />
      )}

      {photoUrl && step > 1 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border bg-card p-2 pr-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="size-16 rounded-xl object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            {!model ? (
              <span className="flex items-center gap-2 font-medium text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t("photo_reading")}
              </span>
            ) : (
              <span className="font-medium text-ok">✓ {t("photo_saved_local")}</span>
            )}
          </div>
          <button onClick={() => setStep(1)} className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-primary" aria-label={t("photo_retake")}>
            <RotateCcw className="size-4" />
          </button>
        </div>
      )}

        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="flex items-center justify-between gap-3 text-2xl font-bold">
                {t("photo_title")}
                <Speak clip="Q-PHOTO" />
              </h2>
              {/* Tap opens the gallery; on a laptop a photo can also be dragged here. */}
              <button
                type="button"
                onClick={() => galRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  onFile(e.dataTransfer.files[0]);
                }}
                className={cn(
                  "flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-colors",
                  dragging ? "border-primary bg-secondary" : "border-primary/30 bg-secondary/40",
                )}
              >
                <svg viewBox="0 0 120 60" className="w-40 text-primary" aria-hidden>
                  <path d="M6 40 C 40 10, 80 10, 114 30 C 80 40, 40 50, 6 40 Z" fill="currentColor" opacity="0.18" />
                  <path d="M6 40 C 40 10, 80 10, 114 30" stroke="currentColor" strokeWidth="2.5" fill="none" />
                  <ellipse cx="62" cy="26" rx="7" ry="3.5" fill="oklch(0.55 0.12 50)" />
                  <ellipse cx="82" cy="27" rx="5" ry="2.5" fill="oklch(0.55 0.12 50)" />
                </svg>
                <p className="text-base text-muted-foreground">{t("photo_tips")}</p>
                <p className="hidden text-sm font-medium text-primary md:block">{t("photo_drop")}</p>
              </button>
              {photoError && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{photoError}</p>}
              {processing && (
                <p className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" /> {t("photo_reading")}
                </p>
              )}
              <BigButton onClick={() => setCamOpen(true)} disabled={processing}>
                <Camera className="size-6" /> {t("photo_camera")}
              </BigButton>
              <BigButton variant="outline" onClick={() => galRef.current?.click()} disabled={processing}>
                <ImageIcon className="size-6" /> {t("photo_gallery")}
              </BigButton>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="flex items-center justify-between gap-3 text-2xl font-bold">
                  {t("field_title")}
                  <Speak clip="Q-FIELD" />
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("field_sub")}</p>
              </div>
              <VarietyPicker hint={t("variety_hint")} value={a.variety} onChange={(v) => set("variety", v)} />
              <UpazilaPicker value={profile.upazila} onChange={(v) => setProfile((p) => ({ ...p, upazila: v }))} />
              <Choice<Season>
                clip="Q-SEASON"
                question={t("profile_season")}
                noUnknown
                cols={3}
                value={profile.season ?? seasonFromDate(date)}
                onChange={(v) => setProfile((p) => ({ ...p, season: v as Season }))}
                options={(["aman", "aus", "boro"] as const).map((x) => ({ value: x, label: t(`season_${x}`) }))}
              />
              <BigButton
                onClick={async () => {
                  // Remember for next time (stays on the phone).
                  await saveProfile({ ...profile, season: profile.season ?? seasonFromDate(date), variety: a.variety ?? profile.variety });
                  setStep(3);
                }}
              >
                {t("next")}
              </BigButton>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <MultiChoice
                clip="Q-WHERE"
                question={t("q_where")}
                value={a.where}
                onChange={(v) => set("where", v)}
                options={[
                  { value: "tip_edge", label: t("where_tip_edge"), icon: "🍃" },
                  { value: "middle", label: t("where_middle"), icon: "🟤" },
                  { value: "sheath", label: t("where_sheath"), icon: "🌊" },
                  { value: "panicle", label: t("where_panicle"), icon: "🌾" },
                  { value: "base", label: t("where_base"), icon: "🪴" },
                  { value: "none", label: t("where_none"), icon: "✅" },
                ]}
                exclusive={["none"]}
              />
              <Choice
                clip="Q-PATTERN"
                question={t("q_pattern")}
                hint={t("q_pattern_hint")}
                value={a.pattern}
                onChange={(v) => set("pattern", v)}
                options={[
                  { value: "one_hill", label: t("pattern_one_hill"), icon: "🌱" },
                  { value: "patches", label: t("pattern_patches"), icon: "🟤" },
                  { value: "whole_field", label: t("pattern_whole_field"), icon: "🌾" },
                  { value: "whole_field_dying", label: t("pattern_whole_field_dying"), hint: t("pattern_whole_field_dying_h"), icon: "🥀" },
                  { value: "none", label: t("pattern_none"), icon: "✅" },
                ]}
              />
              <BigButton onClick={() => setStep(4)}>{t("next")}</BigButton>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-6">
              <Choice
                clip="Q-FIRST"
                question={t("q_first")}
                value={a.first}
                onChange={(v) => set("first", v)}
                options={[
                  { value: "old", label: t("first_old"), icon: "⬇️" },
                  { value: "new", label: t("first_new"), icon: "⬆️" },
                  { value: "none", label: t("first_none"), icon: "✅" },
                ]}
              />
              <MultiChoice
                clip="Q-INSECTS"
                question={t("q_insects")}
                value={a.insects}
                onChange={(v) => set("insects", v)}
                exclusive={["none"]}
                options={[
                  ...INSECTS.map((i) => ({ value: i, label: t(`ins_${i}`), hint: t(`ins_${i}_h`), icon: INSECT_ICON[i] })),
                  { value: "none" as const, label: t("insects_none"), icon: "✓" },
                ]}
              />
              <BigButton onClick={() => setStep(5)}>{t("next")}</BigButton>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-3">
              <h2 className="mb-1 text-lg font-semibold">{t("q_weather")}</h2>
              {showRow("rain") && (
                <Segmented
                  clip="Q-RAIN"
                  label={t("q_rain")}
                  value={a.rain}
                  onChange={(v) => set("rain", v)}
                  options={[
                    { v: "none", label: t("rain_none") },
                    { v: "some", label: t("rain_some") },
                    { v: "heavy", label: t("rain_heavy") },
                    { v: "unknown", label: t("dont_know") },
                  ]}
                />
              )}
              {showRow("flooded") && <Segmented clip="Q-FLOODED" label={t("q_flooded")} value={a.flooded} onChange={(v) => set("flooded", v)} options={yn("dont_know")} />}
              {showRow("storm") && <Segmented clip="Q-STORM" label={t("q_storm")} value={a.storm} onChange={(v) => set("storm", v)} options={yn("dont_know")} />}
              {showRow("cold_nights") && <Segmented clip="Q-COLD" label={t("q_cold")} value={a.cold_nights} onChange={(v) => set("cold_nights", v)} options={yn("dont_know")} />}
              {place?.region === "coastal" && <Segmented clip="Q-SALTY" label={t("q_salty")} value={a.salty_water} onChange={(v) => set("salty_water", v)} options={yn("dont_know")} />}
              {showRow("urea") && (
                <Segmented
                  clip="Q-UREA"
                  label={t("q_urea")}
                  value={a.urea}
                  onChange={(v) => set("urea", v)}
                  options={[
                    { v: "none", label: t("urea_none") },
                    { v: "normal", label: t("urea_normal") },
                    { v: "a_lot", label: t("urea_a_lot") },
                    { v: "unknown", label: t("dont_know") },
                  ]}
                />
              )}
              <BigButton className="mt-3" onClick={finish} disabled={busy}>
                {busy ? <Loader2 className="size-5 animate-spin" /> : null}
                {t("see_result")}
              </BigButton>
            </div>
          )}
        </motion.div>
      {step > 2 && step < TOTAL && (
        <button onClick={() => setStep(step + 1)} className="mt-3 w-full py-2 text-center text-sm text-muted-foreground underline">
          {t("skip")}
        </button>
      )}
    </AppShell>
  );
}
