import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { referencedPhotoPaths } from "./derive";
import type { TemplateData } from "./template-types";

// ═══════════════════════════════════════════════════════════════════════════
//  The ONLY place that touches storage. Everything lives in R2.
// ═══════════════════════════════════════════════════════════════════════════
//  `import "server-only"` makes this module a build error if it is ever pulled
//  into a client component — the guardrail that keeps a couple's config out of the
//  browser. Pages read the JSON here, render HTML from it, and the file itself is
//  never served.
//
//  ONE binding, and the prefixes are load-bearing:
//
//    data/<section>/<slug>.json     PRIVATE. The config. No route serves this
//                                   prefix — the only way its contents reach
//                                   anyone is as rendered HTML.
//    assets/couple/<slug>/*         PUBLIC. A LIVE invitation's photographs.
//    assets/draft/<slug>/*          PUBLIC. Photographs being tried out.
//
//  Photos are STAGED, then PROMOTED. An upload lands in the draft folder and
//  nowhere else; only Publish copies it across to the couple's. Before that split,
//  saveImage wrote into `assets/couple/<slug>/` the instant you picked a file — so
//  merely *considering* a new photo for a published invitation dumped it into that
//  live invitation's storage, forever, whether or not you ever saved. (Measured on
//  one couple: 7 photos stored, 1 in use.)
//
//  It also makes the delete rules structural rather than careful: each section owns
//  its folder outright, so removing a draft cannot strip a live invitation of its
//  pictures. It used to share one folder with the couple, and only a head() check
//  stood between a draft deletion and a live page with no photographs on it.
//
//  The deployed gateway serves ANY key under `couple/<slug>/` straight from R2.
//  Storing the JSON beside the photos would make it fetchable at
//  /couple/<slug>/template.json and hand back the entire config — undoing the
//  whole point of the server/client split.
//
//  DEV vs PROD is the same code. `getCloudflareContext()` gives the real R2 bucket
//  in the Worker, and Wrangler's local simulator (Miniflare, persisted under
//  .wrangler/state) under `next dev`. There is no filesystem branch, because the
//  Worker has no filesystem — a code path that only ever runs locally is a code
//  path that breaks on deploy.

export type Section = "design" | "couple" | "draft";

/** The sections that own a photo folder. `design` ships its art with the code. */
export type PhotoSection = "couple" | "draft";

/** Slugs are used to build an object key, so they are validated, never trusted. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Slugs a couple may not take — they collide with the app's own routes.
 *
 *  "live" is in here because drafts are keyed by the couple's slug and are served
 *  at /preview/<slug>, which sits beside the static /preview/live. A static
 *  segment wins over a dynamic one, so a draft called "live" would simply be
 *  unreachable. Reserve it rather than leave that trap lying around. */
const RESERVED = new Set([
  "design", "couple", "draft", "edit", "preview", "live", "api", "admin",
  "assets", "static", "_next", "uploads", "shared", "templates", "blog",
  "about", "contact", "pricing", "privacy", "terms", "favicon.ico",
  "robots.txt", "sitemap.xml",
]);

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Use lowercase letters, numbers and hyphens.";
  if (RESERVED.has(slug)) return `"${slug}" is reserved.`;
  return null;
}

/** The R2 bucket. Same call locally and in production. */
async function bucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return env.BUCKET;
}

// ── Keys ─────────────────────────────────────────────────────────────────────
const configKey = (section: Section, slug: string) => `data/${section}/${slug}.json`;

const photoPrefix = (section: PhotoSection, slug: string) =>
  `assets/${section}/${slug}/`;

const photoKey = (section: PhotoSection, slug: string, name: string) =>
  `${photoPrefix(section, slug)}${name}`;

/** The public URL for a stored photograph (served by app/uploads/[...path]). */
export const photoUrl = (section: PhotoSection, slug: string, name: string) =>
  `/uploads/${section}/${slug}/${name}`;

