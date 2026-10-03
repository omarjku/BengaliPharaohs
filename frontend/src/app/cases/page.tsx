"use client";

import { ChevronRight, CloudUpload, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, useOnline } from "@/components/app/shell";
import { CARDS } from "@/lib/engine/cards";
import { cn } from "@/lib/utils";
import { formatDate, num, useLang } from "@/lib/i18n";
import { deleteAllCases, getPhoto, listCases, type CaseRecord } from "@/lib/store/db";
import { syncQueued } from "@/lib/sync";

const STATUS = {
  local: { key: "status_local", cls: "bg-muted text-muted-foreground" },
  queued: { key: "status_queued", cls: "bg-warn-soft text-warn" },
  failed: { key: "status_failed", cls: "bg-bad-soft text-bad" },
  synced: { key: "status_synced", cls: "bg-ok-soft text-ok" },
} as const;

function Thumb({ id, kind }: { id: string; kind: CaseRecord["kind"] }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    if (kind === "leaf") getPhoto(id).then((b) => b && setUrl((u = URL.createObjectURL(b))));
    return () => void (u && URL.revokeObjectURL(u));
  }, [id, kind]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
  ) : (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">{kind === "drought" ? "☀️" : kind === "flood" ? "🌊" : "🍃"}</span>
  );
}

export default function CasesPage() {
  const { t, tx, lang } = useLang();
  const online = useOnline();
  const [cases, setCases] = useState<CaseRecord[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const reload = useCallback(() => listCases().then(setCases), []);
  useEffect(() => {
    reload();
  }, [reload]);

  const pending = cases?.filter((c) => c.share === "queued" || c.share === "failed").length ?? 0;

  async function sync() {
    setSyncing(true);
    const r = await syncQueued();
    setSyncing(false);
    reload();
    if (r.failed && !r.sent) toast.warning(t("sync_offline"));
    else toast.success(`${num(r.sent, lang)} ${t("sync_result")}`);
  }

  return (
    <AppShell title={t("cases_title")} back="/">
      {pending > 0 && (
        <button
          onClick={sync}
          disabled={syncing || !online}
          className="mb-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-lg font-semibold text-primary-foreground disabled:opacity-50"
        >
          {syncing ? <Loader2 className="size-5 animate-spin" /> : <CloudUpload className="size-6" />}
          {syncing ? t("syncing") : `${t("sync_now")} (${num(pending, lang)})`}
        </button>
      )}
      {pending > 0 && !online && <p className="-mt-2 mb-4 text-center text-sm text-muted-foreground">{t("sync_offline")}</p>}

      {cases === null ? (
        <Loader2 className="mx-auto mt-10 size-7 animate-spin text-primary" />
      ) : cases.length === 0 ? (
        <p className="mt-16 text-center text-lg text-muted-foreground">{t("cases_empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {cases.map((c) => {
            const st = STATUS[c.share];
            return (
              <li key={c.id}>
                <Link href={`/result/?id=${c.id}`} className="flex items-center gap-3 rounded-2xl border bg-card p-2.5 pr-3 active:bg-muted">
                  <Thumb id={c.id} kind={c.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{tx(CARDS.cards[c.card]?.title)}</span>
                    <span className="block text-sm text-muted-foreground">
                      {formatDate(c.created_at.slice(0, 10), lang)}
                      {c.simulated_date && ` · ${t("simulated")}`}
                    </span>
                    <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold", st.cls)}>{t(st.key)}</span>
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!!cases?.length && (
        <button
          onClick={async () => {
            if (confirm(t("delete_confirm"))) {
              await deleteAllCases();
              reload();
            }
          }}
          className="mx-auto mt-8 flex items-center gap-1.5 text-sm text-muted-foreground underline"
        >
          <Trash2 className="size-4" /> {t("delete_all")}
        </button>
      )}
    </AppShell>
  );
}
