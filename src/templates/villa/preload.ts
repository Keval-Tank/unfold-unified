import { asset } from "./asset";
import { sharedUrl } from "@/lib/assets";

// VILLA — the loader's preload manifest.
//
// THEME ART ONLY — the decorative images this design is built from. They live
// here, beside the sections that use them, because they are part of the CODE: a
// designer adding an image to a section adds it here in the same commit. They are
// not a choice a couple makes, and they have no business in a couple's config.
//
// The couple's OWN photographs (cover, hero, portraits, gallery) are NOT listed
// here. Those come from template.json and are appended by Shell.tsx at request
// time — so we preload the photo the couple actually chose, not the default they
// replaced.
//
// The loader itself (preload race, progress bar, 10s timeout, audio probe, the
// hand-off to the cover) is engine — src/components/LoadingScreen.tsx.
export const PRELOAD: string[] = [
      // Cover (entry)
      sharedUrl("/flourish-divider.svg"),
      // Hero
      asset("/images/eu-sky.webp"),
      asset("/images/eu-arch.webp"),
      // CoupleOnTheWay
      asset("/images/eu-stones-text.webp"),
      asset("/images/eu-floral-header.webp"),
      asset("/images/eu-corner-roses.webp"),
      // Couple + SaveTheDate (shared damask wrapper) + wreath portrait frames
      asset("/images/eu-damask.webp"),
      asset("/images/eu-wreath.webp"),
      // SaveTheDate
      asset("/images/eu-meadow.webp"),
      asset("/images/eu-brick-band.webp"),
      asset("/images/wall-2.webp"),
      // Timeline
      sharedUrl("/timeline-water-bg.webp"),
      sharedUrl("/lotus-group.webp"),
      asset("/images/eu-fountain.webp"),
      // Event + Wishes (also shares eu-paper with the Gallery+DressCode wrapper)
      asset("/images/eu-paper.webp"),
      asset("/images/eu-floral-stem.webp"),
      asset("/images/vintage-divider.svg"),
      // Gallery
      asset("/images/eu-floral-corner.webp"),
      // Greetings
      asset("/images/eu-villa.webp"),
      // Credits logo
      sharedUrl("/unfold-logo-white.svg"),
      // couple images
];
