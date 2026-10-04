"use client";

import { CircleHelp, Loader2, MessageSquareText, RefreshCw, ServerCrash } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/shell";
import { fetchCaseBlob, listServerCases, postReply, type ServerCase } from "@/lib/api";
import { CARDS } from "@/lib/engine/cards";
import { cn } from "@/lib/utils";
import { formatDate, num, useLang } from "@/lib/i18n";
import { labelName } from "@/lib/labels";
import { upazilaByCode } from "@/lib/places";

// Shown only when the backend is unreachable, and always labelled "seeded" (DEMO.md: say what is real).
const SEEDED: ServerCase[] = [
  { case_id: "seed-1", created_at: "2026-10-03T08:10:00+06:00", received_at: "2026-10-03T09:02:00+06:00", upazila: "SRJ-KAZIPUR", class: "brown_spot", confidence: 0.81, taps: { where: "middle", pattern: "patches" }, output_code: "keep", consent: true, card: "C3", kind: "leaf", seeded: true },
  { case_id: "seed-2", created_at: "2026-10-03T07:40:00+06:00", received_at: "2026-10-03T08:55:00+06:00", upazila: "SRJ-SIRAJGANJ", class: "not_sure", confidence: 0.38, taps: { where: "tip_edge" }, output_code: "not_sure", consent: true, card: "C8", kind: "leaf", seeded: true },
  { case_id: "seed-3", created_at: "2026-10-02T17:25:00+06:00", received_at: "2026-10-02T18:00:00+06:00", upazila: "SRJ-CHAUHALI", class: "n/a", confidence: null, taps: { variety_type: "conventional", submergence: "full", days_under_water: 9, stage: "tillering" }, output_code: "TOO_LATE_AMAN", consent: true, card: "A5", kind: "flood", seeded: true },
  { case_id: "seed-4", created_at: "2026-10-02T11:05:00+06:00", received_at: "2026-10-02T11:30:00+06:00", upazila: "SRJ-SIRAJGANJ", class: "n/a", confidence: null, taps: { where: "base", insects: "hoppers_base" }, output_code: "location_guard", consent: true, card: "C9", kind: "leaf", seeded: true },
  { case_id: "seed-5", created_at: "2026-10-01T15:45:00+06:00", received_at: "2026-10-01T19:10:00+06:00", upazila: "BOG-SARIAKANDI", class: "n/a", confidence: null, taps: { variety_type: "sub1", submergence: "full", days_under_water: 8, stage: "early_tillering" }, output_code: "SURVIVES_CHECK", consent: true, card: "A1", kind: "flood", seeded: true },
];

const UNSURE_CARDS = new Set(["C8", "C9", "A6", "A7"]);

/** A stored file of a case as an object URL (the server wants the SAAO code header, so a plain <img src> cannot load it). */
function useBlobUrl(c: ServerCase | undefined, kind: "thumb" | "photo" | "voice") {
  const [url, setUrl] = useState<string | null>(null);
  const id = c?.case_id;
  const has = !c?.seeded && c?.blobs?.[kind];
  useEffect(() => {
    if (!id || !has) return;
    const ac = new AbortController();
    let u: string | null = null;
    fetchCaseBlob(id, kind, ac.signal).then((b) => b && !ac.signal.aborted && setUrl((u = URL.createObjectURL(b))));
    return () => {
      ac.abort();
      if (u) URL.revokeObjectURL(u);
      setUrl(null);
    };
  }, [id, kind, has]);
  return url;
}

function Thumb({ c, unsure }: { c: ServerCase; unsure: boolean }) {
  const blob = useBlobUrl(c, "thumb");
  const src = blob ?? (c.photo_jpeg_b64 ? `data:image/jpeg;base64,${c.photo_jpeg_b64}` : null);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
  ) : (
    <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-xl text-2xl", unsure ? "bg-unsure-soft" : "bg-secondary")}>
      {unsure ? <CircleHelp className="size-7 text-unsure" /> : c.kind === "leaf" ? "🍃" : "🌊"}
    </span>
  );
}

function Voice({ c }: { c: ServerCase }) {
  const { t } = useLang();
  const blob = useBlobUrl(c, "voice");
  const src = blob ?? (c.voice_b64 ? `data:${c.voice_mime ?? "audio/webm"};base64,${c.voice_b64}` : null);
  if (!src) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-2 text-sm">
      <span className="shrink-0 font-medium">🎤 {t("saao_voice")}</span>
      <audio controls src={src} className="h-9 min-w-0 flex-1" />
    </div>
  );
}

function ReplyBox({ c, onSent }: { c: ServerCase; onSent: (r: NonNullable<ServerCase["reply"]>) => void }) {
  const { t } = useLang();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const photo = useBlobUrl(c, "photo");
  async function send() {
    if (busy || !text.trim()) return; // busy guard: a double tap must not send two replies
    setBusy(true);
    try {
      onSent(await postReply(c.case_id, text.trim()));
      setText("");
    } catch {
      toast.warning(t("saao_reply_failed"));
    }
    setBusy(false);
  }
  return (
    <div className="mt-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo && <img src={photo} alt="" className="mb-3 w-full rounded-2xl object-cover" />}
      {c.reply && (
        <p className="mb-2 rounded-2xl bg-ok-soft px-3 py-2 text-sm text-ok">
          <b>{t("saao_replied")}:</b> {c.reply.text}
        </p>
      )}
      {!c.seeded && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t("saao_reply_ph")}
            className="w-full rounded-2xl border bg-card p-3 text-sm"
          />
          <button onClick={send} disabled={busy || !text.trim()} className="mt-2 min-h-12 w-full rounded-2xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="mx-auto size-5 animate-spin" /> : t("saao_reply_send")}
          </button>
        </>
      )}
    </div>
  );
}

