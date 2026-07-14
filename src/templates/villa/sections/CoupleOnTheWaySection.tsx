"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCover } from "@/components/CoverContext";
import { asset } from "../asset";

gsap.registerPlugin(ScrollTrigger);

// A CLIENT component: it pins itself with GSAP while its art zooms. It renders no
// content at all — it is pure decoration — so it takes NO props. Its art resolves
// through the pure `asset()` helper, not through any context.
export default function CoupleOnTheWaySection() {
  const { entered } = useCover();
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const rosesRef = useRef<HTMLDivElement>(null);

  // Scroll-pinned zoom + stack reveal. Once the cover is entered and the user
  // scrolls, this section is PINNED and held on screen while its art zooms;
  // the next section (#couple-overlay-target, z-30) then rides up from the
  // bottom and jumps over the held section.
  //
  // We pin with GSAP (pinType "transform"), NOT CSS `position: sticky`: the
  // page's Lenis smooth-scroll translates the content and the layout wrapper is
  // a container-query/overflow-hidden box, so a transformed ancestor makes
  // native sticky/fixed a no-op (this is also why TimelineSection pins via
  // transform). `pinSpacing: false` inserts no scroll spacer, so the following
  // section overlaps the pinned one instead of being pushed below it.
  useEffect(() => {
    if (!entered) return;
    const section = sectionRef.current;
    const bg = bgRef.current;
    const header = headerRef.current;
    const roses = rosesRef.current;
    if (!section || !bg || !header || !roses) return;

    const ctx = gsap.context(() => {
      // Promote the zooming layers to their own compositor layers (GPU-only).
      gsap.set([bg, header, roses], { willChange: "transform", force3D: true });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=100%",
          scrub: true,
          pin: true,
          pinType: "transform",
          pinSpacing: false,
          fastScrollEnd: true,
        },
      });
      // Background art zooms gently…
      tl.to(bg, { scale: 1.3, ease: "none" }, 0);
      // …the top floral header zooms a bit more than the background…
      tl.to(header, { scale: 1.8, ease: "none" }, 0);
      // …and the bottom corner roses grow the most, climbing up from the
      // bottom edge over the zoomed art so the couple looks like they're
      // being engulfed in flowers as you scroll.
      tl.to(roses, { scale: 2.5, ease: "none" }, 0);
    }, section);

    return () => ctx.revert();
  }, [entered]);

  return (
    // React-owned root wrapper: GSAP ScrollTrigger's pin-spacer nests INSIDE this
    // div, so React only ever moves/removes this node (never the pinned <section>)
    // when a neighbouring section is toggled on/off in the editor — avoids the
    // removeChild DOM error.
    <div className="relative w-full">
    <section
      ref={sectionRef}
      className="relative z-20 -mt-8 flex h-svh w-full flex-col items-center overflow-y-visible"
    >
      {/* Zooming background layer — brick texture + "Couple on the Way" stones
          artwork. overflow-hidden clips the scale to the section; the section
          itself stays overflow-y-visible so the floral overlays can bleed. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          ref={bgRef}
          className="absolute inset-0 bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${asset("/images/eu-stones-text.webp")}')`,
            // Stretch to fill — keeps the artwork edge-to-edge on every viewport.
            backgroundSize: "100% 100%",
            transformOrigin: "50% 50%",
          }}
        />
      </div>

      {/* Floral header — pinned to the top edge, centered horizontally. The
          inner div is the zoom target (anchored at its top) so the wrapper keeps
          its -translate-x-1/2 centering intact. */}
      <div className="absolute -top-30 left-1/2 -translate-x-1/2 w-[60%] z-30">
        <div ref={headerRef} style={{ transformOrigin: "50% 0%" }}>
          <Image
            src={asset("/images/eu-floral-header.webp")}
            alt=""
            width={1200}
            height={900}
            sizes="80vw"
            className="block w-full h-auto"
          />
        </div>
      </div>

      {/* Corner roses — pinned to the bottom of the section. Inner div is the
          zoom target, anchored at the bottom edge so it grows upward. */}
      <div className="absolute bottom-0 left-0 right-0 w-full">
        <div ref={rosesRef} style={{ transformOrigin: "50% 100%" }}>
          <Image
            src={asset("/images/eu-corner-roses.webp")}
            alt=""
            width={768}
            height={522}
            sizes="100vw"
            className="block w-full h-auto"
          />
        </div>
      </div>
    </section>
    </div>
  );
}
