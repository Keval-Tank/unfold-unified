import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The OpenNext adapter's config. Defaults are fine for us: no ISR cache to wire
// up (couple pages are force-dynamic and read their JSON from R2 per request),
// and no queue/tag cache.
export default defineCloudflareConfig();
