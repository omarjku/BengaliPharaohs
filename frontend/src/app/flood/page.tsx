"use client";

import { CalendarDays, Loader2, Minus, Plus } from "lucide-react";
import * as m from "motion/react-m";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { BigButton, Choice, QuestionTitle, Steps } from "@/components/app/choice";
import { UpazilaPicker } from "@/components/app/pickers";
import { AppShell } from "@/components/app/shell";
import { advisorCard } from "@/lib/engine/cards";
import { seasonFromDate, stageFromTransplant } from "@/lib/engine/context";
import { droughtResult, evaluateAdvisor } from "@/lib/engine/rules";
import type { AdvisorInput, Stage } from "@/lib/engine/types";
import { formatDate, num, useLang } from "@/lib/i18n";
import { PLACES, upazilaByCode, varietyById } from "@/lib/places";
import { useEffectiveDate } from "@/lib/settings";
import { getProfile, newId, saveCase, saveProfile, type CaseRecord, type Profile } from "@/lib/store/db";

const STAGES: { value: Stage; icon: string }[] = [
  { value: "seedbed", icon: "🌱" },
  { value: "early_tillering", icon: "🌿" },
  { value: "tillering", icon: "🌾" },
  { value: "pi_booting", icon: "🎋" },
  { value: "flowering", icon: "🌼" },
  { value: "grain_filling", icon: "🍚" },
];

const undef = <T,>(v: T | "unknown" | undefined) => (v === "unknown" ? undefined : v);

