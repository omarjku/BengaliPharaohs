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
import { getCase, getPhoto, getProfile, newId, saveCase, saveProfile, savePhoto, type Profile } from "@/lib/store/db";
import type { StringKey } from "@/lib/strings";

/** Canonical order. Which steps appear depends on the answers (see planSteps); back keeps every answer. */
const CANON = ["photo", "field", "where", "details", "weather", "followup"] as const;
type StepId = (typeof CANON)[number];
const after = (a: StepId, b: StepId) => CANON.indexOf(a) > CANON.indexOf(b);

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
  const [trail, setTrail] = useState<StepId[]>(["photo"]);
  const step = trail[trail.length - 1];
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [caseId, setCaseId] = useState(newId);
  const [editing, setEditing] = useState(false);
  const [editField, setEditField] = useState(false);
  const [followQs, setFollowQs] = useState<string[]>([]);
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
      startModel(small);
      setFollowQs([]);
      setTrail(["photo", needField ? "field" : "where"]);
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

  function startModel(photo: Blob) {
    setModel(null);
    modelRun.current = classify(photo).catch((e: Error) => ({ error: e.message }));
    modelRun.current.then(setModel);
  }

  async function openForEdit(id: string) {
    const c = await getCase(id);
    const photo = await getPhoto(id);
    if (!c || c.kind !== "leaf" || !photo) return;
    setA(c.answers ?? {});
    setEditing(true);
    // A case already sent to the SAAO stays as it was; the edited check becomes a new case.
    let target = id;
    if (c.share !== "local") {
      target = newId();
      await savePhoto(target, photo);
    }
    setCaseId(target);
    setPhotoUrl(URL.createObjectURL(photo));
    startModel(photo);
    setTrail(["where"]);
  }
  // "Change answers" from the result card: /check/?edit=<case id> reopens that check with its answers and photo.
  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get("edit");
    if (editId) openForEdit(editId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pred = model && "pred" in model ? model.pred : undefined;
  const relevant = useMemo(() => relevantConditions(pred), [pred]);
  const wholeField = a.pattern === "whole_field" || a.pattern === "whole_field_dying";
  // Whole-field yellowing points to nutrients or flooding, so those two are always asked then.
  const showRow = (row: string) => (wholeField && (row === "urea" || row === "flooded")) || !relevant || ROW_CONDITIONS[row].some((c) => relevant.has(c));

  // ---- Which steps and questions this farmer gets (branching start + model-targeted questions) ----
  const needField = editField || !(profile.upazila && a.variety);
  const placesOnPlant = (a.where ?? []).filter((w) => w !== "unknown");
  // Only sheath / panicle / plant base: a leaf photo can't judge it (location guard) → no leaf or weather questions.
  const offLeafOnly = placesOnPlant.length > 0 && placesOnPlant.every((w) => w === "sheath" || w === "panicle" || w === "base");
  const showFirst = !offLeafOnly && (wholeField || !relevant || relevant.has("old_leaves_first") || relevant.has("new_leaves_first"));
  const showInsects =
    placesOnPlant.includes("base") ||
    a.pattern === "one_hill" ||
    a.pattern === "patches" ||
    a.pattern === "whole_field_dying" ||
    !relevant ||
    [...relevant].some((c) => c.startsWith("insects_"));
  const weatherRows = [...(["rain", "flooded", "storm", "cold_nights", "urea"] as const).filter(showRow), ...(place?.region === "coastal" ? ["salty_water"] : [])];

  function planSteps(): StepId[] {
    const s: StepId[] = ["photo"];
    if (needField) s.push("field");
    s.push("where");
    if (showFirst || showInsects) s.push("details");
    if (!offLeafOnly && weatherRows.length) s.push("weather");
    if (followQs.length) s.push("followup");
    return s;
  }
  const order = planSteps();

  function conditionsNow() {
    const season = profile.season ?? seasonFromDate(date);
    const stage = stageFromTransplant(profile.transplant_date, date);
    return conditionsFrom(a, { season, stage, region: place?.region });
  }

  /** After the last planned step: ask 1–3 targeted questions only if the photo leaves a close call. */
  async function targetedQuestions(): Promise<string[]> {
    const out = model ?? (modelRun.current ? await modelRun.current : null);
    if (!out || "error" in out) return [];
    const th = { ...DEFAULT_THRESHOLDS, min_prob: out.th.min_prob, min_margin: out.th.min_margin };
    const cross = crossCheck(out.pred, conditionsNow(), th);
    if (cross.decision === "location_guard" || cross.reasons.includes("model_confident")) return [];
    return cross.ask.filter((q) => !a.followups?.[q]).slice(0, 3);
  }

  async function goNext() {
    let next = order.find((s) => after(s, step));
    if (!next && step !== "followup") {
      setBusy(true);
      const qs = await targetedQuestions();
      setBusy(false);
      if (qs.length) {
        setFollowQs(qs);
        next = "followup";
      }
    }
    if (next) setTrail((t) => [...t, next]);
    else await finish();
  }

  function goBack() {
    if (trail.length > 1) {
      if (step === "followup") setFollowQs([]); // re-planned from the (maybe changed) answers next time
      if (step === "field") setEditField(false);
      setTrail((t) => t.slice(0, -1));
    } else if (editing) router.back();
    else router.push("/");
  }

  async function finish() {
    setBusy(true);
    const out = model ?? (await modelRun.current!);
    const conditions = conditionsNow();
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
    <AppShell title={t("check_title")} onBack={goBack}>
      <Steps step={order.filter((s) => !after(s, step)).length} total={order.length} />
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

      {photoUrl && step !== "photo" && (
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
          <button onClick={() => setTrail(["photo"])} className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-primary" aria-label={t("photo_retake")}>
            <RotateCcw className="size-4" />
          </button>
        </div>
      )}

        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {step === "photo" && (
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

          {step === "field" && (
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
                  await goNext();
                }}
              >
                {t("next")}
              </BigButton>
            </div>
          )}

          {step === "where" && (
            <div className="flex flex-col gap-6">
              {!needField && (
                // Field details already known (profile): show them, one tap to change.
                <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t("your_field")}:</span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {[PLACES.varieties.find((v) => v.id === a.variety), place].filter(Boolean).map((x) => tx(x!)).join(" · ")} · {t(`season_${profile.season ?? seasonFromDate(date)}`)}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-primary"
                    onClick={() => {
                      setEditField(true);
                      setTrail((tr) => [...tr.slice(0, -1), "field"]);
                    }}
                  >
                    {t("change")}
                  </button>
                </div>
              )}
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
              <BigButton onClick={goNext} disabled={busy}>{t("next")}</BigButton>
            </div>
          )}

          {step === "details" && (
            <div className="flex flex-col gap-6">
              {showFirst && <Choice
                clip="Q-FIRST"
                question={t("q_first")}
                value={a.first}
                onChange={(v) => set("first", v)}
                options={[
                  { value: "old", label: t("first_old"), icon: "⬇️" },
                  { value: "new", label: t("first_new"), icon: "⬆️" },
                  { value: "none", label: t("first_none"), icon: "✅" },
                ]}
              />}
              {showInsects && <MultiChoice
                clip="Q-INSECTS"
                question={t("q_insects")}
                value={a.insects}
                onChange={(v) => set("insects", v)}
                exclusive={["none"]}
                options={[
                  ...INSECTS.map((i) => ({ value: i, label: t(`ins_${i}`), hint: t(`ins_${i}_h`), icon: INSECT_ICON[i] })),
                  { value: "none" as const, label: t("insects_none"), icon: "✓" },
                ]}
              />}
              <BigButton onClick={goNext} disabled={busy}>{t("next")}</BigButton>
            </div>
          )}

          {step === "weather" && (
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
              <BigButton className="mt-3" onClick={goNext} disabled={busy}>
                {busy ? <Loader2 className="size-5 animate-spin" /> : null}
                {t("next")}
              </BigButton>
            </div>
          )}

          {step === "followup" && (
            <div className="flex flex-col gap-3">
              <div className="mb-1">
                <h2 className="text-2xl font-bold">{t("followup_title")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("followup_sub")}</p>
              </div>
              {followQs.map((q) => (
                <Segmented
                  key={q}
                  label={tx(KNOWLEDGE.questions[q])}
                  value={a.followups?.[q]}
                  onChange={(v) => setA((x) => ({ ...x, followups: { ...x.followups, [q]: v } }))}
                  options={yn("dont_know")}
                />
              ))}
              <BigButton className="mt-3" onClick={finish} disabled={busy}>
                {busy ? <Loader2 className="size-5 animate-spin" /> : null}
                {t("see_result")}
              </BigButton>
            </div>
          )}
        </motion.div>
      {(step === "details" || step === "weather") && (
        <button onClick={goNext} className="mt-3 w-full py-2 text-center text-sm text-muted-foreground underline">
          {t("skip")}
        </button>
      )}
    </AppShell>
  );
}
