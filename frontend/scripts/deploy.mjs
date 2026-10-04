// One-command production deploy of the static build: npm run deploy
// Uploads out/ as plain static files (no build on Vercel); the URL https://dhansathi-gilt.vercel.app stays the same.
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".vercel")) {
  console.error("Run `vercel link --project dhansathi` in frontend/ once first.");
  process.exit(1);
}
cpSync(".vercel", "out/.vercel", { recursive: true });
const config = JSON.parse(readFileSync("out/vercel.json", "utf8"));
Object.assign(config, { framework: null, buildCommand: "", installCommand: "", outputDirectory: "." });
writeFileSync("out/vercel.json", JSON.stringify(config, null, 2));
execSync("vercel deploy out --prod --yes", { stdio: "inherit" });
