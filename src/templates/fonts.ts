import { fontClass as saffronFontClass } from "./saffron/fonts";
import { fontClass as villaFontClass } from "./villa/fonts";
import type { TemplateSlug } from "./slugs";

// ═══════════════════════════════════════════════════════════════════════════
//  The typefaces, kept OUT of the component registry — on purpose.
// ═══════════════════════════════════════════════════════════════════════════
//  Each template's fonts.ts calls `next/font`, which is a build-time transform
//  that only survives in a *server component* module graph. registry.ts used to
//  import these, which chained every consumer of the registry to next/font —
//  that is precisely how the publish route blew up at build time once already.
//
//  Now the registry holds components and the manifest; this holds the font
//  classes. The split matters more than it looks: the invitation tree can be
//  rendered in the BROWSER (that is what makes the editor's preview live), and
//  it could not be if reaching a section meant dragging next/font along with it.
//
//  So: only SERVER components import this file. They resolve the class here and
//  hand it down as a plain string — see Shell's `fontClass` prop.

export const FONT_CLASSES: Record<TemplateSlug, string> = {
  saffron: saffronFontClass,
  villa: villaFontClass,
};

/** The font class for an untrusted slug (one that came out of a JSON). */
export const fontClassFor = (slug: string): string =>
  (FONT_CLASSES as Record<string, string>)[slug] ?? "";
