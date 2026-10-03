// Copies the advisor rule JSON (docs/advisor-rules.md §7, the source of truth) into public/data/rules.json.
// Run after editing the markdown: node scripts/extract-rules.mjs
import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync(new URL("../../docs/advisor-rules.md", import.meta.url), "utf8");
const section = md.split("## 7. Machine-readable rules")[1];
const json = section.match(/```json\r?\n([\s\S]*?)```/)[1];
const rules = JSON.parse(json);
writeFileSync(new URL("../public/data/rules.json", import.meta.url), JSON.stringify(rules, null, 2) + "\n");
console.log(`rules.json: ${rules.guards.length} guards, ${rules.survival_table.length} outlook rows, ${rules.rules.length} rules`);
