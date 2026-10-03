"use client";

import { Mic, RotateCcw, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Speak } from "@/components/app/choice";
import { cn } from "@/lib/utils";
import { num, useLang } from "@/lib/i18n";
import { deleteVoice, getVoice, saveVoice } from "@/lib/store/db";

const MAX_SECONDS = 30;

/** Best format this browser can record: Opus in WebM on Android Chrome, MP4/AAC on iPhone. */
function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m));
}

/**
 * The farmer records up to 30 s in their own words for the SAAO. Nothing is transcribed (offline Bangla speech
 * recognition doesn't fit a cheap phone); a person listens. Works offline; stays on the phone unless shared.
 */
export function VoiceNote({ caseId, readOnly, onChange }: { caseId: string; readOnly?: boolean; onChange: (has: boolean) => void }) {
  const { t, lang } = useLang();
  const [url, setUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [left, setLeft] = useState(MAX_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let u: string | null = null;
    getVoice(caseId).then((b) => b && setUrl((u = URL.createObjectURL(b))));
    return () => {
      if (u) URL.revokeObjectURL(u);
      if (timer.current) clearInterval(timer.current);
      rec.current?.state === "recording" && rec.current.stop();
    };
  }, [caseId]);

  async function start() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return setError(t("voice_no_mic"));
    }
    const mimeType = pickMime();
    const r = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 24_000 });
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      if (timer.current) clearInterval(timer.current);
      setRecording(false);
      const blob = new Blob(chunks, { type: r.mimeType || mimeType || "audio/webm" });
      if (!blob.size) return;
      await saveVoice(caseId, blob);
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      onChange(true);
    };
    rec.current = r;
    r.start();
    setRecording(true);
    setLeft(MAX_SECONDS);
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const rest = MAX_SECONDS - Math.floor((Date.now() - t0) / 1000);
      setLeft(rest);
      if (rest <= 0) r.state === "recording" && r.stop();
    }, 250);
  }

  async function remove() {
    await deleteVoice(caseId);
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    onChange(false);
  }

  if (readOnly && !url) return null;

  return (
    <section className="rounded-3xl border bg-card p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Mic className="size-5 text-primary" /> {t("voice_title")}
        </h3>
        {!readOnly && <Speak clip="Q-VOICE" />}
      </div>
      {!readOnly && <p className="mb-3 text-sm text-muted-foreground">{t("voice_hint")}</p>}

      {url && !recording && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ok">✓ {t("voice_saved")}</p>
          <audio controls src={url} className="w-full" />
        </div>
      )}

      {!readOnly && (
        <div className="mt-3 flex gap-2">
          {recording ? (
            <button
              onClick={() => rec.current?.stop()}
              className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-bad px-4 text-lg font-semibold text-white"
            >
              <Square className="size-5" /> {t("voice_stop")} · {num(Math.max(0, left), lang)}
              <span className="size-2.5 animate-pulse rounded-full bg-white" aria-hidden />
            </button>
          ) : (
            <button
              onClick={start}
              className={cn(
                "flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-lg font-semibold",
                url ? "border-2 border-primary/30 text-primary" : "bg-primary text-primary-foreground",
              )}
            >
              {url ? <RotateCcw className="size-5" /> : <Mic className="size-6" />}
              {url ? t("voice_again") : t("voice_record")}
            </button>
          )}
          {url && !recording && (
            <button onClick={remove} aria-label={t("voice_delete")} className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Trash2 className="size-5" />
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
    </section>
  );
}
