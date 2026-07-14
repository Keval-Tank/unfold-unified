"use client";

import { useEffect, useState, Fragment } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import Image from "next/image";
import Pressable from "@/components/Pressable";
import { asset } from "../asset";
import { sharedUrl } from "@/lib/assets";

// Takes the target instant as an argument (rather than closing over an imported
// one) so the countdown re-targets when the wedding date is edited live.
function calculateTimeLeft(targetMs: number) {
  const diff = targetMs - Date.now();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

// A CLIENT component: it runs a live 1s countdown. It receives the target as a
// plain NUMBER of epoch-milliseconds — never a Date, and never the raw wedding
// fields (utcOffset / hour / minute / ceremonyLengthHours). Those are consumed on
// the server, which also pre-builds the calendar URL and the date line, so none
// of the wedding config crosses into the browser.
export default function SaveTheDateSection({
  titleLines,
  countdownLabels,
  remindButton,
  targetMs,
  calendarUrl,
  dateLine,
}: {
  titleLines: string[];
  countdownLabels: string[];
  remindButton: string;
  targetMs: number;
  calendarUrl: string;
  dateLine: {
    weekday: string;
    day: number;
    ordinalSuffix: string;
    monthName: string;
    year: number;
  };
}) {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calculateTimeLeft> | null>(null);

  // Keyed on the target's timestamp — a primitive, so the interval restarts only
  // when the wedding instant itself actually moves.
  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetMs));
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetMs));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetMs]);

  const t = timeLeft ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const units = [
    { label: countdownLabels[0], value: t.days },
    { label: countdownLabels[1], value: t.hours },
    { label: countdownLabels[2], value: t.minutes },
    { label: countdownLabels[3], value: t.seconds },
  ];

  const dividerStyle = {
    width: "clamp(10rem, 90cqw, 15rem)",
    aspectRatio: "2598 / 312", // match the SVG's viewBox
    backgroundColor: "var(--color-hero-gold)", // ← change color here
    WebkitMaskImage: `url('${sharedUrl("/flourish-divider.svg")}')`,
    maskImage: `url('${sharedUrl("/flourish-divider.svg")}')`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };

  return (
    <section
      className="relative flex aspect-768/2533 w-full flex-col items-center justify-center overflow-y-visible px-6 pt-24 pb-12 text-center"
      style={{
        // Two layers, top-most first: the iron-brick wall over the damask
        // wallpaper. The wall image has transparent regions (notably around the
        // grille at the top), and the damask behind it is what shows through
        // them. This section used to inherit that damask from a shared parent
        // wrapper it sat in alongside the Couple section; now that it stands
        // alone (so it can be included/excluded on its own) it carries its own.
        backgroundImage: `url('${asset("/images/wall-2.webp")}'), url('${asset(
          "/images/eu-damask.webp"
        )}')`,
        backgroundSize: "100% 100%, contain",
        backgroundRepeat: "no-repeat, repeat",
        backgroundPosition: "center, center",
      }}
    >
            {/* Title + countdown — in normal flex flow (no absolute positioning, no parchment wrapper) so they take their natural height and don't overflow into siblings */}
      <div className="shrink-0">
        <div
          className="flex flex-col items-center"
          style={{ gap: "clamp(1rem, 5cqw, 1.5rem)", paddingTop: "clamp(0.25rem, 55cqw, 50rem)", paddingBottom: "clamp(0.25rem, 1cqw, 0.5rem)" }}
        >

          <ScrollReveal animation="fadeInUp" delay={0.1} duration={0.7} className="mt-50">
            <h2
              className="font-heading leading-none uppercase italic font-semibold"
              style={{
                color: "var(--color-primary-dark)",
                fontSize: "clamp(3rem, 9cqw, 3.5rem)",
              }}
            >
              {titleLines.map((line, i) => (
                <Fragment key={i}>
                  {i > 1 && <br /> || " "}
                  {line}
                </Fragment>
              ))}
            </h2>
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={0.25} duration={0.7} className="shrink-0 mb-10">
            {/* Date framed top & bottom by the flourish divider, in normal
                flow so the two lines always hug the date on every screen
                (replaces the old absolute top-105 / top-135 that drifted). */}
            <div

              className="flex flex-col items-center"
              style={{ gap: "clamp(0.5rem, 3cqw, 1rem)" }}
            >
              <div role="img" aria-label="Divider" style={dividerStyle} />
              <p
                className="tracking-wider uppercase font-body"
                style={{
                  color: "var(--color-primary-dark)",
                  fontSize: "clamp(1rem, 4cqw, 2.5rem)",
                }}
              >
                <span className="font-semibold">{dateLine.weekday}</span>,
                <br />
                {dateLine.day}
                <sup>{dateLine.ordinalSuffix}</sup>, {dateLine.monthName} {dateLine.year}
              </p>
              <div
                role="img"
                aria-label="Divider"
                style={{ ...dividerStyle, scale: "-1" }}
              />
            </div>
          </ScrollReveal>

          {/* Countdown */}
          <div
            className="flex items-center justify-center"
          // style={{ gap: "clamp(0.65rem, 3.2cqw, 1rem)" }}
          >
            {/* Left column: Days & Minutes */}
            <div
              className="flex flex-row items-center"
            // style={{ gap: "clamp(0.5rem, 2.5cqw, 0.75rem)" }}
            >
              {units.map((unit, i) => (
                <ScrollReveal
                  key={unit.label}
                  animation="fadeInUp"
                  delay={0.4 + i * 0.12}
                  duration={0.6}
                >
                  <div
                    className={`flex flex-col items-center px-5  h-fit ${i !== units.length - 1 ? 'border-r' : ''}`}
                    style={{ borderColor: "var(--color-hero-gold)" }}
                  >
                    <span
                      className="font-numeric leading-none"
                      style={{
                        color: "var(--color-primary-dark)",
                        fontSize: "clamp(2.25rem, 9cqw, 3rem)",
                      }}
                    >
                      {unit.value}
                    </span>
                    <span
                      className="tracking-wider font-numeric uppercase"
                      style={{
                        color: "var(--color-text-light)",
                        marginTop: "clamp(0.15rem, 0.8cqw, 0.25rem)",
                        fontSize: "clamp(0.55rem, 2.6cqw, 0.7rem)",
                      }}
                    >
                      {unit.label}
                    </span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Remind Me button */}
      <ScrollReveal animation="fadeInUp" delay={0.95} duration={0.7} className="shrink-0 mt-10">
        <Pressable
          as="a"
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-full border tracking-wider uppercase hover:bg-white/40 font-manrope"
          style={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
            marginTop: "clamp(0.65rem, 3.2cqw, 1rem)",
            fontSize: "clamp(0.6rem, 3cqw, 0.75rem)",
            paddingLeft: "clamp(1rem, 5cqw, 1.5rem)",
            paddingRight: "clamp(1rem, 5cqw, 1.5rem)",
            paddingTop: "clamp(0.35rem, 1.8cqw, 0.5rem)",
            paddingBottom: "clamp(0.35rem, 1.8cqw, 0.5rem)",
          }}
        >
          {remindButton}
        </Pressable>
      </ScrollReveal>

      {/* Bottom stack — meadow above, brick band below. Absolute-pinned to
          the bottom edge so the pair stays stuck regardless of section content. */}
      <div className="pointer-events-none absolute -bottom-10 left-0 right-0 z-10 ">
        <Image
          src={asset("/images/eu-meadow.webp")}
          alt=""
          width={768}
          height={396}
          className="block w-full -mb-px"
        />
        <Image
          src={asset("/images/eu-brick-band.webp")}
          alt=""
          width={768}
          height={119}
          className="block w-full -mt-5"
        />
      </div>
    </section>
  );
}
