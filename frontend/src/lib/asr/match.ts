// Turns what the farmer SAID (offline Bangla speech-to-text transcript) into one of the CURRENT question's
// fixed answers. Closed vocabulary only: nothing outside the question's options can come out, and anything
// unclear returns "not_sure" so the UI shows big tap buttons instead (pass/fail safety rule).
// Pure functions, no browser APIs (tested in match.test.ts).
import { S, type StringKey } from "../strings";
import { QUESTION_CLIPS, type QuestionClipId } from "../voice-questions";

export type Match =
  | { status: "match"; answer: string; score: number; transcript: string }
  | { status: "not_sure"; candidates: { answer: string; score: number }[]; transcript: string };

/** Accept only a clear winner: score ≥ MIN_SCORE and ahead of the runner-up by ≥ MIN_LEAD. */
export const MIN_SCORE = 0.75;
export const MIN_LEAD = 0.15;

const YES_NO_QUESTIONS = new Set<QuestionClipId>(["Q-FLOODED", "Q-STORM", "Q-COLD", "Q-SALTY", "Q-SEEDLINGS", "Q-VARIETY-TYPE"]);

// Everyday ways of saying the same thing (spoken forms the recogniser produces). Extend from real recordings.
const SYNONYMS: Partial<Record<StringKey | "yes" | "no" | "dont_know", string[]>> = {
  yes: ["হ্যাঁ", "হ্যা", "হ", "হুম", "জি", "জ্বি", "জি হ্যাঁ", "আছে", "হয়েছে", "উঠেছিল", "ছিল"],
  no: ["না", "নাহ", "নাই", "নেই", "হয়নি", "ওঠেনি", "ছিল না"],
  dont_know: ["জানি না", "জানিনা", "বলতে পারি না", "বলতে পারব না", "মনে নেই"],
  season_aman: ["আমন", "আমন ধান", "আমোন"],
  season_aus: ["আউশ", "আউস", "আউশ ধান"],
  season_boro: ["বোরো", "বোরো ধান", "বরো"],
  rain_none: ["হয়নি", "বৃষ্টি হয়নি", "না", "একদম না"],
  rain_some: ["কিছু", "একটু", "অল্প", "কিছু বৃষ্টি"],
  rain_heavy: ["অনেক", "খুব", "অনেক বৃষ্টি", "ভারী বৃষ্টি"],
  urea_none: ["দিইনি", "দেইনি", "দেই নাই", "না"],
  urea_normal: ["স্বাভাবিক", "নিয়মমতো", "অল্প"],
  urea_a_lot: ["অনেক", "বেশি", "অনেক বেশি"],
  event_flood: ["বন্যা", "বান", "পানি"],
  event_drought: ["খরা", "শুকনা", "বৃষ্টি নেই"],
  sub_full: ["পুরো", "পুরো ডুবে", "পুরো গাছ", "সব ডুবে"],
  sub_partial: ["অর্ধেক", "আংশিক", "কিছুটা", "আধা"],
  hills_most: ["বেশিরভাগ", "বেশির ভাগ", "প্রায় সব"],
  hills_about_half: ["অর্ধেক", "আধা", "অর্ধেকের মতো"],
  hills_few: ["অল্প", "কয়েকটা", "খুব কম"],
  first_old: ["পুরনো", "নিচের", "পুরনো পাতা", "নিচের পাতা"],
  first_new: ["নতুন", "উপরের", "নতুন পাতা", "উপরের পাতা"],
};

