"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Sway from "@/components/Sway";
import Link from "next/link";
import { useCover } from "@/components/CoverContext";
import Pressable from "@/components/Pressable";
import { asset } from "../asset";
import type { LocationContent } from "@/lib/template-types";

// Gold flourish divider — an SVG mask filled with a solid tint so it reads on
// the light paper background (white was invisible here). It lives INSIDE the
// flex-column flow (no absolute positioning) and is sized in cqw, so it always
// sits between the elements it separates and scales with the invitation width —
// keeping the section's layout identical on every screen size.
function FlourishDivider() {
  return (
    <div
      role="img"
      aria-label="Divider"
      className="shrink-0"
      style={{
        width: "clamp(10rem, 70cqw, 25rem)",
        aspectRatio: "2598 / 312",          // match the SVG's viewBox
        backgroundColor: "var(--color-gold)",   // ← change color here
        WebkitMaskImage: `url('${asset("/images/vintage-divider.svg")}')`,
        maskImage: `url('${asset("/images/vintage-divider.svg")}')`,
        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        WebkitMaskSize: "contain", maskSize: "contain",
        WebkitMaskPosition: "center", maskPosition: "center",
      }}
    />
  );
}

// A CLIENT component: it defers the heavy Google Maps iframe until after the
// user has entered, and lets them tap to load it early.
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
      className="relative flex min-h-[130svh] w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center text-center px-6"
      style={{ backgroundImage: `url('${asset("/images/eu-paper.webp")}')` }}
    >
      {/* Single grouping div holding every content element — heading, divider,
          map, divider, venue title, Get Directions button — vertically stacked
          and centered. Everything (dividers included) lives inside this flex
          column so the layout holds on every screen size, rather than relying
          on absolute offsets that drift as the viewport changes. */}
      <div className="relative z-10 flex w-full flex-col items-center gap-6">
        <h2
          className="font-heading leading-none uppercase"
          style={{
            color: "var(--color-primary-dark)",
            fontSize: "clamp(2.25rem, 10cqw, 3.25rem)",
          }}
        >
          {content.heading}
        </h2>

        <FlourishDivider />

        <div
          className="aspect-square w-[70%] overflow-hidden rounded-md shadow-md"
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
                className="font-body tracking-wider uppercase"
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

        <FlourishDivider />

        <p
          className="font-body leading-snug"
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
          className="inline-block rounded-full border tracking-wider uppercase hover:bg-white/30"
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

      {/* Decorative floral stem — right edge, vertically centered, with
          gentle sway pivoting at the bottom-right corner ({x, y} form
          uses Sway's clamp-to-wrapper-bounds logic). Outer div handles
          positioning so GSAP's rotation transform doesn't fight with the
          -translate-y-1/2 vertical-center transform. */}
      <div className="pointer-events-none absolute -right-[8%] top-[80%] -translate-y-1/2 z-20 w-1/4">
        <Sway
          direction="left"
          intensity={0.5}
          speed={0.9}
          origin={{ x: 99999, y: 99999 }}
        >
          <Image
            src={asset("/images/eu-floral-stem.webp")}
            alt=""
            width={576}
            height={1202}
            className="block w-full h-auto"
          />
        </Sway>
      </div>
    </section>
  );
}
