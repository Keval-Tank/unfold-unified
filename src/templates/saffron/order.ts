// Fixed top-to-bottom order of the BODY sections (between the pinned Hero+Couple
// intro and the Credits footer). The order is fixed — sections are only shown or
// hidden via their `included` flag, not reordered.
export const BODY_SECTION_ORDER = [
  "timeline",
  "saveTheDate",
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
  timeline: "Timeline",
  saveTheDate: "Save the Date",
  location: "Location",
  gallery: "Gallery",
  dressCode: "Dress Code",
  wishes: "Wishes / RSVP",
  greetings: "Greetings",
};
