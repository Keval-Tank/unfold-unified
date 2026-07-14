"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Pressable from "@/components/Pressable";
import Sway from "@/components/Sway";
import { asset } from "../asset";
import type { CoverDesignProps } from "@/components/covers-types";

// A second, deliberately-distinct cover design (see ClassicCover for the first)
// used to validate that the cover is pluggable: same behavior contract, totally
// different look. Bright cream "framed portrait" style — the couple inside the
// carved oval frame, a gold-kundan divider, swaying floral corners, and a
// filled "Open Invitation" pill.

// ── Reveal timings (ms), measured from `active` (loader handoff) ──────────────
// The dark LoadingScreen fades out over ~1000ms after handoff. We keep this
// light cover's *content* hidden until that black curtain has cleared, then
// stagger each element in (eyebrow → frame → name → divider → button) so they
// bloom onto the revealed cream backdrop instead of clashing with the fading
// loader name. The cream background itself is visible from the start.
const REVEAL_START = 1000;   // beat before content begins revealing (clears the loader fade)
const REVEAL_STAGGER = 200;  // gap between each staggered element
const REVEAL_DURATION = 700; // per-element fade+rise duration

// CLIENT: the staggered bloom is timer-driven (setTimeout + prefers-reduced-motion),
// and the open control is an onClick. `image` is the ACTIVE cover's photo, already
// picked and resolved on the server — this design never sees the other design's
// image path. The decorative art is this template's own, via the pure asset().
export default function PortraitCover({
  active,
  hiding,
  onEnter,
  eyebrow,
  button,
  coupleNames,
  image,
}: CoverDesignProps) {
  // Single reveal flag; each element offsets itself via transitionDelay so the
  // block blooms in sequence once revealed.
  const [revealed, setRevealed] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Kick off the reveal when the loader hands off (`active`). Reduced-motion
  // reveals everything at once. Timer cleared on unmount / dependency re-fire.
  useEffect(() => {
    if (!active) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setReduced(true);
      setRevealed(true);
      return;
    }

    const t = setTimeout(() => setRevealed(true), REVEAL_START);
    return () => clearTimeout(t);
  }, [active]);

  // Per-element reveal style: hidden → visible fade+rise, staggered by index.
  const reveal = (index: number): React.CSSProperties => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? "translateY(0)" : "translateY(16px)",
    transition: reduced
      ? "none"
      : `opacity ${REVEAL_DURATION}ms ease-out, transform ${REVEAL_DURATION}ms ease-out`,
    transitionDelay: reduced ? "0ms" : `${index * REVEAL_STAGGER}ms`,
  });

  return (
    <div
      className="absolute inset-0 z-100 bg-cover bg-center transition-all duration-700"
      style={{
        backgroundImage: `url('${asset("/images/paper-bg.webp")}')`,
        opacity: hiding ? 0 : 1,
        transform: hiding ? "scale(1.02)" : "scale(1)",
      }}
    >
      {/* Soft cream wash to lift text/contrast off the busy paper texture */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(245, 239, 230, 0.35)" }}
      />

      {/* Swaying floral corners — top-left (natural) + bottom-right (rotated) */}
      <div className="pointer-events-none absolute -top-6 -left-6 z-0 w-[42%]">
        <Sway direction="left" intensity={0.5} speed={0.7} origin="top-left">
          <Image
            src={asset("/images/floral-corner-spray.webp")}
            alt=""
            width={1200}
            height={1200}
            className="w-full h-auto"
          />
        </Sway>
      </div>
      <div className="pointer-events-none absolute -bottom-6 -right-6 z-0 w-[42%] rotate-180">
        <Sway direction="right" intensity={0.5} speed={0.7} origin="top-left">
          <Image
            src={asset("/images/floral-corner-spray.webp")}
            alt=""
            width={1200}
            height={1200}
            className="w-full h-auto"
          />
        </Sway>
      </div>

      {/* Centered content column */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
        {/* Eyebrow */}
        <p
          className="mb-4 font-body text-xs tracking-widest uppercase"
          style={{ color: "var(--color-hero-gold)", ...reveal(0) }}
        >
          {eyebrow}
        </p>

        {/* Oval-framed couple photo — reuses CoupleSection's clip technique:
            the photo is clipped to the frame's elliptical opening (asymmetric
            insets so the photo tucks UNDER the carved border), the frame PNG
            sits on top. */}
        <div className="relative w-[62%] max-w-[15rem]" style={reveal(1)}>
          <div className="relative mx-auto aspect-2836/4973">
            <div
              className="absolute overflow-hidden rounded-[50%]"
              style={{ top: "16%", bottom: "31%", left: "8%", right: "8%" }}
            >
              <Image
                src={image}
                alt={coupleNames}
                fill
                sizes="(max-width: 512px) 62vw, 240px"
                className="object-cover object-top"
                priority
              />
            </div>
            <Image
              src={asset("/images/couple-oval-frame.webp")}
              alt=""
              fill
              sizes="(max-width: 512px) 62vw, 240px"
              className="object-contain pointer-events-none"
            />
          </div>
        </div>

        {/* Couple name */}
        <h1
          className="mt-6 font-couple uppercase whitespace-nowrap"
          style={{
            color: "var(--color-primary-dark)",
            fontSize: "clamp(2rem, 9cqw, 2.75rem)",
            ...reveal(2),
          }}
        >
          {coupleNames}
        </h1>

        {/* Gold-kundan divider */}
        <div className="mt-3" style={{ width: "clamp(9rem, 45cqw, 15rem)", ...reveal(3) }}>
          <Image
            src={asset("/images/divider-gold-kundan.webp")}
            alt=""
            width={1200}
            height={80}
            className="w-full h-auto"
          />
        </div>

        {/* Filled "Open Invitation" pill — wrapped so the reveal transform can't
            fight Pressable's own press-scale transform. */}
        <div className="mt-8" style={{ ...reveal(4), pointerEvents: revealed ? "auto" : "none" }}>
          <Pressable
            onClick={onEnter}
            className="whitespace-nowrap rounded-full tracking-widest uppercase shadow-md hover:brightness-95"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-cream)",
              fontSize: "clamp(0.65rem, 2.4cqw, 0.85rem)",
              paddingLeft: "clamp(1.75rem, 7cqw, 2.5rem)",
              paddingRight: "clamp(1.75rem, 7cqw, 2.5rem)",
              paddingTop: "clamp(0.6rem, 2.2cqw, 0.85rem)",
              paddingBottom: "clamp(0.6rem, 2.2cqw, 0.85rem)",
            }}
          >
            {button}
          </Pressable>
        </div>
      </div>
    </div>
  );
}
