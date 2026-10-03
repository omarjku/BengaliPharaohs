// After `next build` (static export to out/): list every file so the service worker can cache the whole app
// on first visit. Writes out/precache-manifest.json with a version hash; a new build = a new cache.
import { createHash } from "node:crypto";
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const out = new URL("../out/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const skip = new Set(["precache-manifest.json", "sw.js", "vercel.json"]);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(out);

// Next 16 export quirk: it writes check/__next.check/__PAGE__.txt but the client prefetches
// check/__next.check.__PAGE__.txt. Write the flat name too, so prefetch works on any static host and offline.
for (const f of [...files]) {
  const rel = relative(out, f).split(sep).join("/");
  const m = rel.match(/^(.*?)(__next\.[^/]+)\/(.+\.txt)$/);
  if (!m) continue;
  const flat = join(out, m[1], `${m[2]}.${m[3].replaceAll("/", ".")}`);
  copyFileSync(f, flat);
  files.push(flat);
}

const hash = createHash("sha256");
const urls = [];
let bytes = 0;
for (const f of files.sort()) {
  const rel = relative(out, f).split(sep).join("/");
  if (skip.has(rel) || rel.endsWith(".map")) continue;
  const buf = readFileSync(f);
  hash.update(rel).update(buf);
  bytes += buf.length;
  urls.push("/" + rel);
  // trailingSlash export: /check/index.html is served at /check/
  if (rel === "index.html") urls.push("/");
  else if (rel.endsWith("/index.html")) urls.push("/" + rel.slice(0, -"index.html".length));
}
const version = hash.digest("hex").slice(0, 12);
writeFileSync(join(out, "precache-manifest.json"), JSON.stringify({ version, urls }, null, 0));
console.log(`precache: ${urls.length} urls, ${(bytes / 1e6).toFixed(1)} MB, version ${version}`);
