// The banner after a connection window, in plain words: "Synced in 6 s: sent 2 cases, got today's weather, flood level and 1 SAAO reply".
import { num, type Lang } from "./i18n";
import { S, type StringKey } from "./strings";
import type { SyncReport } from "./sync/types";

const fill = (k: StringKey, lang: Lang, v: Record<string, string>) => S[k][lang].replace(/\{(\w+)\}/g, (_, n) => v[n] ?? "");

export function burstMessage(r: SyncReport, lang: Lang): string {
  const n = (x: number) => num(x, lang);
  const sent: string[] = [];
  if (r.sent.facts) sent.push(fill(r.sent.facts === 1 ? "burst_sent_case_1" : "burst_sent_cases", lang, { n: n(r.sent.facts) }));
  const files = r.sent.photos + r.sent.voice;
  if (files) sent.push(fill("burst_sent_files", lang, { n: n(files) }));
  const got: string[] = [];
  if (r.received.includes("forecast")) got.push(S.burst_got_weather[lang]);
  if (r.received.includes("flood")) got.push(S.burst_got_flood[lang]);
  if (r.received.includes("prices")) got.push(S.burst_got_prices[lang]);
  if (r.received.includes("advisories")) got.push(S.burst_got_advisories[lang]);
  if (r.new_replies) got.push(fill(r.new_replies === 1 ? "burst_got_reply_1" : "burst_got_replies", lang, { n: n(r.new_replies) }));
  const list = got.length > 1 ? `${got.slice(0, -1).join(", ")} ${S.burst_and[lang]} ${got[got.length - 1]}` : got[0];
  const secs = Math.max(1, Math.round(r.ms / 1000));
  const parts = [...sent, ...(list ? [fill("burst_got", lang, { list })] : [])];
  return `${fill("burst_head", lang, { s: n(secs) })}${parts.length ? `: ${parts.join(", ")}` : ""}`;
}
