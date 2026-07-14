// Shape of template.json. Written explicitly (rather than `typeof import`) so the
// editor can freely mutate values (toggle booleans, edit strings, grow arrays)
// without fighting the narrow literal types a JSON import would infer.

export interface Person {
  firstName: string;
  fullName: string;
}
export interface Couple {
  bride: Person;
  groom: Person;
}

export interface Wedding {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  utcOffset: string;
  ceremonyLengthHours: number;
}

export interface Site {
  name: string;
  domain: string;
  templateSlug: string;
  twitter: string;
  instagram: string;
}

export interface Seo {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  ogImageAlt: string;
}

export interface CoverContent {
  eyebrow: string;
  button: string;
  design: string;
  classicImage: string;
  // Optional: only the designs that use it declare it. Villa ships one cover, so
  // its template.json omits this. Keeping the type shared across templates means
  // every per-design key is optional.
  portraitImage?: string;
}
export interface LoadingContent {
  eyebrow: string;
}
export interface HeroContent {
  included: boolean;
  eyebrow: string;
  // Optional: villa's hero has no tagline line, so its template.json omits this.
  tagline?: string;
  image: string;
}
export interface CoupleSide {
  parentLabel: string;
  parents: string;
  instagramUrl: string;
  photo: string;
}
export interface CoupleContent {
  included: boolean;
  // Two stacked lines ("The" / "Groom & Bride") — the second is pulled up tight
  // against the first, so this is an array of lines, not one string.
  headingLines: string[];
  intro: string;
  instagramLabel: string;
  bride: CoupleSide;
  groom: CoupleSide;
}
export interface TimelineEventDate {
  day: number;
  monthShort: string;
}
export interface TimelineEvent {
  name: string;
  time: string;
  period: string;
  description: string;
  date: TimelineEventDate | null;
}
export interface TimelineContent {
  included: boolean;
  title: string;
  events: TimelineEvent[];
}
export interface SaveTheDateContent {
  included: boolean;
  titleLines: string[];
  countdownLabels: string[];
  remindButton: string;
}
export interface LocationContent {
  included: boolean;
  heading: string;
  venueName: string;
  venueAddress: string;
  directionsButton: string;
  directionsUrl: string;
  mapEmbedUrl: string;
  mapLoadingLabel: string;
}
export interface GalleryContent {
  included: boolean;
  heading: string;
  photos: string[];
  youtubeEmbedUrl: string;
  youtubeWatchUrl: string;
  helperText: string;
  youtubeButton: string;
}
export interface DressColor {
  name: string;
  hex: string;
}
export interface DressCodeContent {
  included: boolean;
  titleLines: string[];
  quote: string;
  colors: DressColor[];
}
export interface WishesContent {
  included: boolean;
  heading: string;
  nameLabel: string;
  namePlaceholder: string;
  attendQuestion: string;
  attendYes: string;
  attendNo: string;
  messageLabel: string;
  messagePlaceholder: string;
  sendButton: string;
}
export interface GreetingsContent {
  included: boolean;
  message: string;
  invitesLabel: string;
  inviteeNames: string[];
}

export interface Content {
  cover: CoverContent;
  loading: LoadingContent;
  hero: HeroContent;
  couple: CoupleContent;
  timeline: TimelineContent;
  saveTheDate: SaveTheDateContent;
  location: LocationContent;
  gallery: GalleryContent;
  dressCode: DressCodeContent;
  wishes: WishesContent;
  greetings: GreetingsContent;
}

export interface TemplateData {
  couple: Couple;
  wedding: Wedding;
  site: Site;
  seo: Seo;
  content: Content;
}
