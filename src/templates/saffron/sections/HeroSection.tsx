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

// CLIENT: the one-shot intro timeline and the scroll-scrubbed arch zoom are GSAP,
// so this section needs the browser. It still receives only the values it draws —
// the couple photo arrives as an already-resolved URL; the theme art below is
// this template's own, so it resolves through the pure asset() helper.
export default function HeroSection({
  eyebrow,
  tagline,
  image,
  brideFirstName,
  groomFirstName,
}: {
  eyebrow: string;
  tagline?: string;
  image: string;
  brideFirstName: string;
  groomFirstName: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const { entered } = useCover();

  // One-shot intro animation (only runs once per page lifetime).
  useEffect(() => {
    if (!entered || heroHasAnimated) return;
    heroHasAnimated = true;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      if (textRef.current) {
        gsap.set(textRef.current, { opacity: 1 });
        tl.fromTo(
          Array.from(textRef.current.children),
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, stagger: 0.12 }
        );
      }

      if (imageRef.current) {
        tl.fromTo(
          imageRef.current,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.3"
        );
      }
    });

    return () => ctx.revert();
  }, [entered]);

  // Scroll-scrubbed transition: arch zooms into its opening while the
  // sticky positioning lets the next section rise over the hero. The slide
  // is purely CSS (sticky hero + z-30 couple wrapper); we only animate the
  // arch scale here, in lockstep with that same scroll window.
  useEffect(() => {
    if (!entered) return;
    const section = sectionRef.current;
    const arch = imageRef.current;
    if (!section || !arch) return;

    const ctx = gsap.context(() => {
      // Promote arch + its parent to their own compositor layers so the
      // GSAP transform on the arch doesn't dirty the section's bg-cover
      // layer each frame (which was forcing per-frame paint on a sticky
      // section — the main source of "lag from page entry").
      gsap.set(arch, {
        transformOrigin: "50% 0%",
        willChange: "transform",
        force3D: true,
      });
      if (arch.parentElement) {
        gsap.set(arch.parentElement, { force3D: true });
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=100%",
          // scrub: 1 (not `true`). Per GSAP performance guidance for
          // low-end devices, a small smoothing value decouples the
          // animation from scroll-event frequency — iOS Safari can fire
          // scroll events at 120Hz, so `scrub: true` drives the arch
          // re-paint at 120Hz. scrub: 1 lets GSAP interpolate at its own
          // ticker rate (~60fps), halving the per-second paint cost on
          // phones at the cost of a barely-perceptible catch-up tail.
          scrub: true,
          fastScrollEnd: true,
        },
      });

      tl.to(arch, { scale: 2.2, ease: "none" }, 0);
      tl.to(section, { opacity: 0, ease: "none" }, 0);
    }, section);

    // No explicit ScrollTrigger.refresh() here — SmoothScroll already
    // calls it on cover entry, and calling it again can cause a hitch.

    return () => ctx.revert();
  }, [entered]);

  return (
    <section
      ref={sectionRef}
      className="sticky top-0 z-10 flex h-svh w-full flex-col items-center overflow-hidden bg-cover bg-center bg-no-repeat px-6 pt-12 text-center"
      style={{ backgroundImage: `url('${asset("/images/cloudy-paper-bg.webp")}')` }}
    >
      {/* Couple text — at top of the flex column */}
      <div
        ref={textRef}
        className="relative z-20 flex flex-col items-center"
        style={{ opacity: 0, top: "5svh" }}
      >
        <p
          className="font-montserrat font-normal uppercase tracking-widest"
          style={{ color: "var(--color-gate-eyebrow)", fontSize: "clamp(0.8rem, 2.5cqw, 1rem)" }}
        >
          {eyebrow}
        </p>

        <h1
          className="font-couple font-medium whitespace-nowrap uppercase tracking-tighter"
          style={{ color: "var(--color-gate-eyebrow)", fontSize: "clamp(2.5rem, 10cqw, 3rem)" }}
        >
          {brideFirstName} &amp; {groomFirstName}
        </h1>

        <Image
          src={asset("/images/hero-text-divider.svg")}
          alt="Hero divider"
          width={1577}
          height={242}
          className="h-auto mb-3 mt-2"
          style={{ width: "clamp(10rem, 50cqw, 15rem)" }}
          priority={false}
        />

        <p
          className="font-montserrat w-[70%]"
          style={{ color: "var(--color-hero-gold)", fontSize: "clamp(0.8rem, 2.5cqw, 0.875rem)" }}
        >
          {tagline}
        </p>
      </div>

      {/* Mandap arch — full container width, pushed to bottom via mt-auto */}
      <div
        ref={imageRef}
        className="relative z-10 mt-auto -mx-6 w-[calc(100%+3rem)] origin-bottom"
        style={{ opacity: 0 }}
      >
        <Image
          src={asset("/images/hero-arch.webp")}
          alt="Sandstone mandap arch with pink and yellow floral garlands"
          width={2048}
          height={3578}
          sizes="220vw"
          className="relative z-20 w-full h-auto"
          preload
        />

        {/* Couple — placed behind the arch (lower z) so they show through the
            archway opening. LOCKED TO THE ARCH: with no fixed-pixel margins on
            either the arch (above) or this box/photo, the wrapper's height ==
            the arch image's height, so this box's percentage insets map to the
            SAME fraction of the arch on every screen. The couple therefore stays
            glued to the arch opening at all viewport heights, and the scroll-zoom
            (which scales the shared wrapper) scales the couple + arch together as
            one unit — never independently. This is the marigold approach.

            KEEP IT LOCKED — every offset here must be a PERCENTAGE, never a
            fixed rem/px (a `-mt-*` or px translate is a constant number of px
            that becomes a different fraction as the screen height changes, so it
            drifts the couple off the arch on some screens — the old bug).
            TUNE to taste (all proportional, all safe):
              • top-[24%]                → clips the couple's top under the arch
                                           cornice. Raise the % to tuck further /
                                           shrink the couple; lower it to enlarge
                                           (too low re-exposes the top leak).
              • left-[18%] right-[18%]   → how far the sides tuck behind the pillars.
              • objectPosition 1st value → horizontal slice kept when the sides
                                           crop: <50% nudges the couple right.
              • translateY(-%) / scale() → lift/size the couple. The arch's opaque
                                           grass base hides the resulting bottom
                                           slack, so scale<1 is fine here. */}
        <div className="absolute bottom-0 left-[18%] right-[18%] top-[24%] z-10 overflow-hidden">
          <Image
            src={image}
            alt="The couple"
            fill
            sizes="220vw"
            className="object-cover"
            style={{
              objectPosition: "25% 50%",
              transform: "translateY(-5%) scale(0.9)",
              transformOrigin: "40% 50%",
            }}
            preload
          />
        </div>
      </div>
    </section>
  );
}
