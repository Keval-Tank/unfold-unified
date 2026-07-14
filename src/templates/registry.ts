import type { ComponentType } from "react";
import type { TemplateSlug } from "./slugs";
import type { Content, Couple } from "@/lib/template-types";
import type { weddingInfo } from "@/lib/derive";

import SaffronInvitation from "./saffron/Invitation";
import { PRELOAD as saffronPreload } from "./saffron/preload";

import VillaInvitation from "./villa/Invitation";
import { PRELOAD as villaPreload } from "./villa/preload";

// ═══════════════════════════════════════════════════════════════════════════
//  The template registry — one entry per design.
// ═══════════════════════════════════════════════════════════════════════════
//  A template.json names its design in `site.templateSlug`; that string is the
//  key here. The JSON supplies the CONTENT; this registry supplies the LOOK.
//  Adding a template is: drop a folder in src/templates/, add one entry.
//
//  Deliberately FONT-FREE — the font classes live in templates/fonts.ts. This
//  module has to be reachable from the BROWSER, because the editor's live
//  preview renders these very Invitation components client-side. Import a
//  template's fonts.ts from here and next/font is chained to every section,
//  which breaks that. (It broke the publish route once already, the same way.)

/** What a template's Invitation body receives. */
export type InvitationProps = {
  content: Content;
  couple: Couple;
  coupleNames: string;
  wedding: ReturnType<typeof weddingInfo>;
};

export type TemplateManifest = {
  Invitation: ComponentType<InvitationProps>;
  /** The loader is ENGINE. A template supplies only its art list, plus the one
   *  visual knob the two designs actually differ on (the eyebrow's size/opacity). */
  preload: string[];
  loading?: { eyebrowClassName?: string; eyebrowColor?: string };
  /** Lenis feel. The scroll engine is shared; only these two numbers differ. */
  scroll?: { wheelMultiplier?: number; touchMultiplier?: number };
};

// Typed by TemplateSlug so registry.ts and slugs.ts cannot drift apart: adding a
// template to one without the other is a compile error.
export const TEMPLATES: Record<TemplateSlug, TemplateManifest> = {
  saffron: {
    Invitation: SaffronInvitation,
    preload: saffronPreload,
    // saffron uses SmoothScroll's defaults (1.7 / 0.8)
  },
  villa: {
    Invitation: VillaInvitation,
    preload: villaPreload,
    loading: { eyebrowClassName: "text-sm", eyebrowColor: "rgba(255, 255, 255, 0.8)" },
    scroll: { wheelMultiplier: 1.2, touchMultiplier: 0.7 },
  },
};

/** Look up a template by an untrusted slug (from a JSON). Undefined if we don't ship it. */
export const templateFor = (slug: string): TemplateManifest | undefined =>
  (TEMPLATES as Record<string, TemplateManifest>)[slug];
