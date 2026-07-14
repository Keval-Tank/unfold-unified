import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

// ═══════════════════════════════════════════════════════════════════════════
//  npm run seed:remote — put the design templates into the PRODUCTION bucket.
// ═══════════════════════════════════════════════════════════════════════════
//  `npm run seed` writes to Miniflare's LOCAL bucket, via getPlatformProxy. It
//  cannot reach production, and that is the trap: deploy without running this and
//  the bucket is empty — /design/<slug> 404s, and /edit has no template to start
//  from at all.
//
//  This pushes data/design/*.json to the real R2 bucket named in wrangler.jsonc,
//  using `wrangler r2 object put --remote`.
//
//      npm run seed:remote            upload
//      npm run seed:remote -- --check just report what is already up there
//
//  It is idempotent and additive: it only ever writes data/design/<slug>.json.
//  It never touches data/couple/, data/draft/ or anybody's photographs.
//
//  Only the DESIGNS need seeding. Their images are template art (/images/…),
//  which `assetUrl()` resolves into /templates/<slug>/… — files that ship with the
//  Worker bundle, not R2. So these two JSONs are self-contained; there is nothing
//  else to copy. A COUPLE's photos are different — those live only in R2 — but
//  couples are created on production through the editor, so they arrive on their own.

const root = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");

// ── Which bucket? Read it from wrangler.jsonc, so this cannot drift from the
//    binding the Worker actually gets.
const wranglerSrc = readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
const wrangler = JSON.parse(wranglerSrc.replace(/^\s*\/\/.*$/gm, ""));
const bucket = wrangler.r2_buckets?.[0]?.bucket_name;
if (!bucket) throw new Error("No r2_buckets[0].bucket_name in wrangler.jsonc");

const run = (args) =>
  spawnSync("npx", ["wrangler", ...args], { cwd: root, encoding: "utf8" });

console.log(`\nBucket: ${bucket}  (from wrangler.jsonc)\n`);

// ── Does it exist? A missing bucket is the most likely failure, and wrangler's
//    own error for it is not obvious.
const buckets = run(["r2", "bucket", "list"]);
if (buckets.status !== 0) {
  console.error("Could not list R2 buckets. Are you logged in?  npx wrangler login\n");
  console.error(buckets.stderr?.trim());
  process.exit(1);
}
if (!buckets.stdout.includes(bucket)) {
  console.error(`The bucket "${bucket}" does not exist on this account.\n`);
  console.error(`Create it:   npx wrangler r2 bucket create ${bucket}`);
  console.error(`Or point wrangler.jsonc at one that exists.\n`);
  process.exit(1);
}

// ── The designs ─────────────────────────────────────────────────────────────
const dir = path.join(root, "data", "design");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
if (files.length === 0) throw new Error(`No JSON in ${dir}`);

let uploaded = 0;
let failed = 0;

for (const file of files) {
  const local = path.join(dir, file);
  const slug = file.replace(/\.json$/, "");
  const key = `data/design/${slug}.json`;

  // Refuse to publish a JSON that will not render. Better to fail here than to
  // deploy and get a 404 whose cause is a typo in a file nobody looks at.
  let data;
  try {
    data = JSON.parse(readFileSync(local, "utf8"));
  } catch (err) {
    console.error(`  ✗ ${file} — not valid JSON: ${err.message}`);
    failed++;
    continue;
  }
  if (data?.site?.templateSlug !== slug) {
    console.error(
      `  ✗ ${file} — site.templateSlug is "${data?.site?.templateSlug}", expected "${slug}". ` +
        `The filename IS the key the app reads.`
    );
    failed++;
    continue;
  }

  // Uploaded photos live only in R2. Template art ships with the Worker. If a
  // design somehow references the former, the JSON alone is not enough and the
  // page would render with a broken image.
  const uploads = JSON.stringify(data).match(/"\/uploads\/[^"]*"/g);
  if (uploads) {
    console.error(`  ✗ ${file} — references uploaded photos, which are not in this push:`);
    for (const u of new Set(uploads)) console.error(`        ${u}`);
    failed++;
    continue;
  }

  if (CHECK_ONLY) {
    const head = run(["r2", "object", "get", `${bucket}/${key}`, "--remote", "--pipe"]);
    console.log(
      head.status === 0
        ? `  · ${key} — already in the bucket (${head.stdout.length} bytes)`
        : `  · ${key} — NOT in the bucket`
    );
    continue;
  }

  const put = run([
    "r2", "object", "put", `${bucket}/${key}`,
    "--file", local,
    "--content-type", "application/json",
    // Matches saveTemplate(): even though nothing serves this prefix, never let a
    // config be cached anywhere.
    "--cache-control", "no-store",
    "--remote",
  ]);

  if (put.status === 0) {
    console.log(`  ✓ ${key}`);
    uploaded++;
  } else {
    console.error(`  ✗ ${key}\n${put.stderr?.trim() || put.stdout?.trim()}`);
    failed++;
  }
}

if (CHECK_ONLY) {
  console.log("\n(--check: nothing was written)\n");
  process.exit(0);
}

console.log(
  failed
    ? `\n${uploaded} uploaded, ${failed} FAILED — production is not ready.\n`
    : `\n✓ ${uploaded} design(s) in the production bucket.\n` +
        `  /design/<slug> will render, and /edit has its templates to start from.\n`
);
process.exit(failed ? 1 : 0);
