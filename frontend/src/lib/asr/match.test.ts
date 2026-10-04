import { describe, expect, it } from "vitest";
import { matchAnswer, normalise, parseDays, similarity } from "./match";

describe("normalise", () => {
  it("folds punctuation, spaces and common spelling variants", () => {
    expect(normalise("রোপণের তারিখ।")).toBe(normalise("রোপনের তারিখ"));
    expect(normalise("বাঁছুন")).toBe(normalise("বাছুন"));
    expect(normalise("পুরো  গাছ")).toBe(normalise("পুরো গাছ"));
  });
});

describe("parseDays", () => {
  it.each([
    ["১৫ দিন", 15],
    ["15", 15],
    ["পনেরো দিন", 15],
    ["প্রায় দশ দিন", 10],
    ["একুশ দিন", 21],
    ["দুই সপ্তাহ", 14],
    ["এক সপ্তাহ", 7],
  ])("%s → %i", (said, days) => expect(parseDays(said)).toBe(days));
  it("returns null when no number is said", () => expect(parseDays("জানি না")).toBeNull());
});

describe("matchAnswer — clear answers", () => {
  it.each([
    ["Q-SEASON", "আমন", "season_aman"],
    ["Q-SEASON", "বোরো ধান", "season_boro"],
    ["Q-FLOODED", "হ্যাঁ উঠেছিল", "yes"],
    ["Q-FLOODED", "না", "no"],
    ["Q-STORM", "জানি না", "dont_know"],
    ["Q-RAIN", "অনেক বৃষ্টি হয়েছে", "rain_heavy"],
    ["Q-SUBMERGENCE", "পুরো গাছ ডুবে ছিল", "sub_full"],
    ["Q-FIRST", "নিচের পুরনো পাতা", "first_old"],
    ["Q-DAYS", "বারো দিন", "12"],
  ] as const)("%s: %s → %s", (q, said, answer) => {
    const m = matchAnswer(q, said);
    expect(m.status).toBe("match");
    if (m.status === "match") expect(m.answer).toBe(answer);
  });
});

describe("matchAnswer — safety: unclear speech is never forced into an answer", () => {
  it("gibberish → not_sure with candidates for tap buttons", () => {
    const m = matchAnswer("Q-SEASON", "কালকে বাজারে গিয়েছিলাম");
    expect(m.status).toBe("not_sure");
    if (m.status === "not_sure") expect(m.candidates.length).toBeGreaterThan(0);
  });
  it("empty transcript → not_sure", () => expect(matchAnswer("Q-FLOODED", "").status).toBe("not_sure"));
  it("answers only come from the question's own options", () => {
    const m = matchAnswer("Q-SEASON", "হ্যাঁ");
    if (m.status === "match") expect(["season_aman", "season_aus", "season_boro", "dont_know"]).toContain(m.answer);
  });
  it("similarity is 1 for identical phrases and low for unrelated ones", () => {
    expect(similarity("আমন", "আমন")).toBe(1);
    expect(similarity("বোরো", "আমন")).toBeLessThan(0.5);
  });
});
