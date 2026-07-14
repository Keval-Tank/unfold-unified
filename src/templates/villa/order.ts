// Fixed top-to-bottom order of the BODY sections — everything between the intro
// zone (Hero → Couple-on-the-Way → Couple) and the Credits footer. The order is
// fixed: sections are only shown or hidden via their `included` flag in
// template.json, never reordered.
export const BODY_SECTION_ORDER = [
  "saveTheDate",
  "timeline",
  "location",
  "gallery",
  "dressCode",
  "wishes",
  "greetings",
] as const;

// Human-readable labels for the editor's section toggles.
export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  couple: "Couple",
  saveTheDate: "Save the Date",
  timeline: "Timeline",
  location: "Location",
  gallery: "Gallery",
  dressCode: "Dress Code",
  wishes: "Wishes / RSVP",
  greetings: "Greetings",
};
