import { Fragment } from "react";
import Image from "next/image";
import HeroSection from "./sections/HeroSection";
import CoupleSection from "./sections/CoupleSection";
import TimelineSection from "./sections/TimelineSection";
import SaveTheDateSection from "./sections/SaveTheDateSection";
import EventSection from "./sections/EventSection";
import GallerySection from "./sections/GallerySection";
import DressCodeSection from "./sections/DressCodeSection";
import WishesSection from "./sections/WishesSection";
import GreetingsSection from "./sections/GreetingsSection";
import CreditsSection from "./sections/CreditsSection";
import { asset } from "./asset";
import { BODY_SECTION_ORDER } from "./order";
import { eventDate, withoutIncluded } from "@/lib/derive";
import type { InvitationProps } from "../registry";

// ═══════════════════════════════════════════════════════════════════════════
//  The invitation body — a SERVER component.
// ═══════════════════════════════════════════════════════════════════════════
//  This is the ONLY file in the template that sees the whole `content`. Every
//  section below is handed exactly the values it draws, already resolved:
//  image URLs run through asset(), the countdown target is a plain number of
//  milliseconds, the timeline's ordinal suffixes are applied here. The
//  `included` flags decide what renders and stop at this boundary — they never
//  cross into the browser, and neither does the config object.
//
//  The Hero + Couple intro and the Credits footer are pinned; the body sections
//  render in the fixed BODY_SECTION_ORDER.
export default function Invitation({
  content,
  couple,
  coupleNames,
  wedding,
}: InvitationProps) {
  // The "remind me" Google Calendar link, built here so SaveTheDateSection never
  // sees the raw wedding fields (utcOffset / hour / ceremonyLengthHours).
  const calendarUrl =
    `https://www.google.com/calendar/render?action=TEMPLATE` +
    `&dates=${wedding.calendar.start}%2F${wedding.calendar.end}` +
    `&text=${encodeURIComponent(`${coupleNames} Wedding`)}`;

  const BODY_SECTIONS: Record<
    string,
    { node: React.ReactNode; included: boolean; bg?: string }
  > = {
    timeline: {
      node: (
        <TimelineSection
          title={content.timeline.title}
          // The ordinal suffix ("th"/"st"/…) is derived HERE — the section
          // receives finished strings and computes nothing.
          events={content.timeline.events.map((e) => ({
            name: e.name,
            time: e.time,
            period: e.period,
            description: e.description,
            date: e.date ? eventDate(e.date.day, e.date.monthShort) : null,
          }))}
        />
      ),
      included: content.timeline.included,
    },
    saveTheDate: {
      node: (
        <SaveTheDateSection
          titleLines={content.saveTheDate.titleLines}
          countdownLabels={content.saveTheDate.countdownLabels}
          remindButton={content.saveTheDate.remindButton}
          // A NUMBER, not a Date: the countdown's only input is an instant, and
          // a number survives the server→client boundary without a serializer.
          targetMs={wedding.date.getTime()}
          calendarUrl={calendarUrl}
          dateLine={{
            weekday: wedding.weekday,
            day: wedding.day,
            ordinalSuffix: wedding.ordinalSuffix,
            monthName: wedding.monthName,
            year: wedding.year,
          }}
        />
      ),
      included: content.saveTheDate.included,
    },
    location: {
      node: <EventSection content={withoutIncluded(content.location)} />,
      included: content.location.included,
    },
    gallery: {
      node: (
        <GallerySection
          content={{
            heading: content.gallery.heading,
            youtubeEmbedUrl: content.gallery.youtubeEmbedUrl,
            youtubeWatchUrl: content.gallery.youtubeWatchUrl,
            helperText: content.gallery.helperText,
            youtubeButton: content.gallery.youtubeButton,
          }}
          photos={content.gallery.photos.map((p) => asset(p))}
        />
      ),
      included: content.gallery.included,
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
      {/* Hero + Couple transition zone — wrapper provides the scroll context
          for the sticky hero. Hero (z-10, sticky) stays pinned to viewport
          top while the Couple wrapper (z-30) scrolls up over it. */}
      <div className="relative">
        {content.hero.included && (
          <HeroSection
            eyebrow={content.hero.eyebrow}
            tagline={content.hero.tagline}
            image={asset(content.hero.image)}
            brideFirstName={couple.bride.firstName}
            groomFirstName={couple.groom.firstName}
          />
        )}

        {content.couple.included && (
          <div id="couple-overlay-target" className="relative z-30">
            <CoupleSection
              content={withoutIncluded(content.couple)}
              brideFullName={couple.bride.fullName}
              groomFullName={couple.groom.fullName}
              bridePhoto={asset(content.couple.bride.photo)}
              groomPhoto={asset(content.couple.groom.photo)}
            />
            {/* Divider sits at the seam between Couple and Timeline. */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 z-30"
              style={{ transform: "translateY(30%)" }}
            >
              <Image
                src={asset("/images/divider-scallop.webp")}
                alt=""
                width={4320}
                height={1452}
                className="block w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Body sections, in the fixed BODY_SECTION_ORDER. */}
      {groups.map((group, i) => {
        const inner = group.keys.map((key) => (
          <Fragment key={key}>{BODY_SECTIONS[key].node}</Fragment>
        ));
        // Sections marked bg:"paper" share one continuous paper backdrop.
        return group.bg === "paper" ? (
          <div
            key={i}
            className="bg-cover bg-center"
            style={{ backgroundImage: `url('${asset("/images/paper-bg.webp")}')` }}
          >
            {inner}
          </div>
        ) : (
          <Fragment key={i}>{inner}</Fragment>
        );
      })}

      <CreditsSection />
    </main>
  );
}
