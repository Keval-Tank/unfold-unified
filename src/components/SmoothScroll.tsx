"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCover } from "@/components/CoverContext";
import { pauseAllSways, resumeAllSways } from "@/lib/swayRegistry";

gsap.registerPlugin(ScrollTrigger);

// DIAGNOSTIC TOGGLE — when true, the component still mounts (so the
// cover-unlock effect below still removes the body's scroll-lock classes
// on `entered`), but it skips creating Lenis. The page falls back to the
// browser's native scroll. Used to test whether Lenis's sub-pixel
// interpolation is the source of the canvas shake on iOS Safari.
// Flip back to false to re-enable Lenis without uncommenting anything.
const DISABLE_LENIS = false;

// Re-read every trigger's start/end values on refresh — important when
// pin-spacers grow the document mid-mount.
//
// `scroller: document.body` only when Lenis is active (it pairs with the
// scrollerProxy below). With native scroll (DISABLE_LENIS), let
// ScrollTrigger use its default scroller (window).
ScrollTrigger.defaults({
  invalidateOnRefresh: true,
  ...(!DISABLE_LENIS && typeof document !== "undefined"
    ? { scroller: document.body }
    : {}),
});

// Mobile browser chrome (Safari/Chrome URL bar) collapses/expands during
// scroll, firing resize events that would otherwise force ScrollTrigger to
// recompute every trigger's start/end mid-scroll. For pinned sections that
// causes the pin anchor to leap; for scrubbed transforms it causes
// micro-jumps. Suppress that source of jitter globally.
ScrollTrigger.config({ ignoreMobileResize: true });

// The scroll FEEL is the one thing templates tune differently — saffron reads
// quicker, villa slower. Everything else about the Lenis + ScrollTrigger bridge
// is identical across templates, so the two multipliers are props (with saffron's
// values as the defaults) rather than a reason to fork the whole component.
export default function SmoothScroll({
  children,
  wheelMultiplier = 1.7,
  touchMultiplier = 0.8,
}: {
  children: React.ReactNode;
  wheelMultiplier?: number;
  touchMultiplier?: number;
}) {
  const { entered } = useCover();
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    // Diagnostic skip: when DISABLE_LENIS is true, don't create Lenis.
    // The cover-unlock effect below still runs (because the component
    // still mounts), removing the scroll-lock classes from <body> so
    // the page can scroll natively.
    if (DISABLE_LENIS) return;

    const lenis = new Lenis({
      // lerp: 0.1,         // very lazy catch-up (each frame closes 3% of gap)
      duration: 1.5,                                              // 1.0 = snappier, 1.5 = floatier
      easing: (t) => 1 - Math.pow(1 - t, 2),   // easeOutQuad — even, natural deceleration
      syncTouchLerp: 0.06,   // lower = longer, gentler phone glide-out (default 0.075)
      touchInertiaExponent : 2.1,
      touchMultiplier,
      wheelMultiplier,
      smoothWheel: true,  // smooth mouse wheel
      syncTouch: true,    // synchronize touch scrolling on mobile to eliminate pinning lag
    });
    lenisRef.current = lenis;

    // ScrollTrigger ↔ Lenis bridge.
    //
    // The minimal Lenis integration (just lenis.on("scroll", ScrollTrigger.update))
    // leaves ScrollTrigger reading window.scrollY — but Lenis writes that
    // value via window.scrollTo(), which the browser commits at the next
    // layout flush, not synchronously. So in the same frame, Lenis has
    // computed a new interpolated scroll value, but ScrollTrigger reads
    // the previous-frame window.scrollY. That ~1-frame skew shows up on
    // mobile as the pin lagging scroll by a fraction of a pixel each
    // frame — visible as continuous high-frequency shake.
    //
    // scrollerProxy makes ScrollTrigger read scroll position directly
    // from Lenis's internal `lenis.scroll` value, eliminating the
    // window.scrollY round-trip. Writes (programmatic scrolling) go
    // through lenis.scrollTo so Lenis stays in sync.
    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        if (arguments.length && typeof value === "number") {
          lenis.scrollTo(value, { immediate: true });
          return value;
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });

    // Pause the perpetual <Sway> tweens during active scroll and resume
    // them 150ms after the last scroll event. Reclaims GSAP-ticker time
    // shared with Lenis's RAF and ScrollTrigger.update.
    let swaysPaused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      ScrollTrigger.update();
      if (!swaysPaused) {
        pauseAllSways();
        swaysPaused = true;
      }
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        resumeAllSways();
        swaysPaused = false;
        resumeTimer = null;
      }, 150);
    };
    lenis.on("scroll", onScroll);

    const raf = (time: number) => lenis.raf(time * 1000);
    rafRef.current = raf;

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Keep Lenis in sync with document height changes (pin-spacers, etc.)
    const onSTRefresh = () => lenisRef.current?.resize();
    ScrollTrigger.addEventListener("refresh", onSTRefresh);

    // Start locked — overflow-hidden is set via layout.tsx classes
    lenis.stop();

    return () => {
      ScrollTrigger.removeEventListener("refresh", onSTRefresh);

      if (lenisRef.current) {
        if (typeof (lenisRef.current as any).off === "function") {
          (lenisRef.current as any).off("scroll", onScroll);
        }
        lenisRef.current.destroy();
        lenisRef.current = null;
      }

      if (rafRef.current) {
        gsap.ticker.remove(rafRef.current);
        rafRef.current = null;
      }

      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
      if (swaysPaused) {
        resumeAllSways();
        swaysPaused = false;
      }
    };
    // The multipliers are set once per template and never change at runtime, but
    // they belong in the deps so a future dynamic value would rebuild Lenis.
  }, [wheelMultiplier, touchMultiplier]);

  // Unlock scroll when cover is dismissed. The class-removal MUST run
  // regardless of whether Lenis exists (so the diagnostic DISABLE_LENIS
  // path still unlocks the body and allows native scroll).
  useEffect(() => {
    if (!entered) return;
    document.documentElement.classList.remove("overflow-hidden");
    document.body.classList.remove("overflow-hidden", "fixed", "inset-0", "touch-none");
    if (lenisRef.current) {
      lenisRef.current.resize();
      lenisRef.current.start();
    }
    ScrollTrigger.refresh();
  }, [entered]);

  return <>{children}</>;
}
