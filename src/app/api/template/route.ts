import { NextResponse } from "next/server";
import { deleteTemplate, validateSlug, type Section } from "@/lib/store";

// ═══════════════════════════════════════════════════════════════════════════
//  DELETE /api/template?section=draft|couple&slug=<slug>
// ═══════════════════════════════════════════════════════════════════════════
//  Removes a draft or takes a couple's invitation offline. Photographs go too,
//  but only once nothing points at them any more — the rule lives in
//  store.deleteTemplate(), because getting it wrong means a live invitation
//  quietly loses every picture on it.
//
//  `design` is not deletable here. Those are the shipped showcases, seeded from
//  the repo; deleting one over HTTP would break /design/<slug> and /edit's base
//  list for a bucket restore, not a code change.
//
//  ⚠️  UNAUTHENTICATED, like /api/publish and /api/upload — and this one DESTROYS
//  data. On a public Worker, anyone who can reach this URL can take any couple's
//  invitation down. Auth must be on before this app is deployed.
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const section = url.searchParams.get("section") ?? "";
  const slug = url.searchParams.get("slug") ?? "";

  if (section !== "draft" && section !== "couple") {
    return NextResponse.json(
      { error: `cannot delete section "${section}"` },
      { status: 400 }
    );
  }

  const slugError = validateSlug(slug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });

  try {
    const { deletedPhotos } = await deleteTemplate(section as Section, slug);
    return NextResponse.json({ ok: true, deletedPhotos });
  } catch {
    return NextResponse.json({ error: "could not delete" }, { status: 500 });
  }
}