/**
 * The filename inside a section's folder that a JSON path points at, or null if
 * the path isn't one of that section's photos.
 *
 * Template art (`/images/c1.webp`) resolves against the template's own folder and
 * is not an upload, so it lands here as null — which is what keeps the collector
 * from thinking a design's shipped artwork is garbage.
 */
function photoNameFrom(
  path: string,
  section: PhotoSection,
  slug: string
): string | null {
  const prefix = `/uploads/${section}/${slug}/`;
  if (path.startsWith(prefix)) {
    const name = path.slice(prefix.length);
    return name && !name.includes("/") ? name : null;
  }

  // LEGACY: photos published before the draft/couple split were addressed as
  // /uploads/<slug>/<name>, with the couple folder implied. `npm run gc` rewrites
  // these; until it has run everywhere, they still resolve.
  if (section === "couple") {
    const legacy = `/uploads/${slug}/`;
    if (path.startsWith(legacy)) {
      const name = path.slice(legacy.length);
      return name && !name.includes("/") ? name : null;
    }
  }

  return null;
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** Every object under a prefix. R2's list() is PAGED — follow the cursor. */
async function listAll(prefix: string): Promise<R2Object[]> {
  const b = await bucket();
  const out: R2Object[] = [];
  let cursor: string | undefined;

  do {
    const page = await b.list({ prefix, cursor });
    out.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return out;
}

/** The template for a slug, or null if there isn't one (→ the page 404s). */
export async function loadTemplate(
  section: Section,
  slug: string
): Promise<TemplateData | null> {
  if (!SLUG_RE.test(slug)) return null;
  const obj = await (await bucket()).get(configKey(section, slug));
  if (!obj) return null;
  try {
    return (await obj.json()) as TemplateData;
  } catch {
    return null; // malformed JSON
  }
}

/**
 * Is this slug already taken in that section?
 *
 * R2's put() is an OVERWRITE — it does not complain, it replaces. So nothing
 * stops a brand-new invitation from silently destroying a live one that happens
 * to share a slug, and the two would share a photo folder into the bargain. The
 * write endpoints ask this first.
 *
 * head() fetches the metadata, not the body — no point pulling a JSON down just
 * to learn that it is there.
 */
export async function templateExists(
  section: Section,
  slug: string
): Promise<boolean> {
  if (!SLUG_RE.test(slug)) return false;
  return (await (await bucket()).head(configKey(section, slug))) !== null;
}

/** Every slug stored under a section. */
export async function listSlugs(section: Section): Promise<string[]> {
  const prefix = `data/${section}/`;
  return (await listAll(prefix))
    .map((o) => o.key.slice(prefix.length))
    .filter((k) => k.endsWith(".json"))
    .map((k) => k.slice(0, -5));
}

/** A stored template, with the bucket's own metadata — what the dashboard lists. */
export type StoredTemplate = {
  section: Section;
  slug: string;
  /** Bytes of JSON. */
  size: number;
  /** When it was last written. */
  uploaded: Date;
  /** null if the object is unreadable — a corrupt file should be visible, not hidden. */
  data: TemplateData | null;
};

/** Everything under a section, with its content. One list(), then a get() each. */
export async function listTemplates(section: Section): Promise<StoredTemplate[]> {
  const prefix = `data/${section}/`;
  const objects = (await listAll(prefix)).filter((o) => o.key.endsWith(".json"));

  const templates = await Promise.all(
    objects.map(async (o) => {
      const slug = o.key.slice(prefix.length, -".json".length);
      return {
        section,
        slug,
        size: o.size,
        uploaded: o.uploaded,
        data: await loadTemplate(section, slug),
      };
    })
  );

  return templates.sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime());
}

export type PhotoStats = { count: number; bytes: number };

/** Photo count + size per slug within a section, from a SINGLE list of the prefix. */
export async function listPhotoStats(
  section: PhotoSection
): Promise<Record<string, PhotoStats>> {
  const prefix = `assets/${section}/`;
  const stats: Record<string, PhotoStats> = {};

  for (const o of await listAll(prefix)) {
    const slug = o.key.slice(prefix.length).split("/")[0];
    if (!slug) continue;
    stats[slug] ??= { count: 0, bytes: 0 };
    stats[slug].count++;
    stats[slug].bytes += o.size;
  }

  return stats;
}

/** Stream a photograph out of R2. */
export async function readPhoto(
  section: PhotoSection,
  slug: string,
  name: string
) {
  if (!SLUG_RE.test(slug)) return null;
  return (await bucket()).get(photoKey(section, slug, name));
}

// ── Writes ───────────────────────────────────────────────────────────────────

/** Write a template. Lands under the PRIVATE `data/` prefix.
 *
 *  Every section — draft included — is keyed by the couple's slug and validated
 *  the same way. A draft used to be an anonymous UUID, which meant nobody could
 *  tell you what it would publish to, and they piled up forever. Sharing the slug
 *  space with `couple` gives a slug one legible life: draft → published → draft
 *  again (unpublished changes). */
export async function saveTemplate(
  section: Section,
  slug: string,
  data: TemplateData
): Promise<void> {
  const err = validateSlug(slug);
  if (err) throw new Error(err);

  await (await bucket()).put(configKey(section, slug), JSON.stringify(data, null, 2), {
    httpMetadata: {
      contentType: "application/json",
      // Belt and braces: even if this key were ever exposed, don't let it cache.
      cacheControl: "no-store",
    },
  });
}

/**
 * Store an uploaded photograph and return the URL to write into the JSON.
 *
 * ALWAYS lands in the DRAFT folder — never the couple's. Uploading is not
 * publishing: a photo you are merely trying out must not touch a live
 * invitation's storage, and before this it did, the instant you picked the file.
 * Publish is what moves it across (see promoteDraftPhotos).
 */
export async function saveImage(slug: string, file: File): Promise<string> {
  const err = validateSlug(slug);
  if (err) throw new Error(err);

  // The filename comes from the browser: strip any path, keep it boring.
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = (file.name.replace(/\.[^.]*$/, "") || "image")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const name = `${base || "image"}-${Date.now().toString(36)}.${ext}`;

  await (await bucket()).put(photoKey("draft", slug, name), await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable", // the name is unique
    },
  });

  return photoUrl("draft", slug, name);
}

