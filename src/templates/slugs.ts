// The templates this build ships, as plain strings.
//
// Deliberately separate from registry.ts: that module pulls in each template's
// fonts.ts, and `next/font` can only be evaluated in a component module — importing
// it from a route handler blows up at build time. Anything that just needs to know
// WHICH templates exist (the publish endpoint validating a JSON, for instance)
// imports this instead.
//
// registry.ts type-checks its own keys against this list, so the two cannot drift.
export const TEMPLATE_SLUGS = ["saffron", "villa"] as const;

export type TemplateSlug = (typeof TEMPLATE_SLUGS)[number];

export const isKnownTemplate = (slug: string): slug is TemplateSlug =>
  (TEMPLATE_SLUGS as readonly string[]).includes(slug);
