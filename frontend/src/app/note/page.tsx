"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BigButton } from "@/components/app/choice";
import { AppShell } from "@/components/app/shell";
import { VoiceNote } from "@/components/app/voice-note";
import { useLang } from "@/lib/i18n";
import { useEffectiveDate } from "@/lib/settings";
import { getProfile, newId, saveCase } from "@/lib/store/db";
import { enqueue, syncQueued } from "@/lib/sync";

/** Ask anything about the farm by voice, any time. Saved offline; sent with the next sync; the answer comes back on Cases. */
export default function NotePage() {
  const { t } = useLang();
  const router = useRouter();
  const { date, simulated } = useEffectiveDate();
  const [id] = useState(newId);
  const [has, setHas] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    const c = {
      id, created_at: new Date().toISOString(), kind: "note" as const, card: "NOTE" as const, date_used: date, simulated_date: simulated,
      upazila: (await getProfile().catch(() => ({ upazila: undefined }))).upazila,
      share: "queued" as const, consent: true, has_voice: true, share_voice: true,
    };
    try {
      await saveCase(c);
      await enqueue(c);
    } catch {
      setBusy(false);
      return toast.error(t("save_failed"));
    }
    toast.success(t("note_saved"));
    if (navigator.onLine) syncQueued(); // not awaited: the answer arrives later on the Cases screen
    router.push("/cases/");
  }

  return (
    <AppShell title={t("note_title")} back="/">
      <p className="mb-4 text-[17px] leading-relaxed">{t("note_intro")}</p>
      <VoiceNote caseId={id} onChange={setHas} title={t("note_title")} hint={t("note_hint")} />
      <p className="mt-3 rounded-2xl bg-unsure-soft px-3 py-2 text-sm text-unsure">{t("note_ai_warning")}</p>
      <div className="mt-4">
        <BigButton onClick={send} disabled={!has || busy}>
          <Send className="size-5" /> {t("note_send")}
        </BigButton>
      </div>
    </AppShell>
  );
}
