import type { Metadata } from "next";
import EditorApp from "@/components/editor/EditorApp";
import { loadTemplate, listSlugs } from "@/lib/store";
import { TEMPLATES } from "@/templates/registry";
import { coverIdsFor } from "@/templates/covers";
import type { TemplateData } from "@/lib/template-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Template Editor",
  robots: { index: false, follow: false },
};

// ═══════════════════════════════════════════════════════════════════════════
//  /edit — the operator UI.
// ═══════════════════════════════════════════════════════════════════════════
//  The one page where the config DOES live in the browser — necessarily, because
//  editing it is the point. It is an operator tool, not a guest-facing page, and
//  the invitation itself never loads this route's code.
//
//  Three ways in:
//    /edit                  start from a design's defaults
//    /edit?draft=<slug>     resume saved work in progress
//    /edit?couple=<slug>    re-open a LIVE invitation to correct it
//
//  That last one used to be impossible: fixing a typo on a published invitation
//  meant rebuilding it from scratch.
export default async function EditPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; couple?: string }>;
}) {
  const designSlugs = Object.keys(TEMPLATES);

  const bases: Record<string, TemplateData> = {};
  for (const slug of designSlugs) {
    const t = await loadTemplate("design", slug);
    if (t) bases[slug] = t;
  }

  // An empty bucket is what a FRESH DEPLOY looks like: `npm run seed` writes to
  // the local Miniflare bucket and cannot reach production. Without this, the
  // editor takes `bases[designs[0]]` — undefined — and dies on the first property
  // read, giving a 500 whose cause is nowhere in the stack trace. Say what is
  // actually wrong instead.
  if (Object.keys(bases).length === 0) {
    return (
      <main className="mx-auto max-w-md p-10 font-sans text-sm">
        <h1 className="text-base font-bold">No templates in the bucket</h1>
        <p className="mt-2 text-neutral-600">
          The editor starts from a design, and R2 holds none. This is what a fresh
          deployment looks like — <code>npm run seed</code> only writes to the local
          bucket.
        </p>
        <pre className="mt-3 rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-100">
          npm run seed:remote
        </pre>
      </main>
    );
  }

  const covers: Record<string, string[]> = {};
  for (const slug of designSlugs) covers[slug] = coverIdsFor(slug);

  // Resume an existing template, if we were pointed at one. A slug that isn't in
  // the bucket just falls through to a fresh start from the first design.
  const { draft, couple } = await searchParams;
  const section = draft ? "draft" : couple ? "couple" : null;
  const slug = draft ?? couple;

  const existing = section && slug ? await loadTemplate(section, slug) : null;
  const initial = existing && slug ? { slug, data: existing } : null;

  // The slugs already spoken for, so the editor can say so as you type rather than
  // letting you fill in a whole invitation and discover the clash at Publish. It
  // is only a courtesy — the write endpoints do the actual refusing, because this
  // list is a snapshot and the bucket is not.
  const [coupleSlugs, draftSlugs] = await Promise.all([
    listSlugs("couple"),
    listSlugs("draft"),
  ]);

  return (
    <EditorApp
      bases={bases}
      covers={covers}
      initial={initial}
      taken={{ couple: coupleSlugs, draft: draftSlugs }}
    />
  );
}
