import { readPhoto } from "@/lib/store";

// Last-resort content types. saveImage() always records one, so this only covers
// an object that got into the bucket some other way — and a photo served without
// a content-type is a photo the browser downloads instead of showing.
const MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  avif: "image/avif",
  gif: "image/gif",
};

const mimeFor = (name: string) =>
  MIME[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

// ═══════════════════════════════════════════════════════════════════════════
//  GET /uploads/<section>/<slug>/<file> — a photograph, streamed out of R2.
// ═══════════════════════════════════════════════════════════════════════════
//  Two folders, because a photo being tried out and a photo that is live are not
//  the same thing:
//
//    /uploads/draft/<slug>/<file>    staged — what the editor is working with
//    /uploads/couple/<slug>/<file>   live — what a guest sees
//
//  Note what this can and cannot reach: `readPhoto` only ever builds a key under
//  `assets/<section>/<slug>/`, and `section` is checked against a two-item list
//  below. There is no path, and no crafted URL, that gets it to read the `data/`
//  prefix where the config lives. That separation is not a convention — nothing
//  serving public traffic can address the private prefix at all.
//
//  In production the gateway may well serve these straight from R2 without ever
//  touching the Worker; this route means the app is correct either way.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  let section: "draft" | "couple";
  let slug: string;
  let name: string;

  if (path.length === 3 && (path[0] === "draft" || path[0] === "couple")) {
    [section, slug, name] = path as ["draft" | "couple", string, string];
  } else if (path.length === 2) {
    // LEGACY: photos published before the draft/couple split were addressed as
    // /uploads/<slug>/<file>, with the couple folder implied. `npm run gc`
    // rewrites those paths; this keeps the old ones resolving until it has.
    section = "couple";
    [slug, name] = path;
  } else {
    return new Response("Not found", { status: 404 });
  }

  if (name.includes("/") || name.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const obj = await readPhoto(section, slug, name);
  if (!obj) return new Response("Not found", { status: 404 });

  // Build the headers from the object's own metadata rather than calling
  // obj.writeHttpMetadata(headers), which cannot work here.
  //
  // In `next dev` the R2 binding is not a bucket — it is an RPC proxy to a
  // separate Miniflare process, and every argument crossing it is serialized.
  // writeHttpMetadata takes a Headers INSTANCE, which is not serializable:
  // "DevalueError: Cannot stringify arbitrary non-POJOs" (workers-sdk#6047).
  // Nor could it ever work over a wire — it fills the headers in by MUTATING the
  // object you hand it, and across a process boundary there is nothing to mutate.
  //
  // httpMetadata is a plain object and httpEtag a string, so both cross happily,
  // and reading them ourselves behaves identically in the deployed Worker.
  const meta = obj.httpMetadata;
  const headers = new Headers();

  headers.set("content-type", meta?.contentType ?? mimeFor(name));
  headers.set(
    "cache-control",
    // The stored policy; the fallback matches what saveImage() writes. Safe to
    // cache hard: every upload gets a unique filename, so a photo is never
    // replaced in place.
    meta?.cacheControl ?? "public, max-age=31536000, immutable"
  );
  if (meta?.contentEncoding) headers.set("content-encoding", meta.contentEncoding);
  if (meta?.contentDisposition) headers.set("content-disposition", meta.contentDisposition);
  if (meta?.contentLanguage) headers.set("content-language", meta.contentLanguage);
  headers.set("etag", obj.httpEtag);

  // Streamed, not buffered — no reason to hold a photo in the Worker's memory.
  return new Response(obj.body, { headers });
}
