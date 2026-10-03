// Service worker: caches the whole app (pages, JS, model, WASM, audio, data) on install so it runs in airplane mode.
// The file list comes from /precache-manifest.json, written at build time by scripts/gen-precache.mjs.
const PREFIX = "dhansathi-";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch("/precache-manifest.json", { cache: "no-store" });
      const { version, urls } = await res.json();
      const cache = await caches.open(PREFIX + version);
      // One by one so a single missing file (e.g. an unrecorded audio clip) doesn't fail the whole install.
      await Promise.all(urls.map((u) => cache.add(new Request(u, { cache: "reload" })).catch(() => console.warn("precache miss", u))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch("/precache-manifest.json", { cache: "no-store" }).catch(() => null);
      const keep = res && res.ok ? PREFIX + (await res.json()).version : null;
      if (keep) for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== keep) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // API calls go straight to the network
  if (url.pathname === "/precache-manifest.json" || url.pathname === "/sw.js") return;

  event.respondWith(
    (async () => {
      // Cache first (ignore ?_rsc= and other query strings), so the app never waits for a slow 2G network.
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate" && !url.pathname.endsWith("/")) {
        const slash = await caches.match(url.pathname + "/", { ignoreSearch: true });
        if (slash) return slash;
      }
      try {
        const res = await fetch(req);
        if (res.ok && (url.pathname.startsWith("/audio/") || url.pathname.startsWith("/_next/"))) {
          const keys = await caches.keys();
          const current = keys.filter((k) => k.startsWith(PREFIX)).pop();
          if (current) (await caches.open(current)).put(req, res.clone());
        }
        return res;
      } catch (e) {
        if (req.mode === "navigate") return (await caches.match("/", { ignoreSearch: true })) || Response.error();
        throw e;
      }
    })(),
  );
});