export default function FloodPage() {
  const { t, tx, lang } = useLang();
  const router = useRouter();
  const { date, simulated } = useEffectiveDate();
  const [profile, setProfile] = useState<Profile>({});
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [event, setEvent] = useState<"flood" | "drought" | undefined>();
  const [f, setF] = useState<{
    variety_type?: AdvisorInput["variety_type"];
    submergence?: "full" | "partial" | "unknown";
    days?: number | "unknown";
    stage?: Stage | "unknown";
    hills_alive?: AdvisorInput["hills_alive"] | "unknown";
    seedlings_available?: AdvisorInput["seedlings_available"];
    salty_water?: AdvisorInput["salty_water"];
  }>({ days: 3 });

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      const v = varietyById(p.variety);
      setF((x) => ({
        ...x,
        variety_type: x.variety_type ?? v?.type,
        stage: x.stage ?? stageFromTransplant(p.transplant_date, date),
      }));
    }).catch(() => {});
  }, [date]);

  const place = upazilaByCode(profile.upazila);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]); // each step starts at the top on small screens
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save(c: Omit<CaseRecord, "id" | "created_at" | "share" | "consent" | "date_used" | "simulated_date" | "upazila">) {
    const id = newId();
    try {
      await saveCase({ ...c, id, created_at: new Date().toISOString(), share: "local", consent: false, date_used: date, simulated_date: simulated, upazila: profile.upazila });
    } catch {
      setBusy(false); // storage full: stay here and say so instead of a spinner that never ends
      toast.error(t("save_failed"));
      return;
    }
    router.push(`/result/?id=${id}`);
  }

  async function drought() {
    setBusy(true);
    const advisor = droughtResult();
    await save({ kind: "drought", card: "A7", advisor });
  }

  async function finish() {
    setBusy(true);
    const input: AdvisorInput = {
      season: profile.season ?? seasonFromDate(date),
      variety_type: f.variety_type,
      submergence: undef(f.submergence),
      days_under_water: undef(f.days),
      stage: undef(f.stage),
      date,
      region: place?.region,
      north: place?.north,
      salty_water: place?.region === "coastal" ? (f.salty_water ?? "unknown") : undefined,
      hills_alive: undef(f.hills_alive),
      seedlings_available: f.seedlings_available,
    };
    const advisor = evaluateAdvisor(input);
    await save({ kind: "flood", card: advisorCard(advisor), advisor, advisor_input: input });
  }

  const daysVal = typeof f.days === "number" ? f.days : undefined;

  return (
    <AppShell title={t("flood_title")} back="/">
      <Steps step={step} total={4} />
      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm">
        <CalendarDays className="size-4 text-muted-foreground" />
        <span>
          {t("date_used")}: <b>{formatDate(date, lang)}</b>
        </span>
        {simulated && <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{t("simulated")}</span>}
      </div>

        <m.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <Choice<"flood" | "drought">
                clip="Q-EVENT"
                question={t("q_event")}
                noUnknown
                cols={1}
                value={event}
                onChange={(v) => setEvent(v as "flood" | "drought")}
                options={[
                  { value: "flood", label: t("event_flood"), icon: "🌊" },
                  { value: "drought", label: t("event_drought"), icon: "☀️" },
                ]}
              />
              <UpazilaPicker highlight value={profile.upazila} onChange={(v) => setProfile((p) => ({ ...p, upazila: v }))} />
              {/* Both answers can be given in any order; nothing moves on until "Next". */}
              <BigButton
                disabled={!event || !profile.upazila || busy}
                onClick={async () => {
                  await saveProfile(profile).catch(() => {}); // the case save below reports a full phone
                  if (event === "drought") drought();
                  else setStep(2);
                }}
              >
                {busy && <Loader2 className="size-5 animate-spin" />}
                {t("next")}
              </BigButton>
              {(!event || !profile.upazila) && <p className="-mt-3 text-center text-sm text-muted-foreground">{t("need_both")}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <Choice
                clip="Q-VARIETY-TYPE"
                question={t("q_variety_type")}
                value={f.variety_type}
                onChange={(v) => set("variety_type", v)}
                cols={1}
                options={[
                  { value: "sub1", label: t("yes"), hint: t("variety_sub1_hint"), icon: "🛟" },
                  { value: "conventional", label: t("no"), icon: "🌾" },
                ]}
              />
              <Choice
                clip="Q-SUBMERGENCE"
                question={t("q_submergence")}
                value={f.submergence}
                onChange={(v) => set("submergence", v)}
                cols={1}
                options={[
                  { value: "full", label: t("sub_full"), icon: "🌊" },
                  { value: "partial", label: t("sub_partial"), icon: "〰️" },
                ]}
              />
              <BigButton onClick={() => setStep(3)}>{t("next")}</BigButton>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <QuestionTitle clip="Q-DAYS">{t("q_days")}</QuestionTitle>
                <div className="flex items-center justify-center gap-4 rounded-3xl border-2 bg-card p-4">
                  <button
                    onClick={() => set("days", Math.max(0, (daysVal ?? 1) - 1))}
                    className="flex size-16 items-center justify-center rounded-2xl bg-muted active:bg-secondary"
                    aria-label="-1"
                  >
                    <Minus className="size-7" />
                  </button>
                  <div className="min-w-24 text-center">
                    <div className="text-5xl font-bold tabular-nums text-primary">{daysVal !== undefined ? num(daysVal, lang) : "?"}</div>
                    <div className="text-sm text-muted-foreground">{t("days")}</div>
                  </div>
                  <button
                    onClick={() => set("days", Math.min(60, (daysVal ?? -1) + 1))}
                    className="flex size-16 items-center justify-center rounded-2xl bg-muted active:bg-secondary"
                    aria-label="+1"
                  >
                    <Plus className="size-7" />
                  </button>
                </div>
                <button
                  onClick={() => set("days", "unknown")}
                  aria-pressed={f.days === "unknown"}
                  className={`mt-2 w-full rounded-xl border-2 border-dashed py-2.5 text-muted-foreground ${f.days === "unknown" ? "border-primary bg-secondary" : ""}`}
                >
                  {t("dont_know")}
                </button>
              </fieldset>
              <Choice
                clip="Q-STAGE"
                question={t("stage")}
                hint={profile.transplant_date ? t("stage_estimated") : undefined}
                value={f.stage}
                onChange={(v) => set("stage", v)}
                options={STAGES.map((s) => ({ value: s.value, label: t(`stage_${s.value}`), icon: s.icon }))}
              />
              <BigButton onClick={() => setStep(4)}>{t("next")}</BigButton>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-6">
              <Choice
                clip="Q-HILLS"
                question={t("q_hills")}
                hint={t("q_hills_hint")}
                value={f.hills_alive}
                onChange={(v) => set("hills_alive", v)}
                options={[
                  { value: "most", label: t("hills_most"), icon: "🟩" },
                  { value: "about_half", label: t("hills_about_half"), icon: "🟨" },
                  { value: "few", label: t("hills_few"), icon: "🟥" },
                ]}
              />
              <Choice<"yes" | "no">
                clip="Q-SEEDLINGS"
                question={t("q_seedlings")}
                value={f.seedlings_available}
                onChange={(v) => set("seedlings_available", v)}
                options={[
                  { value: "yes", label: t("yes"), icon: "🌱" },
                  { value: "no", label: t("no"), icon: "✗" },
                ]}
              />
              {place?.region === "coastal" && (
                <Choice<"yes" | "no">
                  clip="Q-SALTY"
                  question={t("q_salty")}
                  value={f.salty_water}
                  onChange={(v) => set("salty_water", v)}
                  options={[
                    { value: "yes", label: t("yes") },
                    { value: "no", label: t("no") },
                  ]}
                />
              )}
              {place && <p className="text-sm text-muted-foreground">📍 {tx(place)} — {t("region_from_profile")}</p>}
              <BigButton onClick={finish} disabled={busy}>
                {busy && <Loader2 className="size-5 animate-spin" />}
                {t("see_result")}
              </BigButton>
            </div>
          )}
        </m.div>
    </AppShell>
  );
}
