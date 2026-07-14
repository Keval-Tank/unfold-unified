// ═══════════════════════════════════════════════════════════════════════════
//  Pure derivations over the raw data in template.json.
// ═══════════════════════════════════════════════════════════════════════════
//
//  These helpers hold NO data and import NO content — each takes a slice of the
//  template.json data as an argument and returns a computed value. The editable
//  content lives in template.json (project root); consumers import that JSON
//  directly and pass the relevant piece through the function they need.
//
//  What can't live in JSON lives here: the wedding Date + timezone-safe display
//  strings, the base-path-prefixed SEO, and the JSON-LD graph.

import { assetUrl } from "@/lib/assets";

// ── The couple ───────────────────────────────────────────────────────────────
type Person = { firstName: string; fullName: string };
export type CoupleData = { bride: Person; groom: Person };

// Combined display strings — derived so they can never drift out of sync.
// Order convention (matches the design): bride first, groom second.
export const getCoupleNames = (couple: CoupleData) =>
  `${couple.bride.firstName} & ${couple.groom.firstName}`;
export const getCoupleFullNames = (couple: CoupleData) =>
  `${couple.bride.fullName} & ${couple.groom.fullName}`;

// ── The wedding date (from ONE canonical set of fields) ──────────────────────
export type WeddingData = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 24-hour, venue local time
  minute: number;
  utcOffset: string; // e.g. "+05:30" (IST)
  ceremonyLengthHours: number; // duration written into the calendar event
};

const pad = (n: number) => String(n).padStart(2, "0");

const ordinalSuffixOf = (d: number) => {
  if (d >= 11 && d <= 13) return "th";
  switch (d % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

// Compact UTC timestamp for Google Calendar: "YYYYMMDDTHHMMSSZ".
const calStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Everything the page needs about the wedding date, all derived from the six
// canonical fields so the countdown, date lines, and calendar link stay in sync.
export function weddingInfo(w: WeddingData) {
  // Absolute ceremony instant, built from the explicit UTC offset so it is
  // deterministic regardless of the machine's local timezone.
  const instant = new Date(
    `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}:00${w.utcOffset}`
  );

  // Weekday / month names are formatted from a UTC calendar date so the wording
  // ("Sunday", "December") never shifts with the build machine's timezone.
  const calUTC = new Date(Date.UTC(w.year, w.month - 1, w.day));
  const weekday = calUTC.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const monthName = calUTC.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const monthShort = calUTC.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

  return {
    date: instant, // live countdown target
    weekday, // "Sunday"
    day: w.day, // 28
    ordinalSuffix: ordinalSuffixOf(w.day), // "th"
    monthName, // "December"
    monthShort, // "Dec"
    year: w.year,
    // "Sunday, 28 December 2026" — used by the Hero line and the page metadata.
    longDisplay: `${weekday}, ${w.day} ${monthName} ${w.year}`,
    // Google Calendar event window (compact UTC stamps).
    calendar: {
      start: calStamp(instant),
      end: calStamp(new Date(instant.getTime() + w.ceremonyLengthHours * 3_600_000)),
    },
  };
}

// Per-event timeline date block (shown to the LEFT of the event's dot). Provide
// the day + short month; the ordinal suffix ("th"/"st"/"nd"/"rd") is derived.
export const eventDate = (day: number, monthShort: string) => ({
  day,
  ordinalSuffix: ordinalSuffixOf(day),
  monthShort,
});

// ── Showcase SEO + JSON-LD (schema.org) ──────────────────────────────────────
export type SiteData = {
  name: string;
  domain: string;
  templateSlug: string;
  twitter: string;
  instagram: string;
};
export type SeoData = {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string; // raw public path, e.g. "/og/saffron.jpg"
  ogImageAlt: string;
};

// Adds the derived showcase URL and the resolved og:image. assetUrl() namespaces
// the path into this template's asset folder (and applies the base path), so the
// og:image resolves to the deployed file.
export function buildSeo(site: SiteData, seo: SeoData) {
  return {
    ...seo,
    url: `${site.domain}/design/${site.templateSlug}`,
    ogImage: assetUrl(site.templateSlug, seo.ogImage),
  };
}

// Organization (the brand) + Product (this template) + BreadcrumbList.
//
// Nothing here is template-specific: the Product name is the headline half of
// seo.title (everything before the " | Unfold Invite" suffix) and the breadcrumb
// leaf is the slug, title-cased. That is what makes this file shareable verbatim
// across every template — it used to hardcode "Saffron — …".
export function buildJsonLd(site: SiteData, seo: ReturnType<typeof buildSeo>) {
  const templateUrl = `${site.domain}/design/${site.templateSlug}`;
  const productName = seo.title.split(" | ")[0];
  const templateName =
    site.templateSlug.charAt(0).toUpperCase() + site.templateSlug.slice(1);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.domain}/#organization`,
        name: site.name,
        url: site.domain,
        logo: `${site.domain}/logo.png`, // PLACEHOLDER asset
        description:
          "Luxury wedding invitation websites crafted by designers. For every celebration.",
        sameAs: [site.instagram],
      },
      {
        "@type": "Product",
        name: productName,
        description: seo.description,
        category: "Weddings",
        url: templateUrl,
        image: `${site.domain}${seo.ogImage}`,
        brand: { "@id": `${site.domain}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.domain },
          { "@type": "ListItem", position: 2, name: "Design", item: `${site.domain}/design` },
          { "@type": "ListItem", position: 3, name: templateName, item: templateUrl },
        ],
      },
    ],
  };
}

// ── Which fields hold a photograph ───────────────────────────────────────────
// Stated ONCE, because two things depend on getting it exactly right: promoting a
// draft's photos on publish, and deleting the ones nothing references any more.
// Miss a field here and the collector treats a photo that IS on the page as
// garbage — so this list is the single point of truth, and anything that walks a
// template's images goes through it.
//
// BOTH cover images, not just the active one: the design a couple isn't currently
// using still holds their photograph, and it comes straight back if they switch.
type PhotoBearingContent = {
  cover: { classicImage: string; portraitImage?: string };
  hero: { image: string };
  couple: { bride: { photo: string }; groom: { photo: string } };
  gallery: { photos: string[] };
};

export function referencedPhotoPaths(content: PhotoBearingContent): string[] {
  return [
    content.cover.classicImage,
    content.cover.portraitImage,
    content.hero.image,
    content.couple.bride.photo,
    content.couple.groom.photo,
    ...content.gallery.photos,
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
}

// ── Keep the include flags on the server ─────────────────────────────────────
// A section's `included` flag is a decision the SERVER makes: an excluded section
// simply isn't rendered. The browser has no use for the flag, and shipping it
// would tell a visitor which sections exist but were switched off. Strip it from
// any slice that crosses into a client component.
export function withoutIncluded<T extends { included: boolean }>(o: T): Omit<T, "included"> {
  const { included, ...rest } = o;
  void included;
  return rest;
}
