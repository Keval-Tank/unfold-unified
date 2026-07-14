import SmoothScroll from "@/components/SmoothScroll";
import CoverScreen from "@/components/CoverScreen";
import LandscapeOverlay from "@/components/LandscapeOverlay";
import WatermarkOverlay from "@/components/WatermarkOverlay";
import { CoverProvider } from "@/components/CoverContext";
import LoadingScreen from "@/components/LoadingScreen";
import { templateFor } from "@/templates/registry";
import { resolveCover } from "@/templates/covers";
import { getCoupleNames } from "@/lib/derive";
import { assetUrl } from "@/lib/assets";
import type { TemplateData } from "@/lib/template-types";

// ═══════════════════════════════════════════════════════════════════════════
//  The invitation shell — identical for every template.
// ═══════════════════════════════════════════════════════════════════════════
//  Loader → phone frame → cover gate → smooth scroll → the body.
//
//  On the GUEST routes this renders on the server, and it is the boundary that
//  keeps the config out of the browser: it holds the whole TemplateData, and
//  hands the client pieces below only the handful of values they actually draw.
//  Nothing here passes a template object across the boundary — no `included`
//  flags, no `site`, no `seo`, no raw wedding fields.
//
//  The editor's live preview renders this same tree in the BROWSER, where the
//  operator already owns the config. That is why `fontClass` arrives as a prop
//  instead of being read off the registry: resolving it means calling next/font,
//  which only works in server-land. A server component resolves it (see
//  templates/fonts.ts) and hands down the finished class string.

export default function Shell({
  template,
  fontClass,
  children,
}: {
  template: TemplateData;
  /** The template's next/font classes, resolved by a server component. */
  fontClass: string;
  children: React.ReactNode;
}) {
  const slug = template.site.templateSlug;
  const t = templateFor(slug)!; // RenderTemplate already 404s on an unknown design

  const coupleNames = getCoupleNames(template.couple);
  const cover = template.content.cover;

  // The active design's image, picked HERE — so a design the couple isn't using
  // never leaks its image URL into the page.
  const coverImage =
    cover.design === "portrait" && cover.portraitImage
      ? cover.portraitImage
      : cover.classicImage;

  // Resolve the cover DESIGN on the server too. Two-level lookup: the template
  // first, then its design id — both templates ship a design called "classic" and
  // they are completely different components. Doing this here rather than in the
  // client engine means only the ACTIVE cover is bundled, and neither the slug nor
  // the design id has to cross into the browser.
  const CoverDesign = resolveCover(slug, cover.design);

  // The loader's manifest = this design's THEME ART (t.preload, which lives with
  // the template's code) + THIS COUPLE'S OWN PHOTOGRAPHS (from their JSON).
  //
  // The second half matters: the manifest used to hardcode the template's default
  // photos, so a couple who swapped their hero shot had the default preloaded —
  // a picture they never see — while their real one loaded late. Reading them from
  // the JSON here preloads what is actually on their page.
  const c = template.content;
  const couplePhotos = [
    coverImage,
    c.hero.image,
    c.couple.bride.photo,
    c.couple.groom.photo,
    ...c.gallery.photos,
  ].map((path) => assetUrl(slug, path));

  const preload = [...t.preload, ...couplePhotos];

  return (
    // The template's scope. `contents` means this div generates no box, so it
    // cannot disturb <body>'s flex centering of the phone frame — but CSS custom
    // properties and inherited properties (colour, font-family) still cascade
    // from it. That is what carries theme.css and the --ff-* font vars into
    // everything below, without the root layout needing to know the slug.
    <div data-template={slug} className={`${fontClass} contents`}>
      <LandscapeOverlay />
      <WatermarkOverlay />
      <CoverProvider>
        <LoadingScreen
          eyebrow={template.content.loading.eyebrow}
          coupleNames={coupleNames}
          assets={preload}
          {...(t.loading ?? {})}
        >
          <div
            className="relative w-full max-w-lg min-h-svh overflow-hidden shadow-2xl md:shadow-2xl"
            // cqw units throughout the templates resolve against this box.
            style={{ containerType: "inline-size" }}
          >
            <CoverScreen
              CoverDesign={CoverDesign}
              cover={{
                eyebrow: cover.eyebrow,
                button: cover.button,
                coupleNames,
                image: assetUrl(slug, coverImage),
              }}
            >
              <SmoothScroll {...(t.scroll ?? {})}>{children}</SmoothScroll>
            </CoverScreen>
          </div>
        </LoadingScreen>
      </CoverProvider>
    </div>
  );
}
