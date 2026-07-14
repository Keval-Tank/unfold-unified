import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { getPlatformProxy } from "wrangler";

// ═══════════════════════════════════════════════════════════════════════════
//  Seed the LOCAL R2 bucket (Miniflare) from the files in the repo.
// ═══════════════════════════════════════════════════════════════════════════
//  `getPlatformProxy()` opens the very same local bucket that `next dev` sees —
//  Wrangler persists it under .wrangler/state — so anything written here is what
//  the running app reads. Run it once after cloning, or whenever you change a
//  design's default JSON:
//
//      npm run seed
//
//  It writes:
//    data/design/<slug>.json     the showcase templates (from ./data/design)
//    data/couple/<slug>.json     any couples already on disk (a one-time migration
//                                from the old filesystem store)
//    assets/couple/<slug>/*      their uploaded photographs (from ./public/uploads)
//
//  Note the two prefixes. `data/` is private — nothing serves it. `assets/` is
//  public, streamed by app/uploads/[...path]/route.ts.

const root = process.cwd();

const MIME = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
};

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

const { env, dispose } = await getPlatformProxy();
const bucket = env.BUCKET;
if (!bucket) throw new Error("No BUCKET binding — check wrangler.jsonc");

let configs = 0;
let photos = 0;

// ── The design templates + any already-published couples ────────────────────
for (const section of ["design", "couple", "draft"]) {
  const dir = path.join(root, "data", section);
  if (!(await exists(dir))) continue;

  for (const file of await readdir(dir)) {
    if (!file.endsWith(".json")) continue;
    const body = await readFile(path.join(dir, file), "utf8");
    const key = `data/${section}/${file}`;
    await bucket.put(key, body, {
      httpMetadata: { contentType: "application/json", cacheControl: "no-store" },
    });
    console.log(`  config  ${key}`);
    configs++;
  }
}

// ── The couples' photographs ────────────────────────────────────────────────
const uploads = path.join(root, "public", "uploads");
if (await exists(uploads)) {
  for (const slug of await readdir(uploads)) {
    const dir = path.join(uploads, slug);
    if (!(await stat(dir)).isDirectory()) continue;

    for (const name of await readdir(dir)) {
      const body = await readFile(path.join(dir, name));
      const key = `assets/couple/${slug}/${name}`;
      await bucket.put(key, body, {
        httpMetadata: {
          contentType: MIME[path.extname(name).toLowerCase()] ?? "application/octet-stream",
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
      console.log(`  photo   ${key}`);
      photos++;
    }
  }
}

await dispose();

console.log(`\n✓ seeded local R2 — ${configs} config object(s), ${photos} photo(s)`);
console.log("  data/…    private: read by the server, served to nobody");
console.log("  assets/…  public:  streamed by /uploads/<slug>/<file>");
