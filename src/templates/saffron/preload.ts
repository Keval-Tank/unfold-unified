import { asset } from "./asset";
import { sharedUrl } from "@/lib/assets";

// SAFFRON — the loader's preload manifest.
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
      // Cover (entry — kept from existing assets)
      // Page bg (used across non-themed sections)
      asset("/images/paper-bg.webp"),
      // Hero
      asset("/images/hero-arch.webp"),
      asset("/images/marigold-stem.webp"),
      // Couple
      asset("/images/couple-oval-frame.webp"),
      asset("/images/couple-floral-wreath.webp"),
      asset("/images/divider-gold-kundan.webp"),
      asset("/images/divider-scallop.webp"),
      // Greetings + Couple
      asset("/images/watercolor-landscape.webp"),
      asset("/images/floral-side-garland.webp"),
      // Timeline
      sharedUrl("/timeline-water-bg.webp"),
      sharedUrl("/lotus-group.webp"),
      asset("/images/divider-scallop-2.webp"),
      // SaveTheDate
      asset("/images/scroll-parchment.webp"),
      // Event
      asset("/images/event-temple-wall.webp"),
      // Gallery
      asset("/images/floral-corner-spray.webp"),
      asset("/images/rsvp-bg.webp"),
      asset("/images/rsvp-pavilion.webp"),
      // Wishes
      asset("/images/cloudy-paper-bg.webp"),
];
