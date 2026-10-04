"use client";

import { AlertTriangle, Ban, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, CircleHelp, FlaskConical, Home, Loader2, Phone, Send, ShieldCheck, Square, Volume2, Leaf } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AreaUpdate } from "@/components/app/area-update";
import { BigButton } from "@/components/app/choice";
import { FieldSummaryCard } from "@/components/app/field-summary";
import { AppShell } from "@/components/app/shell";
import { VoiceNote } from "@/components/app/voice-note";
import { playClips, stopAudio } from "@/lib/audio/play";
import { advisorSlots, renderCard, type RenderedCard } from "@/lib/engine/cards";
import { SAAO_PESTS, type Insect } from "@/lib/engine/context";
import { KNOWLEDGE } from "@/lib/engine/crosscheck";
import { RULES } from "@/lib/engine/rules";
import { cn } from "@/lib/utils";
import { formatDate, num, useLang } from "@/lib/i18n";
import { varietyById } from "@/lib/places";
import { LABEL_NAMES, labelName } from "@/lib/labels";
import { getCase, getPhoto, getProfile, photoKey, saveCase, type CaseRecord, type Profile } from "@/lib/store/db";
import { alreadyAnswered, candidates, CHECK_AGAIN_DAYS, contextTips, fitLines, stageTask, toldPhrases } from "@/lib/engine/explain";
import { seasonFromDate, stageFromTransplant } from "@/lib/engine/context";
import type { StringKey } from "@/lib/strings";
import { syncQueued } from "@/lib/sync";
import { toast } from "sonner";

const TONE = {
  ok: { box: "bg-ok-soft text-ok border-ok/30", icon: CheckCircle2 },
  warn: { box: "bg-warn-soft text-warn border-warn/30", icon: AlertTriangle },
  bad: { box: "bg-bad-soft text-bad border-bad/30", icon: AlertTriangle },
  unsure: { box: "bg-unsure-soft text-unsure border-unsure/30", icon: CircleHelp },
};


function Confidence({ p, t }: { p: number | null; t: (k: StringKey) => string }) {
  // Calibrated probability shown as a bar with a word, never as a bare % (cards rule: no false certainty).
  const level = p === null ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3;
  const word = [t("conf_low"), t("conf_low"), t("conf_mid"), t("conf_high")][level];
  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold">{t("how_sure")}</span>
        <span className="text-muted-foreground">
          {word} · {t("not_certain")}
        </span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("h-3 flex-1 rounded-full", i <= level ? (level === 1 ? "bg-warn" : "bg-ok") : "bg-border")} />
        ))}
      </div>
    </div>
  );
}

