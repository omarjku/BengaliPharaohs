// Every code the model or the cross-check can output must have a name people know, and every model label a card.
import { describe, expect, it } from "vitest";
import labels from "../../public/model/labels.json";
import knowledge from "../../public/data/knowledge.json";
import { CLASS_CARD } from "./engine/crosscheck";
import { LABEL_NAMES, labelName } from "./labels";

describe("model labels are linked to names and cards", () => {
  it.each(labels as string[])("model label %s has a Bangla + English name and a card", (l) => {
    expect(LABEL_NAMES[l]?.bn, `add "${l}" to src/lib/labels.ts`).toBeTruthy();
    expect(LABEL_NAMES[l]?.en).toBeTruthy();
    expect(CLASS_CARD[l], `add "${l}" to CLASS_CARD in crosscheck.ts`).toMatch(/^C\d$/);
  });
  it("every knowledge-base class and look-alike has a name", () => {
    const codes = [...Object.keys(knowledge.classes), ...Object.keys(knowledge.lookalikes)];
    for (const c of codes) expect(LABEL_NAMES[c], `add "${c}" to src/lib/labels.ts`).toBeTruthy();
  });
  it("unknown codes fall back to the code", () => {
    expect(labelName("new_disease", "bn")).toBe("new_disease");
  });
});
