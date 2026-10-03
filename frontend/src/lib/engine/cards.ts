// Card bank: id → fixed text (public/data/cards.json) + slot values + audio playlist. Only slots are filled, never free text.
import cardsJson from "../../../public/data/cards.json";
import { formatDate, num, type Lang, type Text } from "../i18n";
import { S } from "../strings";
import type { AdvisorResult, CardId } from "./types";

type Card = {
  kind: "photo" | "rule";
  tone: "ok" | "warn" | "bad" | "unsure";
  clip: string;
  title: Text;
  parts: Text[];
  shared: string[];
  sources?: string[];
  extra?: Record<string, Text & { clip?: string }>;
};
type CardBank = { version: string; shared: Record<string, Text>; reasons: Record<string, Text & { clip: string }>; cards: Record<string, Card> };
export const CARDS = cardsJson as unknown as CardBank;

export const ADVISOR_CARD: Record<string, CardId> = {
  SURVIVES_CHECK: "A1",
  GAP_FILL: "A2",
  REPLANT_SHORT_DURATION: "A3",
  DIRECT_SEED: "A4",
  TOO_LATE_AMAN: "A5",
  NOT_SURE_ASK_SAAO: "A6",
};

export function advisorCard(r: AdvisorResult): CardId {
  if (r.output === "NOT_SURE_ASK_SAAO" && r.params.reason === "drought") return "A7";
  return ADVISOR_CARD[r.output];
}

export type Slots = Partial<Record<"variety" | "submergence" | "days" | "stage" | "date" | "deadline" | "outlook" | "reason", Text>>;

const fill = (s: string, slots: Slots, lang: Lang) => s.replace(/\{(\w+)\}/g, (_, k: keyof Slots) => slots[k]?.[lang] ?? "…");

export type RenderedCard = {
  id: CardId;
  tone: Card["tone"];
  title: string;
  parts: string[];
  extraLine?: string;
  shared: string[];
  clips: string[];
  sources: string[];
};

const both = (f: (l: Lang) => string): Text => ({ bn: f("bn"), en: f("en") });

/** Slot values for an advisor result. Dates are shown on screen only; audio uses generic clips. */
export function advisorSlots(r: AdvisorResult, input: { variety?: Text; days?: number; submergence?: string; stage?: string; date: string }): Slots {
  const p = r.params as Record<string, string | boolean>;
  const deadlineMd = (p.deadline_md ?? p.cutoff_md) as string | undefined;
  const reason = p.reason ? CARDS.reasons[p.reason as string] : undefined;
  return {
    variety: input.variety,
    days: input.days !== undefined ? both((l) => num(input.days!, l)) : undefined,
    submergence: input.submergence ? (input.submergence === "full" ? { bn: "পুরো", en: "fully" } : { bn: "আংশিক", en: "partly" }) : undefined,
    stage: input.stage ? (S[`stage_${input.stage}` as keyof typeof S] as Text) : undefined,
    date: both((l) => formatDate(input.date, l)),
    deadline: deadlineMd ? both((l) => formatDate(deadlineMd, l)) : undefined,
    outlook: p.outlook ? CARDS.cards.A1.extra?.[p.outlook as string] : undefined,
    reason: reason ? { bn: reason.bn, en: reason.en } : undefined,
  };
}

export function renderCard(id: CardId, lang: Lang, slots: Slots = {}, opts: { backup?: boolean; outlook?: string; reason?: string } = {}): RenderedCard {
  const c = CARDS.cards[id];
  const clips = [c.clip];
  if (id === "A1" && opts.outlook === "not_sure") clips[0] = c.extra!.not_sure.clip!;
  let extraLine: string | undefined;
  if (id === "A1" && opts.backup) {
    extraLine = c.extra!.backup[lang];
    clips.push(c.extra!.backup.clip!);
  }
  if (id === "A6" && opts.reason && CARDS.reasons[opts.reason]) clips.push(CARDS.reasons[opts.reason].clip);
  clips.push(...c.shared);
  return {
    id,
    tone: c.tone,
    title: c.title[lang],
    parts: c.parts.map((p) => fill(p[lang], slots, lang)),
    extraLine,
    shared: c.shared.map((s) => CARDS.shared[s][lang]),
    clips,
    sources: c.sources ?? [],
  };
}