// ── Promotion: the moment a photograph goes live ─────────────────────────────

/**
 * Copy every staged photograph this template references into the couple's folder
 * and rewrite its path. Returns the rewritten template — save THAT, not the input.
 *
 * This is the whole point of the draft/couple split: until Publish calls it,
 * nothing the operator has tried exists anywhere near the live invitation.
 * Photos already published and untouched aren't referenced under `/uploads/draft/`
 * at all, so they are not copied — only what actually changed moves.
 */
export async function promoteDraftPhotos(
  slug: string,
  data: TemplateData
): Promise<TemplateData> {
  const err = validateSlug(slug);
  if (err) throw new Error(err);

  const staged = new Map<string, string>(); // draft path → couple path
  for (const path of referencedPhotoPaths(data.content)) {
    const name = photoNameFrom(path, "draft", slug);
    if (name) staged.set(path, photoUrl("couple", slug, name));
  }
  if (staged.size === 0) return data;

  const b = await bucket();
  await Promise.all(
    [...staged.keys()].map(async (path) => {
      const name = photoNameFrom(path, "draft", slug)!;
      const obj = await b.get(photoKey("draft", slug, name));
      if (!obj) return; // already promoted, or swept — the path rewrite still stands

      // Buffered, not streamed — and not by choice. R2's put() rejects a plain
      // ReadableStream: "Provided readable stream must have a known length", and a
      // get() body has none. /api/upload caps a photo at 8 MB, so holding one in
      // memory to move it between folders is fine.
      await b.put(photoKey("couple", slug, name), await obj.arrayBuffer(), {
        httpMetadata: obj.httpMetadata,
      });
    })
  );

  // Rewrite the paths on a copy — the caller's object is not ours to mutate.
  const next = structuredClone(data);
  const c = next.content;
  const move = (p: string) => staged.get(p) ?? p;

  c.cover.classicImage = move(c.cover.classicImage);
  if (c.cover.portraitImage) c.cover.portraitImage = move(c.cover.portraitImage);
  c.hero.image = move(c.hero.image);
  c.couple.bride.photo = move(c.couple.bride.photo);
  c.couple.groom.photo = move(c.couple.groom.photo);
  c.gallery.photos = c.gallery.photos.map(move);

  return next;
}

