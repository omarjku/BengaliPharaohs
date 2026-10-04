// "Area news": what the pack holds for the farmer's upazila, and the one function that decides what the screen says.
// loadArea() ALWAYS settles (hard 10 s cap on the network part, 3 s on the phone's own storage), so the UI can never spin forever.
import { getPack, refreshPack, type Pack } from "./pack/pack";
import { drain, getLastSyncReport } from "./sync/drain";

export type AreaView =
  | { kind: "noarea" } // no upazila in the profile
  | { kind: "offline"; pack?: Pack } // no connection / server unreachable: cached data (if any)
  | { kind: "none" } // online, but the server has nothing for this area
  | { kind: "fresh" | "nodata"; pack: Pack }; // just fetched / server says nothing new

const NETWORK_MS = 10_000;
const STORAGE_MS = 3_000;
const RECENT_MS = 20_000; // a burst this recent counts as "just fetched" (the window's own burst may have run just before us)

const within = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise((res) => {
    const t = setTimeout(() => res(fallback), ms);
    p.then((v) => (clearTimeout(t), res(v)), () => (clearTimeout(t), res(fallback)));
  });

/** The sync engine owns pack downloads (one /api/burst per window, counted in the sync report). Opening the area news just asks it for a
 *  pack-only burst, queued behind any burst already running, so nothing is fetched twice. Backends without /api/burst: the per-part calls. */
async function fetchPack(upazila: string, t0: number): Promise<"updated" | "unchanged" | "failed"> {
  const d = await drain({ force: true, wait: true, upazila, budgetMs: NETWORK_MS - 1000 });
  const pack = await getPack(upazila);
  const recent = (iso?: string) => !!iso && Date.parse(iso) >= t0 - RECENT_MS;
  if (d.failed && !recent(pack?.fetched_at)) return "failed";
  if (recent(pack?.fetched_at)) {
    const rep = await getLastSyncReport();
    return rep && recent(rep.started_at) && rep.received.length ? "updated" : "unchanged";
  }
  const r = await refreshPack(upazila); // old backend: no /api/burst
  return r === "updated" ? "updated" : r === "unchanged" ? "unchanged" : "failed";
}

export async function loadArea(upazila: string | undefined, online: boolean): Promise<AreaView> {
  if (!upazila) return { kind: "noarea" };
  const cached = await within(getPack(upazila), STORAGE_MS, undefined);
  if (!online) return { kind: "offline", pack: cached };
  const r = await within(fetchPack(upazila, Date.now()), NETWORK_MS, "failed" as const);
  const pack = (await within(getPack(upazila), STORAGE_MS, undefined)) ?? cached;
  if (r === "failed") return pack ? { kind: "offline", pack } : { kind: "offline" };
  return pack ? { kind: r === "updated" ? "fresh" : "nodata", pack } : { kind: "none" };
}
