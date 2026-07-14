import { Fragment } from "react";
import HeroSection from "./sections/HeroSection";
import CoupleOnTheWaySection from "./sections/CoupleOnTheWaySection";
import CoupleSection from "./sections/CoupleSection";
import SaveTheDateSection from "./sections/SaveTheDateSection";
import TimelineSection from "./sections/TimelineSection";
import EventSection from "./sections/EventSection";
import GallerySection from "./sections/GallerySection";
import DressCodeSection from "./sections/DressCodeSection";
import WishesSection from "./sections/WishesSection";
import GreetingsSection from "./sections/GreetingsSection";
import CreditsSection from "./sections/CreditsSection";
import { BODY_SECTION_ORDER } from "./order";
import { asset } from "./asset";
import { eventDate, withoutIncluded } from "@/lib/derive";
import type { InvitationProps } from "@/templates/registry";

// ═══════════════════════════════════════════════════════════════════════════
//  The invitation body — a SERVER component.
// ═══════════════════════════════════════════════════════════════════════════
//  This is the ONLY file in the template that sees the whole `content`. It is the
//  boundary: the `included` flags, the raw photo paths and the wedding instant are
//  all consumed HERE, and each section is handed nothing but the values it draws.
//  Nothing below this line ships the config to the browser.
//
//  The intro zone (Hero → Couple-on-the-Way → Couple) and the Credits footer are
//  fixed; the body sections render in the fixed BODY_SECTION_ORDER, filtered by
//  their `included` flag.
export default function Invitation({
  content,
  couple,
  coupleNames,
  wedding,
}: InvitationProps) {
  // ── Values derived once, on the server ──────────────────────────────────────
  // The countdown target as a plain NUMBER, so the raw wedding fields (utcOffset,
  // hour, ceremonyLengthHours…) never travel to the client.
  const targetMs = wedding.date.getTime();
  // The "Remind me" link — built here so SaveTheDate never sees the calendar
  // window or the couple's names, only a finished URL.
  const calendarUrl =
    `https://www.google.com/calendar/render?action=TEMPLATE` +
    `&dates=${wedding.calendar.start}%2F${wedding.calendar.end}` +
    `&text=${encodeURIComponent(`${coupleNames} Wedding`)}`;
  // The one date line that section prints.
  const dateLine = {
    weekday: wedding.weekday,
    day: wedding.day,
    ordinalSuffix: wedding.ordinalSuffix,
    monthName: wedding.monthName,
    year: wedding.year,
  };
  // The timeline's ordinal suffixes ("12th") are applied here; the section itself
  // derives nothing.
  const timelineEvents = content.timeline.events.map((e) => ({
    name: e.name,
    time: e.time,
    period: e.period,
    description: e.description,
    date: e.date ? eventDate(e.date.day, e.date.monthShort) : null,
  }));
  // The gallery's photo paths are template-relative in the JSON; they are
  // namespaced into finished URLs here, so the carousel never sees a raw path.
  // Splitting them off `content.gallery` also keeps the raw list — and the
  // server-only `included` flag — out of the props that cross into the browser.
  const {
    photos: galleryPhotoPaths,
    included: galleryIncluded,
    ...galleryContent
  } = content.gallery;
  const galleryPhotos = galleryPhotoPaths.map((p) => asset(p));

  const BODY_SECTIONS: Record<
    string,
    { node: React.ReactNode; included: boolean; bg?: string }
  > = {
    saveTheDate: {
      node: (
        <SaveTheDateSection
          titleLines={content.saveTheDate.titleLines}
          countdownLabels={content.saveTheDate.countdownLabels}
          remindButton={content.saveTheDate.remindButton}
          targetMs={targetMs}
          calendarUrl={calendarUrl}
          dateLine={dateLine}
        />
      ),
      included: content.saveTheDate.included,
    },
    timeline: {
      node: (
        <TimelineSection title={content.timeline.title} events={timelineEvents} />
      ),
      included: content.timeline.included,
    },
    location: {
      node: <EventSection content={withoutIncluded(content.location)} />,
      included: content.location.included,
    },
    gallery: {
      node: <GallerySection content={galleryContent} photos={galleryPhotos} />,
      included: galleryIncluded,
      bg: "paper",
    },
    dressCode: {
      node: <DressCodeSection content={content.dressCode} />,
      included: content.dressCode.included,
      bg: "paper",
    },
    wishes: {
      node: <WishesSection content={withoutIncluded(content.wishes)} />,
      included: content.wishes.included,
    },
    greetings: {
      node: (
        <GreetingsSection
          content={content.greetings}
          coupleNames={coupleNames}
          brideFirstName={couple.bride.firstName}
          groomFirstName={couple.groom.firstName}
        />
      ),
      included: content.greetings.included,
    },
  };

  // Keep the fixed-order sections that are both known and included, then merge
  // neighbours sharing a background so the texture never seams.
  const visible = BODY_SECTION_ORDER.filter(
    (key) => key in BODY_SECTIONS && BODY_SECTIONS[key].included
  );
  const groups: { bg?: string; keys: string[] }[] = [];
  for (const key of visible) {
    const bg = BODY_SECTIONS[key].bg;
    const last = groups[groups.length - 1];
    if (bg && last && last.bg === bg) last.keys.push(key);
    else groups.push({ bg, keys: [key] });
  }

  return (
    <main className="w-full">
      {/* Intro zone — this wrapper is the scroll context for the sticky hero and
          the pinned Couple-on-the-Way. Couple-on-the-Way is part of the design
          itself (no include flag): it always renders. */}
      <div className="relative">
        {content.hero.included && (
          <HeroSection
            eyebrow={content.hero.eyebrow}
            image={asset(content.hero.image)}
            brideFirstName={couple.bride.firstName}
            groomFirstName={couple.groom.firstName}
          />
        )}

        <CoupleOnTheWaySection />

        {content.couple.included && (
          // z-30 lifts the Couple block over the pinned Couple-on-the-Way (z-20)
          // behind it, which is pinned with pinSpacing:false and so is scrolled
          // OVER rather than pushed down.
          <div id="couple-overlay-target" className="relative z-30">
            {/* Damask wallpaper backdrop. The Couple section is transparent and
                relies entirely on this wrapper for its background. */}
            <div
              className="bg-contain bg-repeat"
              style={{ backgroundImage: `url('${asset("/images/eu-damask.webp")}')` }}
            >
              <CoupleSection
                content={withoutIncluded(content.couple)}
                brideFullName={couple.bride.fullName}
                groomFullName={couple.groom.fullName}
                bridePhoto={asset(content.couple.bride.photo)}
                groomPhoto={asset(content.couple.groom.photo)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Body sections, in the fixed BODY_SECTION_ORDER. Also z-30 so they clear
          the pinned Couple-on-the-Way (z-20) even when the Couple section — the
          block that used to provide that lift — is excluded. */}
      <div className="relative z-30">
        {groups.map((group, i) => {
          const inner = group.keys.map((key) => (
            <Fragment key={key}>{BODY_SECTIONS[key].node}</Fragment>
          ));
          // Sections marked bg:"paper" share one continuous paper backdrop, so
          // the texture doesn't seam at the boundary between them.
          return group.bg === "paper" ? (
            <div
              key={i}
              className="bg-cover bg-center"
              style={{ backgroundImage: `url('${asset("/images/eu-paper.webp")}')` }}
            >
              {inner}
            </div>
          ) : (
            <Fragment key={i}>{inner}</Fragment>
          );
        })}
      </div>

      <CreditsSection />
    </main>
  );
}