// ০–৬০ as spoken words (+ weeks), for "how many days under water?"
const NUMBER_WORDS: [string, number][] = [
  ["শূন্য", 0], ["এক", 1], ["দুই", 2], ["তিন", 3], ["চার", 4], ["পাঁচ", 5], ["ছয়", 6], ["সাত", 7], ["আট", 8], ["নয়", 9],
  ["দশ", 10], ["এগারো", 11], ["বারো", 12], ["তেরো", 13], ["চোদ্দ", 14], ["চৌদ্দ", 14], ["পনেরো", 15], ["ষোলো", 16],
  ["সতেরো", 17], ["আঠারো", 18], ["উনিশ", 19], ["বিশ", 20], ["কুড়ি", 20], ["একুশ", 21], ["বাইশ", 22], ["তেইশ", 23],
  ["চব্বিশ", 24], ["পঁচিশ", 25], ["ছাব্বিশ", 26], ["সাতাশ", 27], ["আঠাশ", 28], ["উনত্রিশ", 29], ["ত্রিশ", 30],
  ["একত্রিশ", 31], ["বত্রিশ", 32], ["তেত্রিশ", 33], ["চৌত্রিশ", 34], ["পঁয়ত্রিশ", 35], ["ছত্রিশ", 36], ["সাঁইত্রিশ", 37],
  ["আটত্রিশ", 38], ["উনচল্লিশ", 39], ["চল্লিশ", 40], ["একচল্লিশ", 41], ["বিয়াল্লিশ", 42], ["তেতাল্লিশ", 43],
  ["চুয়াল্লিশ", 44], ["পঁয়তাল্লিশ", 45], ["ছেচল্লিশ", 46], ["সাতচল্লিশ", 47], ["আটচল্লিশ", 48], ["উনপঞ্চাশ", 49],
  ["পঞ্চাশ", 50], ["একান্ন", 51], ["বাহান্ন", 52], ["তিপ্পান্ন", 53], ["চুয়ান্ন", 54], ["পঞ্চান্ন", 55], ["ছাপ্পান্ন", 56],
  ["সাতান্ন", 57], ["আটান্ন", 58], ["উনষাট", 59], ["ষাট", 60],
];
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Fold spelling/recogniser variants together: punctuation, spaces, chandrabindu, long/short vowels, ড়/র, ণ/ন, শ/ষ/স. */
export function normalise(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[।?!,.;:"'“”‘’()\-–—]/g, " ")
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/ঁ/g, "")
    .replace(/ী/g, "ি")
    .replace(/ূ/g, "ু")
    .replace(/য়/g, "য")
    .replace(/[ড়ঢ়]/g, "র")
    .replace(/ণ/g, "ন")
    .replace(/[শষ]/g, "স")
    .replace(/\s+/g, "");
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

/** 0–1 similarity between what was said and one answer phrase. Containment counts as a strong match. */
export function similarity(said: string, phrase: string): number {
  const a = normalise(said);
  const b = normalise(phrase);
  if (!a || !b) return 0;
  if (a === b) return 1;
  // Phrase found inside what was said ("হ্যাঁ, উঠেছিল" ⊃ "উঠেছিল"): score by how much of the speech it covers,
  // so "জানি না" beats the bare "না" it contains.
  if (b.length >= 2 && a.includes(b)) return 0.7 + 0.3 * (b.length / a.length);
  if (a.length >= 3 && b.includes(a)) return 0.85; // "পুরনো" said for "নিচের পুরনো পাতা"
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/** Days 0–60 from digits ("১৫", "15") or words ("পনেরো দিন", "দুই সপ্তাহ"); null if none found. */
export function parseDays(transcript: string): number | null {
  const t = transcript.normalize("NFC").replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  const digits = t.match(/\d{1,2}/);
  if (digits) return Math.min(60, Number(digits[0]));
  const words = t.split(/[\s,।]+/).map(normalise).filter(Boolean);
  const weeks = words.some((w) => w.startsWith(normalise("সপ্তাহ")));
  for (const w of words) {
    // longest matching number word wins ("একুশ" before "এক")
    const hit = [...NUMBER_WORDS].sort((x, y) => y[0].length - x[0].length).find(([nw]) => w === normalise(nw));
    if (hit) return Math.min(60, weeks ? hit[1] * 7 : hit[1]);
  }
  return null;
}

/** The fixed answer ids a question accepts by voice, with the phrases each can be recognised from. */
export function answerPhrases(question: QuestionClipId): Record<string, string[]> {
  const ids: string[] = YES_NO_QUESTIONS.has(question) ? ["yes", "no"] : [...((QUESTION_CLIPS[question] as { opts?: StringKey[] }).opts ?? [])];
  ids.push("dont_know");
  const out: Record<string, string[]> = {};
  for (const id of ids) {
    const base = id in S ? [S[id as StringKey].bn] : [];
    out[id] = [...base, ...(SYNONYMS[id as keyof typeof SYNONYMS] ?? [])];
  }
  return out;
}

/** Map a transcript to one of the question's answers, or "not_sure" with the closest candidates (for tap buttons). */
export function matchAnswer(question: QuestionClipId, transcript: string): Match {
  if (question === "Q-DAYS") {
    const days = parseDays(transcript);
    if (days !== null) return { status: "match", answer: String(days), score: 1, transcript };
  }
  const scored = Object.entries(answerPhrases(question))
    .map(([answer, phrases]) => ({ answer, score: Math.max(0, ...phrases.map((p) => similarity(transcript, p))) }))
    .sort((x, y) => y.score - x.score);
  const [best, second] = scored;
  if (best && best.score >= MIN_SCORE && best.score - (second?.score ?? 0) >= MIN_LEAD) {
    return { status: "match", answer: best.answer, score: Number(best.score.toFixed(3)), transcript };
  }
  return { status: "not_sure", candidates: scored.slice(0, 3), transcript };
}
