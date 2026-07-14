"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCover } from "@/components/CoverContext";
import { asset } from "../asset";

gsap.registerPlugin(ScrollTrigger);

// Module-level flag — survives all React mount/unmount cycles (Strict Mode, tree re-mounts)
let heroHasAnimated = false;

// A CLIENT component: it runs a one-shot GSAP intro on the arch, the photo and
// the text. Every value it draws arrives as a prop (already resolved on the
// server) — `image` is a finished URL, not a template-relative path.
export default function HeroSection({
  eyebrow,
  image,
  brideFirstName,
  groomFirstName,
}: {
  eyebrow: string;
  image: string;
  brideFirstName: string;
  groomFirstName: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const { entered } = useCover();

  // One-shot intro animation (only runs once per page lifetime): the arch +
  // couple image reveals first with a gentle zoom-out, then the hero text.
  useEffect(() => {
    if (!entered) return;

    const ctx = gsap.context(() => {
      // Already played this page lifetime? Then this is a REMOUNT (Strict Mode,
      // or the editor toggling the Hero off and back on). Skip the choreography
      // and land everything in its final state — the inline `opacity: 0` on the
      // text and image would otherwise leave them invisible forever.
      if (heroHasAnimated) {
        if (imageRef.current) gsap.set(imageRef.current, { opacity: 1, scale: 1 });
        if (textRef.current) {
          gsap.set(textRef.current, { opacity: 1 });
          gsap.set(Array.from(textRef.current.children), { opacity: 1, scale: 1 });
        }
        return;
      }
      heroHasAnimated = true;

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      // 1) Arch + couple image reveals first — fades in while zooming IN from a
      //    smaller scale up to its resting size. The `origin-bottom` class keeps
      //    the arch grounded at the section's bottom edge as it grows into place.
      if (imageRef.current) {
        tl.fromTo(
          imageRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 1, ease: "power3.out" }
        );
      }

      // 2) Hero text reveals only AFTER the image has settled — each line
      //    scales up and fades in with a stagger.
      if (textRef.current) {
        gsap.set(textRef.current, { opacity: 1 });
        tl.fromTo(
          Array.from(textRef.current.children),
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, stagger: 0.12 },
          "+=0.15"
        );
      }
    });

    return () => ctx.revert();
  }, [entered]);

  return (
    <section
      ref={sectionRef}
      className="relative flex h-svh w-full flex-col items-center overflow-hidden bg-center bg-no-repeat px-6 pt-12 text-center"
      style={{
        backgroundImage: `url('${asset("/images/eu-sky.webp")}')`,
        // Stretch to fill both axes — no side gaps, no top/bottom crop.
        // Slight horizontal distortion (sky aspect 0.43 vs container ~0.64)
        // is hidden by the soft watercolor texture.
        backgroundSize: "100% 100%",
      }}
    >
      {/* Couple text — anchored a FIXED distance ABOVE the arch top, not pinned
          to the section top. If it were top-pinned, the gap between the names
          and the arch would grow with the viewport height (huge empty sky on
          tall phones / iPads). Instead we position its bottom edge relative to
          the arch's height so the gap stays consistent on every screen.

          `bottom` = arch height + gap:
            • arch height = min(90cqw, 42svh) × 1.776  (the arch aspect 768/1364),
              which is exactly the arch box's rendered height, so 0 = arch top.
            • + clamp(1.5rem, 6svh, 4.5rem) = the gap above the arch — small and
              tasteful, gently scaling with height but capped so it never drifts.
          The whole block is horizontally centered via left-0/right-0 + items-center. */}
      <div
        ref={textRef}
        className="absolute left-0 right-0 z-20 flex flex-col items-center px-6"
        style={{
          opacity: 0,
          bottom:
            "calc(min(159.84cqw, 71.6svh) + clamp(1.5rem, 6svh, 4.5rem))",
        }}
      >
        <p
          className="font-manrope uppercase tracking-wider"
          style={{ color: "var(--color-hero-text)", fontSize: "clamp(0.8rem, 2cqw, 1rem)" }}
        >
          {eyebrow}
        </p>

        <h1
          className="font-couple font-medium italic leading-tight whitespace-nowrap"
          style={{ color: "var(--color-hero-text)", fontSize: "clamp(3.5rem, 10cqw, 3.75rem)" }}
        >
          {brideFirstName} <span className="not-italic" style={{ color: "var(--color-hero-gold)"}} >&</span> {groomFirstName}
        </h1>
      </div>

      {/* Floral arch — grounded at the section's bottom edge and horizontally
          centered via `left-0 right-0 mx-auto` (NOT translate-x, so GSAP's
          scale animation on this element doesn't fight a centering transform).

          Its width is `min(90%, 42svh)`: normally 90% of the invitation width,
          but on SHORT viewports it is capped by height. Because the arch's
          height is ~1.78× its width, capping the width at 42svh caps the arch
          height at ~75svh — so it can never eat more than ~75% of the screen,
          always leaving ~25% of headroom at the top for the couple names. This
          is what keeps the gap between the names and the arch consistent across
          every screen size (the old fixed `w-[90%]` let the arch grow to ~92%
          of height on short phones, crushing the text into it).

          The couple photo lives INSIDE this same box, so it scales as one unit
          with the arch and stays framed in the opening at any size. */}
      <div
        ref={imageRef}
        className="absolute bottom-0 left-0 right-0 mx-auto z-10 origin-bottom overflow-hidden"
        style={{ opacity: 0, width: "min(90%, 45svh)" }}
      >
        {/* Couple photo — fills a box matched to the arch's open inner area so
            it shows through with no gap at the top. Insets are relative to the
            arch box now (arch fills the whole box), so 19% left/right and 27%
            top place it inside the hollow, tucked behind the floral crown.
            `fill` + object-cover covers the box without distortion; the arch
            (z-10) masks everything outside it. */}
        <div className="absolute inset-x-[19%] top-[27%] bottom-0 z-0 overflow-hidden">
          <Image
            src={image}
            alt="Couple portrait"
            fill
            sizes="60vw"
            className="object-cover object-center"
          />
        </div>

        <Image
          src={asset("/images/eu-arch.webp")}
          alt="Floral archway with stone pillars"
          width={768}
          height={1364}
          sizes="100vw"
          className="relative z-10 block w-full h-auto"
          preload
        />
      </div>
    </section>
  );
}
