import { NextResponse } from "next/server";
import {
  deleteTemplate,
  loadTemplate,
  promoteDraftPhotos,
  pruneOrphanPhotos,
  saveTemplate,
  templateExists,
  validateSlug,
} from "@/lib/store";
import { isKnownTemplate } from "@/templates/slugs";
import { getCoupleNames } from "@/lib/derive";
import type { TemplateData } from "@/lib/template-types";

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/publish — writes a couple's invitation.
// ═══════════════════════════════════════════════════════════════════════════
//
//  ⚠️  THIS ENDPOINT HAS NO AUTHENTICATION. That was a deliberate decision for
//  local use, and it MUST NOT be deployed in this state. On a public Worker an
//  unauthenticated write endpoint lets anyone overwrite any couple's invitation.
//
//  Turning it on is one line — the check is written below and commented out.
//  Uncomment it, set ADMIN_SECRET, and the editor sends the header.
//
export async function POST(req: Request) {
  // ── ENABLE BEFORE DEPLOYING ────────────────────────────────────────────────
  // if (req.headers.get("x-admin-secret") !== process.env.ADMIN_SECRET) {
  //   return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // }
  // ───────────────────────────────────────────────────────────────────────────

  try {
    const { slug, data, replace } = (await req.json()) as {
      slug: string;
      data: TemplateData;
      /** "I mean to overwrite THIS couple" — set only when the editor was opened
       *  on it. Absent on a fresh invitation, which is the case we must refuse. */
      replace?: boolean;
    };

    const slugError = validateSlug(slug ?? "");
    if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });

    // Refuse a JSON that names a design this build doesn't ship — otherwise the
    // couple's page would 404 at render time rather than here, where we can say why.
    const design = data?.site?.templateSlug;
    if (!design || !isKnownTemplate(design)) {
      return NextResponse.json(
        { error: `unknown template "${design}"` },
        { status: 400 }
      );
    }

    // ── The slug must be free ────────────────────────────────────────────────
    // R2's put() overwrites without a word, so without this a new invitation on a
    // taken slug destroys the live one — silently, irrecoverably, and answering
    // { ok: true }. The editor checks this too, but a client-side check is a
    // courtesy, not a guarantee: this is the guard.
    //
    // `replace` is the one way through, and the editor sends it only for a couple
    // it was actually opened on (/edit?couple=<slug>), or one it just created in
    // this session. Correcting a typo on a live invitation has to keep working —
    // that is the whole point of being able to re-open one.
    if (!replace && (await templateExists("couple", slug))) {
      const existing = await loadTemplate("couple", slug);
      const who = existing ? getCoupleNames(existing.couple) : "another couple";
      return NextResponse.json(
        {
          error: `"${slug}" is already published — it belongs to ${who}. Pick another slug, or open that invitation from the dashboard to edit it.`,
          taken: true,
        },
        { status: 409 }
      );
    }

    // ── This is the moment the invitation changes ────────────────────────────
    // Everything the operator has been doing lived in the draft area. Publishing
    // is what moves it: the staged photographs are copied into the couple's own
    // folder and the paths rewritten to match. Nothing before this line ever put
    // a byte near the live invitation.
    const published = await promoteDraftPhotos(slug, data);
    await saveTemplate("couple", slug, published);

    // The draft has been fully promoted, so it now says nothing the couple's copy
    // doesn't. Keeping it would store every photograph twice and mean nothing.
    // Editing again makes a fresh one.
    await deleteTemplate("draft", slug);

    // Photographs this publish REPLACED are now referenced by nobody. (Best
    // effort: the invitation is already live and correct, so a failure to tidy up
    // must not be reported as a failure to publish. `npm run gc` catches strays.)
    let swept = 0;
    try {
      ({ deleted: swept } = await pruneOrphanPhotos("couple", slug));
    } catch (err) {
      console.error(`publish: could not prune ${slug}`, err);
    }

    // Hand back the rewritten template: the editor's copy still points at
    // /uploads/draft/… paths that no longer exist, and it must not go on editing
    // — or republishing — from those.
    return NextResponse.json({
      ok: true,
      url: `/couple/${slug}`,
      data: published,
      swept,
    });
  } catch {
    return NextResponse.json({ error: "could not publish" }, { status: 500 });
  }
}
