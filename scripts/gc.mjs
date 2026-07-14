import { getPlatformProxy } from "wrangler";

// ═══════════════════════════════════════════════════════════════════════════
//  npm run gc — sweep the bucket.
// ═══════════════════════════════════════════════════════════════════════════
//  Two jobs, both idempotent:
//
//  1. MIGRATE legacy photo paths. Photos published before the draft/couple split
//     were addressed as /uploads/<slug>/<file>, with the couple folder implied.
//     Rewrite them to the explicit /uploads/couple/<slug>/<file>.
//
//  2. COLLECT orphaned photographs — objects in a section's folder that the
//     section's JSON no longer points at. These are what you leave behind every
//     time you swap a photo for a different one.
//
//  The app prunes as it goes (on each save and each publish), so this is for the
//  backlog and for anything a failed sweep left behind.
//
//      npm run gc            dry run — says what it would do
//      npm run gc -- --apply actually does it
//
//  SAFETY, mirroring src/lib/store.ts:
//    · a photo younger than the grace window is never touched — it may be
//      uploaded but not yet saved into any JSON
//    · if a JSON exists but will not parse, that slug is skipped entirely. A
//      corrupt file reads as "references nothing", and a collector that believed
//      it would delete every photograph the page actually shows.

const APPLY = process.argv.includes("--apply");
const GRACE_MS = 60 * 60 * 1000; // 1 hour — must match store.ts

const { env, dispose } = await getPlatformProxy();
const bucket = env.BUCKET;
if (!bucket) throw new Error("No BUCKET binding — check wrangler.jsonc");

const listAll = async (prefix) => {
  const out = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor });
    out.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out;
};

/** Every photo path a template references. Mirrors derive.referencedPhotoPaths. */
const referencedPhotoPaths = (c) =>
  [
    c.cover.classicImage,
    c.cover.portraitImage,
    c.hero.image,
    c.couple.bride.photo,
    c.couple.groom.photo,
    ...c.gallery.photos,
  ].filter((p) => typeof p === "string" && p.length > 0);

const photoNameFrom = (path, section, slug) => {
  for (const prefix of [
    `/uploads/${section}/${slug}/`,
    ...(section === "couple" ? [`/uploads/${slug}/`] : []), // legacy
  ]) {
    if (path.startsWith(prefix)) {
      const name = path.slice(prefix.length);
      if (name && !name.includes("/")) return name;
    }
  }
  return null;
};

const loadJson = async (key) => {
  const obj = await bucket.get(key);
  if (!obj) return undefined; // absent
  try {
    return await obj.json();
  } catch {
    return null; // present but corrupt — NOT the same thing
  }
};

let migrated = 0;
let deleted = 0;
let freed = 0;
let skipped = 0;

for (const section of ["couple", "draft"]) {
  const configPrefix = `data/${section}/`;
  const configs = await listAll(configPrefix);

  for (const cfg of configs) {
    const slug = cfg.key.slice(configPrefix.length).replace(/\.json$/, "");
    const data = await loadJson(cfg.key);

    if (data === null) {
      console.log(`  SKIP    ${section}/${slug} — JSON will not parse; touching nothing`);
      skipped++;
      continue;
    }

    // ── 1. migrate legacy paths ──────────────────────────────────────────────
    if (section === "couple") {
      const legacy = `/uploads/${slug}/`;
      const fixed = `/uploads/couple/${slug}/`;
      const before = JSON.stringify(data);
      const after = before.split(legacy).join(fixed);

      if (after !== before) {
        console.log(`  MIGRATE ${section}/${slug} — legacy photo paths → /uploads/couple/…`);
        if (APPLY) {
          await bucket.put(cfg.key, after, {
            httpMetadata: { contentType: "application/json", cacheControl: "no-store" },
          });
        }
        Object.assign(data, JSON.parse(after));
        migrated++;
      }
    }

    // ── 2. collect orphans ───────────────────────────────────────────────────
    const referenced = new Set();
    for (const path of referencedPhotoPaths(data.content)) {
      const name = photoNameFrom(path, section, slug);
      if (name) referenced.add(name);
    }

    const prefix = `assets/${section}/${slug}/`;
    const objects = await listAll(prefix);
    const cutoff = Date.now() - GRACE_MS;

    for (const o of objects) {
      const name = o.key.slice(prefix.length);
      if (referenced.has(name)) continue;
      if (o.uploaded.getTime() >= cutoff) {
        console.log(`  YOUNG   ${o.key} — unreferenced but < 1h old, sparing it`);
        continue;
      }
      console.log(`  ORPHAN  ${o.key}  (${(o.size / 1024 / 1024).toFixed(1)} MB)`);
      if (APPLY) await bucket.delete(o.key);
      deleted++;
      freed += o.size;
    }
  }

  // Photo folders with no JSON at all — a slug that was deleted, or an editing
  // session that uploaded and never saved.
  const assetPrefix = `assets/${section}/`;
  const stray = new Set(
    (await listAll(assetPrefix)).map((o) => o.key.slice(assetPrefix.length).split("/")[0])
  );
  for (const slug of stray) {
    if (configs.some((c) => c.key === `data/${section}/${slug}.json`)) continue;

    for (const o of await listAll(`assets/${section}/${slug}/`)) {
      if (o.uploaded.getTime() >= Date.now() - GRACE_MS) continue;
      console.log(`  STRAY   ${o.key} — no ${section} JSON for "${slug}"`);
      if (APPLY) await bucket.delete(o.key);
      deleted++;
      freed += o.size;
    }
  }
}

const mb = (freed / 1024 / 1024).toFixed(1);
console.log(
  APPLY
    ? `\n✓ migrated ${migrated}, deleted ${deleted} photo(s), freed ${mb} MB` +
        (skipped ? `, skipped ${skipped} unreadable` : "")
    : `\nDry run: would migrate ${migrated}, delete ${deleted} photo(s), free ${mb} MB` +
        (skipped ? `, skipping ${skipped} unreadable` : "") +
        `\nPass --apply to do it.`
);

await dispose();