// ── Deletes ──────────────────────────────────────────────────────────────────

/** Never sweep a photograph younger than this. See pruneOrphanPhotos. */
const GRACE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Delete photographs in a section's folder that the section's JSON no longer
 * points at — the ones left behind when a photo is swapped out.
 *
 * Three rules, and each of them is load-bearing:
 *
 *   1. NEVER delete anything uploaded within GRACE_MS. A photo exists in R2 from
 *      the moment it is uploaded, but is not *referenced* until the operator
 *      saves. Without this window, a save from one tab would collect a photo
 *      another tab had just added but not yet saved.
 *
 *   2. If the JSON EXISTS but will not parse, abort. A corrupt file reads as
 *      "references nothing", and a collector that believed it would take every
 *      photograph on the page with it. Deleting nothing is always recoverable;
 *      deleting a couple's wedding photos is not.
 *
 *   3. Only ever sweep the section's OWN folder. The two no longer share one.
 */
export async function pruneOrphanPhotos(
  section: PhotoSection,
  slug: string
): Promise<{ deleted: number; kept: number }> {
  if (!SLUG_RE.test(slug)) return { deleted: 0, kept: 0 };

  const b = await bucket();
  const objects = await listAll(photoPrefix(section, slug));
  if (objects.length === 0) return { deleted: 0, kept: 0 };

  const referenced = new Set<string>();

  if (await templateExists(section, slug)) {
    const data = await loadTemplate(section, slug);
    if (!data) {
      // Rule 2: the object is there but unreadable. Do nothing at all.
      return { deleted: 0, kept: objects.length };
    }
    for (const path of referencedPhotoPaths(data.content)) {
      const name = photoNameFrom(path, section, slug);
      if (name) referenced.add(name);
    }
  }
  // No JSON in this section → nothing references these; they are all orphans,
  // subject to the grace window below.

  const cutoff = Date.now() - GRACE_MS;
  const prefix = photoPrefix(section, slug);
  const doomed = objects.filter((o) => {
    const name = o.key.slice(prefix.length);
    return !referenced.has(name) && o.uploaded.getTime() < cutoff; // rule 1
  });

  await Promise.all(doomed.map((o) => b.delete(o.key)));
  return { deleted: doomed.length, kept: objects.length - doomed.length };
}

/** Delete every photograph in a section's folder, referenced or not. */
export async function deletePhotoFolder(
  section: PhotoSection,
  slug: string
): Promise<number> {
  if (!SLUG_RE.test(slug)) return 0;
  const b = await bucket();
  const objects = await listAll(photoPrefix(section, slug));
  await Promise.all(objects.map((o) => b.delete(o.key)));
  return objects.length;
}

/**
 * Delete a slug's template from one section, and that section's photographs with
 * it.
 *
 * This used to need care: draft and couple shared one photo folder, so deleting a
 * draft had to head() the couple's config first or it would strip a live
 * invitation of every picture on it. Now each section owns its own folder, and
 * that whole class of mistake is gone — not guarded against, just impossible.
 */
export async function deleteTemplate(
  section: Section,
  slug: string
): Promise<{ deletedPhotos: number }> {
  const err = validateSlug(slug);
  if (err) throw new Error(err);

  await (await bucket()).delete(configKey(section, slug));

  // Designs ship their art with the code and own no uploads.
  if (section === "design") return { deletedPhotos: 0 };

  return { deletedPhotos: await deletePhotoFolder(section, slug) };
}
