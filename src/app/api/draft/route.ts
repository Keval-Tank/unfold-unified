import { NextResponse } from "next/server";
import {
  loadTemplate,
  pruneOrphanPhotos,
  saveTemplate,
  templateExists,
  validateSlug,
} from "@/lib/store";
import { isKnownTemplate } from "@/templates/slugs";
import { getCoupleNames } from "@/lib/derive";
import type { TemplateData } from "@/lib/template-types";

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/draft — save work in progress.
// ═══════════════════════════════════════════════════════════════════════════
//  Writes data/draft/<slug>.json, which /preview/<slug> then server-renders.
//
//  This used to fire on a 500ms debounce behind every keystroke, because the
//  editor's iframe could only show a draft the server had already written. The
//  preview renders in the browser now, so this is what it should always have
//  been: an explicit Save, on the same slug the couple will be published to.
//
//  Same slug guard as publish, and the same one exception: a draft may only land
//  on a taken slug when the editor is the one that took it. Note this checks the
//  DRAFT section only — a draft on an already-published slug is not a collision,
//  it is the "unpublished changes" state the dashboard is built to show.
//
//  ⚠️  Shares the publish endpoint's lack of auth. See src/app/api/publish/route.ts.
export async function POST(req: Request) {
  try {
    const { slug, data, replace } = (await req.json()) as {
      slug: string;
      data: TemplateData;
      replace?: boolean;
    };

    const slugError = validateSlug(slug ?? "");
    if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });

    const design = data?.site?.templateSlug;
    if (!design || !isKnownTemplate(design)) {
      return NextResponse.json({ error: `unknown template "${design}"` }, { status: 400 });
    }

    if (!replace && (await templateExists("draft", slug))) {
      const existing = await loadTemplate("draft", slug);
      const who = existing ? getCoupleNames(existing.couple) : "someone else";
      return NextResponse.json(
        {
          error: `"${slug}" already has a draft — it belongs to ${who}. Pick another slug, or open that draft from the dashboard.`,
          taken: true,
        },
        { status: 409 }
      );
    }

    await saveTemplate("draft", slug, data);

    // Photographs tried out and then swapped away for something else are now
    // referenced by nothing. Sweep the DRAFT folder only — the couple's is not
    // ours to touch, and a photo uploaded in the last hour is spared regardless
    // (see pruneOrphanPhotos). Best effort: the draft is saved either way.
    let swept = 0;
    try {
      ({ deleted: swept } = await pruneOrphanPhotos("draft", slug));
    } catch (err) {
      console.error(`draft: could not prune ${slug}`, err);
    }

    return NextResponse.json({ ok: true, url: `/preview/${slug}`, swept });
  } catch {
    return NextResponse.json({ error: "could not save the draft" }, { status: 500 });
  }
}
