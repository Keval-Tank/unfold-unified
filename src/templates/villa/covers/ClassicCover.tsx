"use client";

import Image from "next/image";
import Pressable from "@/components/Pressable";
import { useCoverReveal } from "@/lib/useCoverScreen";
import type { CoverDesignProps } from "@/components/covers-types";
import { sharedUrl } from "@/lib/assets";

// Villa's cover: full-bleed photo behind the couple name on black, with a
// flourish divider and the enter button pinned near the bottom.
//
// Staged reveal, as offsets from t0 (= the moment preload resolves; see
// useCoverScreen). The loader overlay fades out and unmounts at t0+1000; the
// photo then develops in after a beat of name-on-black, and the button follows.
// Note the couple name itself is never faded here — it carries over from the
// loader's identical name on the same black backdrop.
const TIMINGS = { photoDelay: 1000, buttonDelay: 1500 };

// The four values it draws — eyebrow, button, coupleNames and a fully-resolved
// image URL — arrive as props from the cover engine, which got them from the
// server. The template object never reaches this component.
export default function ClassicCover({
  active,
  hiding,
  onEnter,
  eyebrow,
  button,
  coupleNames,
  image,
}: CoverDesignProps) {
  const { showPhoto, showButton } = useCoverReveal(active, TIMINGS);

  return (
    <div
      className="absolute inset-0 z-100 flex items-center justify-center bg-black transition-all duration-700"
      style={{
        opacity: hiding ? 0 : 1,
        transform: hiding ? "scale(1.05)" : "scale(1)",
      }}
    >
      {/* Couple image — fades in first (beat 2), after the title has had a
          moment to settle on the black backdrop. Pure CSS opacity transition
          driven by `showPhoto`, which the hook flips 600ms after the loader
          has faded out — that beat lets the text read as a continuation of
          the loader's filled name before the photo arrives. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: showPhoto ? 1 : 0,
          transition: "opacity 900ms ease-out",
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

      {/* Title group — centered by the parent cover div's flex-center,
          mirroring LoadingScreen exactly (its overlay is
          `fixed inset-0 flex items-center justify-center` wrapping the
          block). This replaces the old `top-1/2 + -translate-y-1/2`
          centering, whose 50%-of-own-height shift could land on a
          half-pixel and left the couple name ~1px above the loader's.
          `relative` keeps the divider's `top-full` anchored to this block. */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <p
          className="font-manrope text-sm tracking-widest uppercase mb-2"
          style={{ color: "rgba(255, 255, 255, 0.8)" }}
        >
          {eyebrow}
        </p>

        <div className="relative py-2">
          {/* Invisible spacer — defines the name box exactly like
              LoadingScreen's ghost h1, so the box height (and thus the
              eyebrow position + divider anchor) stays identical. */}
          <h1
            aria-hidden
            className="font-couple text-[2.375rem] whitespace-nowrap uppercase"
            style={{ color: "transparent" }}
          >
            {coupleNames}
          </h1>

          {/* Visible name — mirrors LoadingScreen's revealed h1 exactly
              (absolute -top-2 -bottom-2 + flex items-center). Flexbox
              positions the glyphs by the font's own ascent/descent rather
              than the line-height, so this makes the couple name sit at
              the identical vertical position across the loader→cover
              handoff (a plain block h1 lands the glyphs a few px off). */}
          <h1
            className="absolute -top-2 -bottom-2 left-0 right-0 flex items-center font-couple text-[2.375rem] whitespace-nowrap uppercase"
            style={{ color: "var(--color-white)" }}
          >
            {coupleNames}
          </h1>
        </div>
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

      {/* Button — pinned near bottom, scales with viewport but bounded.
          Wrapped so the fade-in (beat 3) lives on the wrapper's opacity and
          the button keeps its own `transition-all` for the hover effect.
          `showButton` lands it just after the image has mostly arrived. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{
          bottom: "clamp(6rem, 20vh, 20rem)",
          opacity: showButton ? 1 : 0,
          transition: "opacity 500ms ease-out",
        }}
      >
        <Pressable
          onClick={onEnter}
          className="whitespace-nowrap rounded-full border border-white/60 tracking-widest uppercase text-white hover:bg-white/20 hover:border-white"
          style={{
            fontSize: "clamp(0.65rem, 2.4cqw, 0.85rem)",
            paddingLeft: "clamp(1.5rem, 6cqw, 2rem)",
            paddingRight: "clamp(1.5rem, 6cqw, 2rem)",
            paddingTop: "clamp(0.5rem, 2cqw, 0.75rem)",
            paddingBottom: "clamp(0.5rem, 2cqw, 0.75rem)",
          }}
        >
          {button}
        </Pressable>
      </div>
    </div>
  );
}
