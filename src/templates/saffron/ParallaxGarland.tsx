"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// A CLIENT ISLAND: the floral garland's scroll-scrubbed parallax drift, and
// nothing else.
//
// This exists so CoupleSection can be a SERVER component. That section is
// otherwise pure markup — its copy, the parent labels, the Instagram links — and
// a single GSAP ref was the only reason the whole thing had to run in the
// browser, which meant its entire content slice crossed the boundary as props.
// Isolating the one moving part keeps the copy on the server, where it belongs.
//
// It finds its own trigger (the enclosing <section>) rather than taking one as a
// prop, because a DOM ref cannot be passed from a server component.
export default function ParallaxGarland({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.closest("section");
    if (!el || !section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: -60 },
        {
          y: 60,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
