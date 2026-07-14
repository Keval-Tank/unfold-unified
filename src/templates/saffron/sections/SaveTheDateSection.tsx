"use client";

import { Fragment, useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import Pressable from "@/components/Pressable";
import Image from "next/image";
import { asset } from "../asset";
import { sharedUrl } from "@/lib/assets";

// The countdown's only input is an INSTANT — a plain number of epoch milliseconds,
// computed once on the server. The timezone fields it was derived from (utcOffset,
// hour, ceremonyLengthHours…) never reach the browser, and neither does a Date
// object that would have to be re-serialized across the boundary.
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

// CLIENT: the countdown ticks once a second in a setInterval.
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
  /** Epoch ms of the ceremony — the countdown target. */
  targetMs: number;
  /** Prebuilt "add to Google Calendar" URL. */
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

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetMs));
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetMs));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetMs]);

  const t = timeLeft ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const labels = countdownLabels;
  const units = [
    { label: labels[0], value: t.days },
    { label: labels[1], value: t.hours },
    { label: labels[2], value: t.minutes },
    { label: labels[3], value: t.seconds },
  ];

  // Shared flourish-divider style (gold SVG mask). Rendered in normal flow
  // directly above and below the date so the two lines always frame it,
  // regardless of viewport height.
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
      className="relative flex h-[130svh] w-full flex-col items-center justify-center overflow-hidden px-6 pt-50 pb-12 text-center bg-cover bg-center"
      style={{ backgroundImage: `url('${asset("/images/paper-bg.webp")}')` }}
    >

      {/* Title + countdown — in normal flex flow (no absolute positioning, no parchment wrapper) so they take their natural height and don't overflow into siblings */}
      <div className="shrink-0">
        <div
          className="flex flex-col items-center"
          style={{ gap: "clamp(1rem, 5cqw, 1.5rem)", paddingTop: "clamp(0.25rem, 1cqw, 0.4rem)", paddingBottom: "clamp(0.25rem, 1cqw, 0.5rem)" }}
        >

          <ScrollReveal animation="fadeInUp" delay={0.1} duration={0.7} className="mb-10 -mt-50">
            <h2
              className="font-heading leading-none uppercase"
              style={{
                color: "var(--color-primary-dark)",
                fontSize: "clamp(3rem, 9cqw, 3.5rem)",
              }}
            >
              {titleLines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
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
              style={{ gap: "clamp(0.5rem, 3cqw, 0.9rem)" }}
            >
              <div role="img" aria-label="Divider" style={dividerStyle} />
              <p
                className="tracking-wider uppercase font-montserrat"
                style={{
                  color: "var(--color-primary-dark)",
                  fontSize: "clamp(1rem, 3.5cqw, 0.875rem)",
                }}
              >
                {dateLine.weekday},
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
                      className="font-montserrat leading-none"
                      style={{
                        color: "var(--color-primary-dark)",
                        fontSize: "clamp(2.25rem, 9cqw, 3rem)",
                      }}
                    >
                      {unit.value}
                    </span>
                    <span
                      className="tracking-wider font-montserrat uppercase"
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
          className="inline-block rounded-full border tracking-wider uppercase hover:bg-white/40 font-montserrat"
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

      {/* Gold Kundan ornamental divider — absolute at bottom of section so it doesn't get caught in the flex centering */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 block w-full">
        <Image
          src={asset("/images/divider-gold-kundan.webp")}
          alt=""
          width={4320}
          height={845}
          className="block w-full"
        />
      </div>
    </section>
  );
}
