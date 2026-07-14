import type { CoverDesignComponent } from "@/components/covers-types";

import SaffronClassic from "./saffron/covers/ClassicCover";
import SaffronPortrait from "./saffron/covers/PortraitCover";
import VillaClassic from "./villa/covers/ClassicCover";

// ═══════════════════════════════════════════════════════════════════════════
//  Cover designs, keyed by TEMPLATE then by design id.
// ═══════════════════════════════════════════════════════════════════════════
//  This two-level shape is what makes `"design": "classic"` safe in both
//  template.json files. Saffron's ClassicCover and villa's ClassicCover are
//  entirely different components that happen to share a name and an id — a flat
//  registry would let one silently overwrite the other, and villa's JSON would
//  quietly render saffron's cover.
//
//  Resolved on the CLIENT (CoverScreen is a client component and needs the actual
//  component to render with runtime props), so this module deliberately imports
//  ONLY the cover components — never a template's Invitation, which would drag
//  every section into the client bundle.

export const COVER_DESIGNS: Record<string, Record<string, CoverDesignComponent>> = {
  saffron: { classic: SaffronClassic, portrait: SaffronPortrait },
  villa: { classic: VillaClassic },
};

export const DEFAULT_COVER = "classic";

/** Resolve a template's cover design, falling back to its default for unknown ids. */
export function resolveCover(
  templateSlug: string,
  designId: string
): CoverDesignComponent | null {
  const designs = COVER_DESIGNS[templateSlug];
  if (!designs) return null;
  return designs[designId] ?? designs[DEFAULT_COVER] ?? null;
}

/** The design ids a template offers — feeds the editor's Design dropdown. */
export const coverIdsFor = (templateSlug: string): string[] =>
  Object.keys(COVER_DESIGNS[templateSlug] ?? {});
