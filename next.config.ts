import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// NOTE: deliberately NO `output: "export"`.
//
// A page is built from a JSON at REQUEST time, not at build time — so it needs a
// server. That also means no `basePath`/`assetPrefix` baked in at compile time:
// one build serves every template and every couple, which is what kills the
// ~30 MB-per-couple fork.
const nextConfig: NextConfig = {
  images: {
    // Couples' photos are arbitrary uploads streamed out of R2; there is no image
    // optimizer in the Worker runtime.
    unoptimized: true,
  },
  turbopack: { root: __dirname },
};

// Gives `next dev` the same Cloudflare bindings the deployed Worker has — R2
// included — via Wrangler's local simulator (Miniflare), persisted under
// .wrangler/state. So `getCloudflareContext().env.BUCKET` is the SAME call in
// development and in production; only what's behind it changes.
initOpenNextCloudflareForDev();

export default nextConfig;
