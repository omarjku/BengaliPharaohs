// One-command production deploy: npm run deploy (from frontend/).
// Vercel builds it with the project settings (Root Directory frontend, npm run build, output out),
// so it runs from the repo root. Same URL every time: https://dhansathi-gilt.vercel.app
import { cpSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".vercel")) {
  console.error("Run `vercel link --project dhansathi` in frontend/ once first.");
  process.exit(1);
}
cpSync(".vercel", "../.vercel", { recursive: true });
execSync("vercel deploy --prod --yes", { stdio: "inherit", cwd: ".." });