function sms(c: ServerCase, lang: "bn" | "en") {
  const title = CARDS.cards[c.card ?? "C8"]?.title[lang] ?? "";
  const id = c.case_id.slice(0, 4).toUpperCase();
  return lang === "bn"
    ? `অ্যাগ্রোনমি #${id}: ${title}। আপনার কৃষি অফিসার কেসটা পেয়েছেন, শিগগির যোগাযোগ করবেন। জরুরি হলে ১৬১২৩।`
    : `Agronomy #${id}: ${title}. Your SAAO received the case and will contact you soon. Urgent: 16123.`;
}

export default function SaaoPage() {
  const { t, tx, lang } = useLang();
  const [cases, setCases] = useState<ServerCase[] | null>(null);
  const [down, setDown] = useState(false);
  const [wrongCode, setWrongCode] = useState(false);
  const [filter, setFilter] = useState<"all" | "unsure">("all");
  const [sel, setSel] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCases(null);
    setWrongCode(false);
    try {
      setCases(await listServerCases());
      setDown(false);
    } catch (e) {
      // A wrong code is not "server down": do not show seeded demo cases as if the server had failed.
      if (e instanceof Error && e.message === "SAAO code required.") {
        setCases([]);
        setDown(false);
        setWrongCode(true);
        return;
      }
      setCases(SEEDED);
      setDown(true);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => (cases ?? []).filter((c) => filter === "all" || UNSURE_CARDS.has(c.card ?? "")), [cases, filter]);
  const selected = shown.find((c) => c.case_id === sel) ?? shown[0];

  return (
    <AppShell title={t("saao_title")} back="/" wide hideNav>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-muted-foreground">{t("saao_sub")}</p>
        {(["all", "unsure"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", filter === f && "border-primary bg-secondary")}
          >
            {t(f === "all" ? "filter_all" : "filter_unsure")}
          </button>
        ))}
        <button onClick={load} className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium">
          <RefreshCw className="size-4" /> {t("refresh")}
        </button>
      </div>

      {down && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          <ServerCrash className="size-5 shrink-0" /> {t("saao_backend_down")}
        </div>
      )}

      {wrongCode && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{t("saao_wrong_code")}</p>}

      {cases === null ? (
        <Loader2 className="mx-auto mt-10 size-7 animate-spin text-primary" />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="flex flex-col gap-2.5">
            {shown.map((c) => {
              const card = CARDS.cards[c.card ?? "C8"];
              const unsure = UNSURE_CARDS.has(c.card ?? "");
              const place = upazilaByCode(c.upazila);
              return (
                <li key={c.case_id}>
                  <button
                    onClick={() => setSel(c.case_id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 bg-card p-3 text-left",
                      selected?.case_id === c.case_id ? "border-primary" : "border-transparent shadow-xs",
                    )}
                  >
                    <Thumb c={c} unsure={unsure} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{tx(card?.title)}</span>
                        {c.kind === "leaf" && c.class && c.class !== "n/a" && (
                          <span className="rounded-full bg-secondary px-2 text-xs font-medium">{labelName(c.class, lang)}</span>
                        )}
                        {c.seeded && <span className="rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{t("seeded")}</span>}
                        {c.simulated_date && <span className="rounded-full bg-muted px-2 text-xs">{t("simulated")}</span>}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {place ? tx(place) : c.upazila} · {t("received")} {formatDate(c.received_at.slice(0, 10), lang)} {c.received_at.slice(11, 16)}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(c.taps)
                          .filter(([k, v]) => v !== undefined && v !== null && k !== "conditions")
                          .slice(0, 5)
                          .map(([k, v]) => (
                            <code key={k} className="rounded bg-muted px-1.5 text-[11px]">
                              {k}={String(v)}
                            </code>
                          ))}
                        {c.confidence !== null && (
                          <code className="rounded bg-muted px-1.5 text-[11px]">p={num(c.confidence.toFixed(2), lang)}</code>
                        )}
                      </span>
                    </span>
                  </button>
                  <Voice c={c} />
                </li>
              );
            })}
          </ul>

          {!shown.length && !wrongCode && <p className="text-muted-foreground">{t("saao_empty")}</p>}

          {selected && (
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <h3 className="mb-2 flex items-center gap-2 font-semibold">
                <MessageSquareText className="size-5" /> {t("sms_title")}
              </h3>
              {/* A keypad phone, drawn: monochrome screen, 160-char limit. */}
              <div className="mx-auto w-64 rounded-[2rem] bg-neutral-800 p-4 pb-6 shadow-lg">
                <div className="rounded-lg bg-[#b7c4a4] p-3 font-mono text-[13px] leading-snug text-neutral-900 shadow-inner">
                  <div className="mb-1 flex justify-between text-[10px] opacity-70">
                    <span>SMS · Agronomy</span>
                    <span>▂▄▆</span>
                  </div>
                  {sms(selected, lang)}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => (
                    <span key={k} className="rounded-md bg-neutral-700 py-1 text-center text-xs text-neutral-300">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-center text-xs font-semibold text-warn">{t("sms_simulated")}</p>
              <ReplyBox
                key={selected.case_id}
                c={selected}
                onSent={(r) => setCases((cs) => cs && cs.map((x) => (x.case_id === selected.case_id ? { ...x, reply: r } : x)))}
              />
            </aside>
          )}
        </div>
      )}
    </AppShell>
  );
}
