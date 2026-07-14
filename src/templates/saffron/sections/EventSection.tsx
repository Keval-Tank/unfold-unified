"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import Link from "next/link";
import Pressable from "@/components/Pressable";
import { useCover } from "@/components/CoverContext";
import { asset } from "../asset";
import type { LocationContent } from "@/lib/template-types";

// CLIENT: the Google Maps iframe is mounted lazily (a timer keyed on the cover's
// `entered` state, plus a tap-to-load fallback button).
export default function EventSection({ content }: { content: Omit<LocationContent, "included"> }) {
  // Google Maps embed is heavy. Option B preload: a placeholder shows
  // until the iframe mounts; the iframe is mounted in the background a
  // couple of seconds after the user enters the page (while they're on
  // the Hero), so it's fully loaded before they scroll down here.
  const { entered } = useCover();
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!entered) return;
    // Delay past the Hero intro animation, then load in the background.
    const t = setTimeout(() => setMapLoaded(true), 2000);
    return () => clearTimeout(t);
  }, [entered]);

  return (
    <section
      className="relative flex min-h-svh w-full flex-col items-center overflow-hidden bg-cover bg-center text-center px-6 pb-12"
      style={{ backgroundImage: `url('${asset("/images/paper-bg.webp")}')` }}
    >
      {/* Wrapper holding temple wall + gold Kundan divider as the visual stack, with scroll positioned absolutely on top so ~70% sits over the wall and ~30% over the divider */}
      <div className="relative -mx-6 w-[calc(100%+3rem)]">
        {/* Temple wall (decorative background) */}
        <div className="relative w-full aspect-4320/4027">
          <Image
            src={asset("/images/event-temple-wall.webp")}
            alt=""
            fill
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-contain pointer-events-none select-none"
          />
        </div>

        {/* Scroll parchment in NORMAL FLOW with a negative margin-top so it overlaps the
            temple wall. This way the wrapper's height naturally extends to contain the
            scroll's bottom, and any sibling below it sits at the scroll's true bottom edge. */}
        <div className="relative z-10 mx-auto w-full -mt-[100%]">
          <ScrollReveal animation="zoomIn">
            <div className="relative w-full aspect-4320/7946">
              {/* Scroll background image */}
              <Image
                src={asset("/images/scroll-parchment.webp")}
                alt=""
                fill
                sizes="(max-width: 512px) 90vw, 460px"
                className="object-contain pointer-events-none select-none"
              />

              {/* Map iframe — positioned at the exact center of the scroll image */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square w-[55%] overflow-hidden rounded-md shadow-md"
                style={{ borderColor: "var(--color-gold)" }}
              >
                {mapLoaded ? (
                  <iframe
                    src={content.mapEmbedUrl}
                    title="Wedding venue location"
                    className="w-full h-full border-0"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <Pressable
                    type="button"
                    onClick={() => setMapLoaded(true)}
                    aria-label="Load venue map"
                    className="flex h-full w-full flex-col items-center justify-center gap-1.5"
                    style={{ backgroundColor: "var(--color-cream-dark)" }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span
                      className="font-montserrat tracking-wider uppercase"
                      style={{
                        color: "var(--color-primary)",
                        fontSize: "clamp(0.5rem, 2.2cqw, 0.65rem)",
                      }}
                    >
                      {content.mapLoadingLabel}
                    </span>
                  </Pressable>
                )}
              </div>

              {/* Location heading — sits above the centered map */}
              <h2
                className="absolute left-1/2 -translate-x-1/2 font-cormorant leading-none whitespace-nowrap uppercase mt-5"
                style={{
                  top: "26%",
                  color: "var(--color-primary-dark)",
                  fontSize: "clamp(1.5rem, 7cqw, 3rem)",
                }}
              >
                {content.heading}
              </h2>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Venue name + Get Directions button — now sits directly below the scroll's bottom
          edge (no magic margin) because the scroll above is in normal flow. */}
  <div className="relative z-10 -mt-10 mb-20 flex flex-col items-center gap-4">
        <p
          className="font-montserrat leading-snug"
          style={{
            color: "var(--color-text)",
            fontSize: "clamp(0.85rem, 3.2cqw, 1.05rem)",
          }}
        >
          {content.venueName}
          <br />
          {content.venueAddress}
        </p>

        <Pressable
          as={Link}
          href={content.directionsUrl}
          target="_blank"
          className="inline-block rounded-full border tracking-wider uppercase hover:bg-white/30 font-montserrat"
          style={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
            fontSize: "clamp(0.7rem, 2.4cqw, 0.85rem)",
            paddingLeft: "clamp(1rem, 4cqw, 1.5rem)",
            paddingRight: "clamp(1rem, 4cqw, 1.5rem)",
            paddingTop: "clamp(0.35rem, 1.4cqw, 0.5rem)",
            paddingBottom: "clamp(0.35rem, 1.4cqw, 0.5rem)",
          }}
        >
          {content.directionsButton}
        </Pressable>
      </div>

      {/* Gold Kundan divider pinned at the very bottom of the section */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 w-full">
        <Image
          src={asset("/images/divider-gold-kundan.webp")}
          alt=""
          width={4320}
          height={845}
          className="block w-full -scale-y-100"
        />
      </div>
    </section>
  );
}