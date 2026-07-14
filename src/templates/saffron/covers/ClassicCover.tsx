"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Pressable from "@/components/Pressable";
import type { CoverDesignProps } from "@/components/covers-types";
import { sharedUrl } from "@/lib/assets";

// ── Cover staged-reveal timings (ms), measured from `active` (loader handoff) ──
// The loader (LoadingScreen) holds 100% ~400ms then fades ~600ms (≈1000ms),
// during which the cover already shows the couple name on a black backdrop —
// identical to the loader, so it reads as the name simply staying put. We wait
// out that handoff, then fade the cover photo in, then the button. Tweak here
// to retime the sequence.
const REVEAL_IMAGE_DELAY = 1100; // name-only-on-black beat before the photo fades in
const REVEAL_IMAGE_FADE = 800;   // cover-photo fade-in duration (also set on its transition)
const REVEAL_BUTTON_DELAY = REVEAL_IMAGE_DELAY + REVEAL_IMAGE_FADE + 300; // button appears after the photo settles

// CLIENT: the staged reveal is timer-driven (setTimeout + prefers-reduced-motion),
// and the open control is an onClick. Everything it draws — the four values below —
// is resolved on the server and handed down by the cover engine.
export default function ClassicCover({
  active,
  hiding,
  onEnter,
  eyebrow,
  button,
  coupleNames,
  image,
}: CoverDesignProps) {
  // Staged cover reveal (name → photo → button). The couple name is on screen
  // from the start (it carries over from LoadingScreen); these two gate the
  // later beats.
  const [showImage, setShowImage] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Kick off the staged reveal when the loader hands off (`active`).
  // Respects reduced-motion by revealing everything at once. Timers are cleared
  // on unmount or if the dependency re-fires.
  useEffect(() => {
    if (!active) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setShowImage(true);
      setShowButton(true);
      return;
    }

    const t1 = setTimeout(() => setShowImage(true), REVEAL_IMAGE_DELAY);
    const t2 = setTimeout(() => setShowButton(true), REVEAL_BUTTON_DELAY);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  return (
    <div
      className="absolute inset-0 z-100 bg-black transition-all duration-700"
      style={{
        opacity: hiding ? 0 : 1,
        transform: hiding ? "scale(1.05)" : "scale(1)",
      }}
    >
      {/* Cover photo + its darkening overlay — fade in together (beat 2) as
          a smooth opacity transition over the black backdrop, so the photo
          arrives already darkened for text contrast. Wrapped in one layer so
          a single transition drives both. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: showImage ? 1 : 0,
          transition: `opacity ${REVEAL_IMAGE_FADE}ms ease-out`,
        }}
      >
        {/* Background image */}
        <Image
          src={image}
          alt={coupleNames}
          fill
          sizes="(max-width: 512px) 100vw, 512px"
          className="object-cover"
          priority
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Title group — vertically centered so the couple name sits in the
          exact same box as the LoadingScreen text, making the loader→cover
          crossfade look like the text simply stays put (no upward jump).
          The cover overlay is viewport-height during the cover (body is
          `fixed inset-0` + flex-stretch), so `top-1/2 -translate-y-1/2`
          here lands on the very viewport center the loader's flex-center
          uses — identical on every device. The eyebrow size (text-xs), the
          `relative py-2` name wrapper and the no-`leading` h1 mirror
          LoadingScreen's block exactly so the name occupies the same box. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center text-center px-6"
      >
        <p
          className="mb-2 font-body text-xs tracking-widest uppercase"
          style={{ color: "rgba(255, 255, 255, 0.8)" }}
        >
          {eyebrow}
        </p>

        <div className="relative py-2">
          <h1
            className="font-couple text-[2.375rem] whitespace-nowrap uppercase"
            style={{ color: "var(--color-white)" }}
          >
            {coupleNames}
          </h1>

          {/* Divider — absolutely positioned just BELOW the name so it does
              NOT add to the centered title block's height. That height must
              stay identical to LoadingScreen's (eyebrow + name only) so the
              couple name lines up across the loader→cover handoff. Centered
              with left-1/2 + -translate-x-1/2 (robust even when the divider
              is wider than the name); `scale:-1` is a separate CSS property,
              so it composes with the translate without breaking centering. */}
          <div
            role="img"
            aria-label="Divider"
            className="absolute left-1/2 top-full -translate-x-1/2"
            style={{
              marginTop: "clamp(0.25rem, 1.5cqw, 0.75rem)",
              width: "clamp(10rem, 50cqw, 20rem)",
              aspectRatio: "2598 / 312",          // match the SVG's viewBox
              backgroundColor: "var(--color-white)",   // ← change color here
              WebkitMaskImage: `url('${sharedUrl("/flourish-divider.svg")}')`,
              maskImage: `url('${sharedUrl("/flourish-divider.svg")}')`,
              WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
              WebkitMaskSize: "contain", maskSize: "contain",
              WebkitMaskPosition: "center", maskPosition: "center",
              scale: "-1",
            }}
          />
        </div>

        {/* <Image
          src={sharedUrl("/flourish-divider.svg")}        // exact filename, from /public/images
          alt=""                     // "" = decorative (hidden from screen readers)
          width={1200}               // intrinsic ratio — use the SVG's viewBox numbers
          height={120}
          className="w-full h-auto -scale-y-100"   // actual on-screen size is controlled here
          style={{
            width: "clamp(10rem, 50cqw, 20rem)",
            aspectRatio: "2598 / 312",          // match the SVG's viewBox
            backgroundColor: "var(--color-white)",   // ← change color here
            WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
            WebkitMaskSize: "contain", maskSize: "contain",
            WebkitMaskPosition: "center", maskPosition: "center",
          }}
        /> */}
      </div>

      {/* Button — pinned near bottom, scales with viewport but bounded */}
      <Pressable
        onClick={onEnter}
        className="absolute left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-full border border-white tracking-widest uppercase text-white hover:bg-white hover:border-white hover:text-black"
        style={{
          bottom: "clamp(6rem, 20vh, 20rem)",
          fontSize: "clamp(0.65rem, 2.4cqw, 0.85rem)",
          paddingLeft: "clamp(1.5rem, 6cqw, 2rem)",
          paddingRight: "clamp(1.5rem, 6cqw, 2rem)",
          paddingTop: "clamp(0.5rem, 2cqw, 0.75rem)",
          paddingBottom: "clamp(0.5rem, 2cqw, 0.75rem)",
          // Beat 3: a dedicated, clearly-visible fade-in. The explicit
          // transition below OVERRIDES the class's `transition-all
          // duration-300`, fading opacity slowly (~700ms) while keeping the
          // hover bg/border transitions snappy at 300ms. pointer-events off
          // until shown so it can't be tapped while invisible.
          opacity: showButton ? 1 : 0,
          pointerEvents: showButton ? "auto" : "none",
          transition:
            "opacity 700ms ease-out, background-color 300ms ease-out, border-color 300ms ease-out, scale 200ms ease-out, filter 200ms ease-out",
        }}
      >
        {button}
      </Pressable>
    </div>
  );
}