function Part({ icon: Icon, label, children, tone }: { icon: React.ElementType; label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className="flex gap-3">
      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", tone ?? "bg-muted text-foreground")}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-[17px] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/** Plain-language, case-specific explanation: what the farmer said, how it fits, what to do in this field now. */
function LeafExplanation({ c, profile }: { c: CaseRecord; profile: Profile }) {
  const { t, tx, lang } = useLang();
  const conds = c.conditions ?? [];
  const cands = candidates(c.cross, c.prediction);
  const told = toldPhrases(conds);
  const fits = fitLines(conds, cands);
  const tips = contextTips(conds, cands);
  const task = stageTask(stageFromTransplant(profile.transplant_date, c.date_used), profile.season ?? seasonFromDate(c.date_used));
  const days = CHECK_AGAIN_DAYS[c.card];
  const again = days ? new Date(Date.parse(c.date_used) + days * 86_400_000).toISOString().slice(0, 10) : undefined;
  if (!told.length && !fits.length && !tips.length && !task) return null;
  return (
    <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
      {told.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">{t("told_title")}</h3>
          <p className="text-[15px] leading-relaxed text-muted-foreground">{told.map((x) => tx(x)).join("; ")}{lang === "bn" ? "।" : "."}</p>
        </div>
      )}
      {fits.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">{t("fit_title")}</h3>
          <div className="flex flex-col gap-3">
            {fits.map((f) => (
              <div key={f.code}>
                <div className="mb-1 text-sm font-semibold text-primary">{tx(f.name)}</div>
                <ul className="flex flex-col gap-1">
                  {f.lines.map((l, i) => (
                    <li key={i} className={cn("flex gap-2 text-[15px]", l.good ? "text-ok" : "text-bad")}>
                      <span aria-hidden>{l.good ? "✓" : "✗"}</span>
                      <span className="text-foreground">
                        {tx(l.phrase)}
                        {!l.good && <span className="text-xs text-muted-foreground"> ({t("fit_against")})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      {(tips.length > 0 || task || again) && (
        <div className="rounded-2xl bg-ok-soft/60 p-3">
          <h3 className="mb-2 font-semibold text-ok">{t("tips_title")}</h3>
          <ul className="flex flex-col gap-2 text-[15px] leading-relaxed">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>
                  {tx(tip)} <span className="text-xs text-muted-foreground">({tip.src})</span>
                </span>
              </li>
            ))}
            {task && (
              <li className="flex gap-2">
                <span aria-hidden>📅</span>
                <span>
                  <b>{t("this_week")}:</b> {tx(task)}
                </span>
              </li>
            )}
            {again && (
              <li className="flex gap-2 font-semibold">
                <span aria-hidden>🔁</span>
                <span>
                  {t("check_again_on")}: {formatDate(again, lang)}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

function ResultView() {
  const { t, tx, lang } = useLang();
  const id = useSearchParams().get("id");
  const [c, setC] = useState<CaseRecord | null | undefined>(undefined);
  const [photo, setPhoto] = useState<string | null>(null);
  const [morePhotos, setMorePhotos] = useState<string[]>([]);
  const [variety, setVariety] = useState<string | undefined>();
  const [profile, setProfile] = useState<Profile>({});
  const [playing, setPlaying] = useState(false);
  const [missingAudio, setMissingAudio] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [sharePhoto, setSharePhoto] = useState(true);
  const [shareVoice, setShareVoice] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!id) return setC(null);
    let dead = false;
    const urls: string[] = []; // every object URL made here, revoked on cleanup
    const url = (b: Blob) => {
      const u = URL.createObjectURL(b);
      urls.push(u);
      return u;
    };
    (async () => {
      const x = await getCase(id);
      if (dead) return;
      setC(x ?? null);
      const first = await getPhoto(id);
      if (dead) return;
      if (first) setPhoto(url(first));
      // Photos 2-3 of a multi-photo check.
      const more: string[] = [];
      for (let n = 2; n <= (x?.photo_count ?? 1); n++) {
        const b = await getPhoto(photoKey(id, n));
        if (dead) return;
        if (b) more.push(url(b));
      }
      setMorePhotos(more);
    })().catch(() => !dead && setC((x) => x ?? null)); // storage unreadable: show the empty state instead of a spinner forever
    getProfile()
      .then((p) => {
        if (dead) return;
        setVariety(p.variety);
        setProfile(p);
      })
      .catch(() => {});
    return () => {
      dead = true;
      urls.forEach(URL.revokeObjectURL);
      stopAudio();
    };
  }, [id]);

  const card: RenderedCard | null = useMemo(() => {
    if (!c) return null;
    if (c.advisor) {
      const inp = c.advisor_input;
      const v = varietyById(variety);
      const slots = advisorSlots(c.advisor, {
        variety: v ?? (inp?.variety_type === "sub1" ? { bn: "বন্যা-সহনশীল জাত", en: "flood-tolerant variety" } : { bn: "সাধারণ জাত", en: "regular variety" }),
        days: inp?.days_under_water,
        submergence: inp?.submergence,
        stage: inp?.stage,
        date: c.date_used,
      });
      const p = c.advisor.params;
      return renderCard(c.card, lang, slots, { backup: !!p.prepare_backup, outlook: p.outlook as string, reason: p.reason as string });
    }
    return renderCard(c.card, lang);
  }, [c, lang, variety]);

  if (c === undefined) return <Loader2 className="mx-auto mt-16 size-8 animate-spin text-primary" />;
  if (c === null || !card) return <p className="mt-10 text-center text-muted-foreground">—</p>;

  const tone = TONE[card.tone];
  const ToneIcon = tone.icon;
  const pChosen = c.prediction && c.cross?.cls ? (c.prediction.probs[c.cross.cls] ?? null) : null;
  const sharedIcons = [FlaskConical, Phone, ShieldCheck];

  async function listen() {
    if (playing) {
      stopAudio();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const missing = await playClips(card!.clips);
    setMissingAudio(missing.length > 0);
    setPlaying(false);
  }

  async function share(yes: boolean) {
    setConsentOpen(false);
    stopAudio();
    if (!yes || !c) return;
    const next: CaseRecord = { ...c, consent: true, share: "queued", share_photo: c.kind === "leaf" && sharePhoto, share_voice: !!c.has_voice && shareVoice };
    try {
      await saveCase(next);
    } catch {
      toast.error(t("save_failed")); // storage full: nothing was queued, so don't pretend it was
      return;
    }
    setC(next);
    if (navigator.onLine) {
      setSyncing(true);
      await syncQueued();
      setC((await getCase(next.id).catch(() => undefined)) ?? next);
      setSyncing(false);
    }
  }

  // Cases saved before multi-select stored a single string: treat anything that is not a list as empty.
  const pests = (Array.isArray(c.answers?.insects) ? c.answers.insects : []).filter((i): i is Insect => SAAO_PESTS.includes(i as Insect));
  const ruleSources = c.advisor?.sources.map((s) => RULES.sources[s]).filter(Boolean) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {c.model_dummy && (
        <div className="flex items-center gap-2 rounded-xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">
          <FlaskConical className="size-4" /> {t("dummy_model")}
        </div>
      )}

      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex items-center gap-3 rounded-3xl border-2 p-4", tone.box)}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <span className="flex shrink-0 flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="size-20 rounded-2xl object-cover ring-2 ring-white" />
            {morePhotos.length > 0 && (
              <span className="flex gap-1">
                {morePhotos.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="size-9 rounded-lg object-cover ring-1 ring-white" />
                ))}
              </span>
            )}
          </span>
        ) : (
          <ToneIcon className="size-12 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-tight">{card.title}</h2>
          <p className="mt-1 text-[17px] font-semibold leading-snug" data-testid="result-see">{card.parts[0]}</p>
          {c.simulated_date && (
            <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
              {formatDate(c.date_used, lang)} · {t("simulated")}
            </span>
          )}
        </div>
      </m.section>

      {/* "unclear" would only repeat the not-sure box above */}
      {c.field && c.field.summary.spread !== "unclear" && <FieldSummaryCard f={c.field.summary} />}

      <BigButton variant={playing || (card.tone === "unsure" && c.share === "local") ? "outline" : "primary"} onClick={listen}>
        {playing ? <Square className="size-5" /> : <Volume2 className="size-6" />}
        {playing ? t("stop") : t("listen")}
      </BigButton>
      {missingAudio && <p className="-mt-2 text-center text-xs text-muted-foreground">{t("audio_missing")}</p>}

      {c.kind === "leaf" && c.cross?.decision !== "location_guard" && c.cross?.cls && <Confidence p={pChosen} t={t} />}

      <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-xs">
        <Part icon={CircleHelp} label={t("part_why")}>
          {card.parts[1]}
        </Part>
        <Part icon={CheckCircle2} label={t("part_do")} tone="bg-ok-soft text-ok">
          {card.parts[2]}
          {card.extraLine && <span className="mt-1 block font-semibold">{card.extraLine}</span>}
        </Part>
        <Part icon={Ban} label={t("part_dont")} tone="bg-bad-soft text-bad">
          {card.parts[3]}
        </Part>
      </section>

      {c.card === "C1" && (
        <Link href="/calendar/" className="flex items-center gap-3 rounded-3xl bg-secondary/70 px-4 py-3 font-semibold text-secondary-foreground">
          <CalendarDays className="size-6 shrink-0 text-primary" />
          <span className="flex-1">{t("cal_from_healthy")}</span>
        </Link>
      )}

      {c.kind === "leaf" && c.conditions && (
        <LeafExplanation c={c} profile={profile} />
      )}

      {c.cross && c.cross.ask.some((q) => !alreadyAnswered(q, c.conditions ?? [])) && (
        <section className="rounded-3xl border-2 border-dashed border-unsure/40 bg-unsure-soft/50 p-4">
          <h3 className="mb-2 font-semibold text-unsure">{t("check_more")}</h3>
          <ul className="flex flex-col gap-2">
            {c.cross.ask.filter((q) => !alreadyAnswered(q, c.conditions ?? [])).map((q) => (
              <li key={q} className="flex gap-2 text-[16px]">
                <span aria-hidden>•</span>
                {tx(KNOWLEDGE.questions[q])}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.answers?.mould === "black" && (
        <section className="rounded-3xl border-2 border-warn/40 bg-warn-soft/60 p-4">
          <h3 className="mb-1 font-semibold text-warn">⚫ {t("mould_note_title")}</h3>
          <p className="text-[15px]">{t("mould_note")}</p>
        </section>
      )}

      {pests.length > 0 && (
        <section className="rounded-3xl border-2 border-warn/40 bg-warn-soft/60 p-4">
          <h3 className="mb-1 font-semibold text-warn">🐛 {t("pest_note_title")}</h3>
          <p className="mb-2 text-[15px]">{t("pest_note")}</p>
          <div className="flex flex-wrap gap-1.5">
            {pests.map((i) => (
              <span key={i} className="rounded-full bg-card px-3 py-1 text-sm font-medium">
                {t(`ins_${i}`)}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-3xl bg-muted/60 p-4 text-[15px]">
        {card.shared.map((s, i) => {
          const Icon = sharedIcons[i] ?? ShieldCheck;
          return (
            <div key={i} className="flex gap-3">
              <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" />
              <p className={i === 2 ? "text-sm text-muted-foreground" : ""}>
                {s}
                {i === 1 && (
                  <a href="tel:16123" className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
                    <Phone className="size-3.5" /> ১৬১২৩
                  </a>
                )}
              </p>
            </div>
          );
        })}
      </section>

      {/* The farmer's own words for the SAAO (recorded only, never transcribed). */}
      <VoiceNote
        caseId={c.id}
        readOnly={c.share !== "local"}
        onChange={async (has) => {
          const next = { ...c, has_voice: has };
          setC(next);
          await saveCase(next).catch(() => toast.error(t("save_failed")));
        }}
      />

      {/* Hand-off to the SAAO: consent first, then the offline queue. */}
      {c.share === "local" ? (
        <BigButton variant={card.tone === "unsure" ? "primary" : "outline"} onClick={() => setConsentOpen(true)}>
          <Send className="size-5" /> {t("share_btn")}
        </BigButton>
      ) : (
        <div className={cn("flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold", c.share === "synced" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>
          {syncing ? <Loader2 className="size-5 animate-spin" /> : c.share === "synced" ? <CheckCircle2 className="size-5" /> : <Send className="size-5" />}
          {c.share === "synced" ? t("share_synced") : t("share_queued")}
        </div>
      )}

      <AreaUpdate upazila={c.upazila} />

      <details className="group rounded-3xl border bg-card p-4 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
          {t("why_title")}
          <ChevronDown className="size-5 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mt-3 grid gap-3">
          {c.photo_preds && c.photo_preds.length > 1 && (
            <div>
              <dt className="font-semibold text-muted-foreground">{t("why_photos")}</dt>
              <dd className="flex flex-wrap gap-3">
                {c.photo_preds.map((pp, i) => (
                  <span key={i}>
                    {num(i + 1, lang)}. {tx(LABEL_NAMES[pp.top1]) || pp.top1} {num(Math.round(pp.p1 * 100), lang)}%
                  </span>
                ))}
              </dd>
            </div>
          )}
          {c.prediction && (
            <div>
              <dt className="font-semibold text-muted-foreground">{t("why_model")}</dt>
              <dd>
                {[c.prediction.top1, c.prediction.top2].map((l, i) => (
                  <span key={l} className="mr-3 inline-block">
                    {i + 1}. {tx(LABEL_NAMES[l]) || l} {num(Math.round((i === 0 ? c.prediction!.p1 : c.prediction!.p2) * 100), lang)}%
                  </span>
                ))}
                {c.model_ms !== undefined && <span className="text-muted-foreground">· ⏱ {num(c.model_ms, lang)} ms</span>}
              </dd>
            </div>
          )}
          {c.cross && (
            <div>
              <dt className="font-semibold text-muted-foreground">{t("why_context")}</dt>
              <dd className="flex flex-wrap gap-1.5">
                <code className="rounded bg-muted px-1.5">{c.cross.decision}</code>
                {c.cross.lookalike && (
                  <span className="w-full font-medium">
                    {lang === "bn" ? "দেখতে মিলতে পারে" : "Could also be"}: {labelName(c.cross.lookalike, lang)}
                  </span>
                )}
                {c.cross.reasons.map((r) => (
                  <code key={r} className="rounded bg-muted px-1.5">
                    {r}
                  </code>
                ))}
                {Object.entries(c.cross.support).map(([cls, s]) => (
                  <span key={cls} className="w-full text-xs text-muted-foreground">
                    {labelName(cls, lang)}: +{s.favours.join(", +") || "0"} {s.conflicts.length > 0 && `/ −${s.conflicts.join(", −")}`}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {c.conditions && c.conditions.length > 0 && (
            <div>
              <dt className="font-semibold text-muted-foreground">{t("why_inputs")}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {c.conditions.map((x) => (
                  <code key={x} className="rounded bg-secondary px-1.5 text-secondary-foreground">
                    {x}
                  </code>
                ))}
              </dd>
            </div>
          )}
          {c.advisor_input && (
            <div>
              <dt className="font-semibold text-muted-foreground">{t("why_inputs")}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {Object.entries(c.advisor_input)
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => (
                    <code key={k} className="rounded bg-secondary px-1.5 text-secondary-foreground">
                      {k}={String(v)}
                    </code>
                  ))}
              </dd>
            </div>
          )}
          {c.advisor && (
            <div>
              <dt className="font-semibold text-muted-foreground">{t("why_rule")}</dt>
              <dd>
                <code className="rounded bg-muted px-1.5">{c.advisor.ruleId}</code>
                {c.advisor.outlookRuleId && <code className="ml-1 rounded bg-muted px-1.5">{c.advisor.outlookRuleId}</code>}{" "}
                {c.advisor.output} {c.advisor.status === "NEEDS-CHECK" && <span className="text-warn">· NEEDS-CHECK</span>}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-semibold text-muted-foreground">{t("why_sources")}</dt>
            <dd>
              <ul className="list-disc pl-5">
                {ruleSources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      {s.title}
                    </a>{" "}
                    ({s.year ?? "n.d."})
                  </li>
                ))}
                {card.sources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-muted-foreground">{t("date_used")}</dt>
            <dd>
              {formatDate(c.date_used, lang)} {c.simulated_date && `(${t("simulated")})`}
            </dd>
          </div>
        </dl>
      </details>

      {c.kind === "leaf" && (
        <Link href={`/check/?edit=${c.id}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary/40 bg-card font-semibold text-primary">
          <ChevronLeft className="size-5" /> {t("change_answers")}
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Link href={c.kind === "leaf" ? "/check/" : "/flood/"} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 bg-card font-semibold">
          {c.kind === "leaf" ? <Leaf className="size-5" /> : "🌊"} {t("new_check")}
        </Link>
        <Link href="/" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 bg-card font-semibold">
          <Home className="size-5" /> {t("go_home")}
        </Link>
      </div>

      <AnimatePresence>
        {consentOpen && (
          <m.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => share(false)}
          >
            <m.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="consent-title"
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 id="consent-title" className="text-xl font-bold">
                  {t("share_title")}
                </h3>
                <button onClick={() => playClips(["UI-CONSENT"])} className="rounded-full bg-muted p-2.5" aria-label={t("listen")}>
                  <Volume2 className="size-5" />
                </button>
              </div>
              <p className="mb-4 text-[16px] leading-relaxed">{t("share_body")}</p>
              {c.kind === "leaf" && photo && (
                <label className="mb-4 flex items-center gap-3 rounded-2xl border p-3">
                  <input type="checkbox" className="size-6 accent-[var(--primary)]" checked={sharePhoto} onChange={(e) => setSharePhoto(e.target.checked)} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="size-10 rounded-lg object-cover" />
                  <span className="text-sm">{t("share_photo")}</span>
                </label>
              )}
              {c.has_voice && (
                <label className="mb-4 flex items-center gap-3 rounded-2xl border p-3">
                  <input type="checkbox" className="size-6 accent-[var(--primary)]" checked={shareVoice} onChange={(e) => setShareVoice(e.target.checked)} />
                  <span className="text-2xl" aria-hidden>
                    🎤
                  </span>
                  <span className="text-sm">{t("share_voice")}</span>
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <BigButton variant="outline" onClick={() => share(false)}>
                  {t("share_no")}
                </BigButton>
                <BigButton onClick={() => share(true)}>{t("share_yes")}</BigButton>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResultPage() {
  const { t } = useLang();
  return (
    <AppShell title={t("result_title")} back="/">
      <Suspense fallback={<Loader2 className="mx-auto mt-16 size-8 animate-spin text-primary" />}>
        <ResultView />
      </Suspense>
    </AppShell>
  );
}
