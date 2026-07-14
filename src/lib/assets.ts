import { BASE } from "./base-path";

// ═══════════════════════════════════════════════════════════════════════════
//  Asset URL resolution.
// ═══════════════════════════════════════════════════════════════════════════
//  Every template stores its asset paths template-RELATIVE ("/images/c1.webp"),
//  and this resolver namespaces them at read time. That is what lets two
//  templates own a file of the same name — saffron's and villa's `c1.webp` are
//  DIFFERENT photographs — without one silently overwriting the other in a
//  shared /public.
//
//    assetUrl("saffron", "/images/c1.webp")  →  /templates/saffron/images/c1.webp
//    assetUrl("villa",   "/images/c1.webp")  →  /templates/villa/images/c1.webp
//
//  Because the namespacing happens here, template.json needs NO path rewrites.
//
//  Two kinds of path are passed through untouched:
//    • /shared/…   theme-agnostic assets stored once (audio, the watermark, the
//                  ripple textures — byte-identical across templates)
//    • /uploads/…  a couple's own photographs, which belong to no template
//  …as are absolute URLs and inline data: URLs (the editor's image uploads).

export function assetUrl(templateSlug: string, path: string): string {
  if (!path) return path;
  if (/^(https?:|data:)/.test(path)) return path; // absolute or inline — leave alone
  if (/^\/(shared|uploads)\//.test(path)) return `${BASE}${path}`; // owned by no template
  return `${BASE}/templates/${templateSlug}${path}`;
}

/** Assets stored once and shared by every template (audio, watermark, ripple textures). */
export const sharedUrl = (path: string) => `${BASE}/shared${path}`;
