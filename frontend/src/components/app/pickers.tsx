"use client";

import { useId, useState } from "react";
import { Speak } from "@/components/app/choice";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { PLACES, upazilaByCode, upazilasOf, type VarietyGroup } from "@/lib/places";
import type { StringKey } from "@/lib/strings";

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23557' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";
const selectCls =
  "min-h-14 w-full appearance-none rounded-2xl border-2 bg-card bg-[length:20px] bg-[right_14px_center] bg-no-repeat px-4 pr-10 text-base font-medium focus:border-primary focus:outline-none disabled:opacity-50";

function Label({ htmlFor, children, clip }: { htmlFor: string; children: React.ReactNode; clip?: string }) {
  return (
    <span className="flex items-center justify-between gap-3 text-lg font-semibold">
      <label htmlFor={htmlFor}>{children}</label>
      {clip && <Speak clip={clip} />}
    </span>
  );
}

/**
 * Two short lists instead of one list of 494: district (64), then that district's upazilas (~8).
 * Calls onChange with the upazila code. Old placeholder codes resolve through PLACES.aliases.
 */
export function UpazilaPicker({ value, onChange, highlight }: { value?: string; onChange: (code: string | undefined) => void; highlight?: boolean }) {
  const { t, lang } = useLang();
  const idD = useId();
  const idU = useId();
  const current = upazilaByCode(value);
  const [district, setDistrict] = useState<string | undefined>(current?.district);
  const shownDistrict = district ?? current?.district;
  const list = upazilasOf(shownDistrict);
  const name = (u: { name_en?: string; name_bn?: string; en: string; bn: string }) =>
    lang === "bn" ? (u.name_bn ?? u.bn.split(",")[0]) : (u.name_en ?? u.en.split(",")[0]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={idD} clip="Q-UPAZILA">
          {t("profile_district")}
        </Label>
        <select
          id={idD}
          className={cn(selectCls, highlight && !shownDistrict && "border-warn/60 bg-warn-soft")}
          style={{ backgroundImage: chevron }}
          value={shownDistrict ?? ""}
          onChange={(e) => {
            setDistrict(e.target.value || undefined);
            onChange(undefined); // a new district needs a new upazila
          }}
        >
          <option value="">—</option>
          {PLACES.districts.map((d) => (
            <option key={d.code} value={d.code}>
              {lang === "bn" ? d.bn : d.en}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={idU}>{t("profile_upazila")}</Label>
        <select
          id={idU}
          className={cn(selectCls, highlight && shownDistrict && !current && "border-warn/60 bg-warn-soft")}
          style={{ backgroundImage: chevron }}
          value={current?.code ?? ""}
          disabled={!shownDistrict}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">{shownDistrict ? "—" : t("district_first")}</option>
          {list.map((u) => (
            <option key={u.code} value={u.code}>
              {name(u)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const GROUPS: VarietyGroup[] = ["unknown", "flood", "brri", "bina", "hybrid", "local", "other"];

/** All varieties, grouped so the long BRRI list doesn't hide "don't know" or the flood-tolerant ones. */
export function VarietyPicker({ value, onChange, hint }: { value?: string; onChange: (id: string | undefined) => void; hint?: string }) {
  const { t, tx } = useLang();
  const id = useId();
  const real = PLACES.variety_aliases?.[value ?? ""] ?? value;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} clip="Q-VARIETY">
        {t("profile_variety")}
      </Label>
      {hint && <span className="-mt-1 text-sm text-muted-foreground">{hint}</span>}
      <select id={id} className={selectCls} style={{ backgroundImage: chevron }} value={real ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">—</option>
        {GROUPS.map((g) => {
          const items = PLACES.varieties.filter((v) => (v.group ?? "brri") === g);
          if (!items.length) return null;
          return (
            <optgroup key={g} label={t(`vg_${g}` as StringKey)}>
              {items.map((v) => (
                <option key={v.id} value={v.id}>
                  {tx(v)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}
