import type { NextConfig } from "next";

// Static export: the whole app is plain files, so the service worker can cache all of it for airplane mode,
// and it deploys to any HTTPS static host (Vercel, Netlify, GitHub Pages).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
