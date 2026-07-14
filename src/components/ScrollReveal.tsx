"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type AnimationType =
  | "zoomIn"
  | "fadeInUp"
  | "slideInLeft"
  | "slideInRight"
  | "slideInDown";

const animationConfigs: Record<
  AnimationType,
  { from: gsap.TweenVars; to: gsap.TweenVars }
> = {
  zoomIn: {
    from: { scale: 0.5, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },
  fadeInUp: {
    from: { y: 60, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  slideInLeft: {
    from: { x: -80, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  slideInRight: {
    from: { x: 80, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  // Drops in from above (vertical counterpart to slideInLeft/Right). The -80px
  // start matches the slide family's 80px travel; tweak here to change the drop.
  slideInDown: {
    from: { y: -80, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
};

// One-shot reveal driven by IntersectionObserver instead of ScrollTrigger.
// The page mounts ~24 of these — keeping them out of ScrollTrigger's per-tick
// `update()` walk shaves real frame-time off every scroll event. IO callbacks
// run off the scroll path on a separate browser task, so they cost nothing
// during scroll once the reveal has fired and the observer disconnected.
//
// rootMargin "0px 0px -15% 0px" matches the prior `start: "top 85%"`:
// shrinks the viewport's bottom edge up by 15%, so intersection begins when
// the element's top crosses the 85%-down line — identical trigger point.
export default function ScrollReveal({
  children,
  animation = "zoomIn",
  delay = 0,
  duration = 0.8,
  className = "",
}: {
  children: React.ReactNode;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const config = animationConfigs[animation];
    gsap.set(el, config.from);

    let tween: gsap.core.Tween | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        tween = gsap.to(el, {
          ...config.to,
          duration,
          delay,
          ease: "power2.out",
        });
        observer.disconnect();
      },
      { root: null, rootMargin: "0px 0px -15% 0px", threshold: 0 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      tween?.kill();
    };
  }, [animation, delay, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
