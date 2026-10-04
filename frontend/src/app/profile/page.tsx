"use client";

import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BigButton, Choice } from "@/components/app/choice";
import { AppShell } from "@/components/app/shell";
import { seasonFromDate, stageFromTransplant } from "@/lib/engine/context";
import type { Season } from "@/lib/engine/types";
import { useLang } from "@/lib/i18n";
import { UpazilaPicker, VarietyPicker } from "@/components/app/pickers";
import { useEffectiveDate } from "@/lib/settings";
import { getProfile, saveProfile, type Profile } from "@/lib/store/db";

const selectCls =
  "min-h-14 w-full appearance-none rounded-2xl border-2 bg-card bg-[length:20px] bg-[right_14px_center] bg-no-repeat px-4 pr-10 text-base font-medium focus:border-primary focus:outline-none";
const chevron = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23557' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };

export default function ProfilePage() {
  const { t, tx } = useLang();
  const router = useRouter();
  const { date } = useEffectiveDate();
  const [p, setP] = useState<Profile>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getProfile().then((x) => {
      setP(x);
      setLoaded(true);
    }).catch(() => setLoaded(true)); // unreadable storage: show the empty form
  }, []);

  const season = p.season ?? seasonFromDate(date);
  const stage = stageFromTransplant(p.transplant_date, date);

  async function save() {
    try {
      await saveProfile({ ...p, season });
    } catch {
      return toast.error(t("save_failed")); // storage full: stay on the form, keep what was typed
    }
    router.push("/");
  }

  return (
    <AppShell title={t("profile_title")} back="/">
      <p className="mb-5 flex items-start gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" />
        {t("profile_sub")}
      </p>
      {loaded && (
        <div className="flex flex-col gap-6">
          <UpazilaPicker value={p.upazila} onChange={(v) => setP({ ...p, upazila: v })} />
          <VarietyPicker value={p.variety} onChange={(v) => setP({ ...p, variety: v })} />

          <Choice<Season>
            clip="Q-SEASON"
            question={t("profile_season")}
            noUnknown
            cols={3}
            value={season}
            onChange={(v) => setP({ ...p, season: v as Season })}
            options={(["aman", "aus", "boro"] as const).map((s) => ({ value: s, label: t(`season_${s}`) }))}
          />

          <label className="flex flex-col gap-2">
            <span className="text-lg font-semibold">{t("profile_transplant")}</span>
            <span className="-mt-1 text-sm text-muted-foreground">{t("profile_transplant_hint")}</span>
            <input
              type="date"
              className={selectCls}
              value={p.transplant_date ?? ""}
              onChange={(e) => setP({ ...p, transplant_date: e.target.value || undefined })}
            />
            {stage && (
              <span className="text-sm font-medium text-primary">
                → {t("stage")}: {t(`stage_${stage}`)}
              </span>
            )}
          </label>

          <BigButton onClick={save}>{t("save")}</BigButton>
        </div>
      )}
    </AppShell>
  );
}
