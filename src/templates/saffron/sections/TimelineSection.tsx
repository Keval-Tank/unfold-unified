"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { shouldEnableRipple } from "@/components/shouldEnableRipple";
import RippleErrorBoundary from "@/components/RippleErrorBoundary";
import RippleStaticFallback from "@/components/RippleStaticFallback";
import { asset } from "../asset";
import { Clock } from "lucide-react";
import { sharedUrl } from "@/lib/assets";


gsap.registerPlugin(ScrollTrigger);

// Lazy-loaded: ~150 KB of three / r3f / drei only ships when this section
// actually mounts AND the connection is fast enough. On slow connections
// (or while the chunk is downloading) the static water bg below is shown.
const RippleWaterScene = dynamic(
  () => import("@/components/RippleWaterScene"),
  { ssr: false }
);

// One event, ready to draw: the ordinal suffix on the date block is already
// applied by the caller (Invitation), so this file derives nothing.
type TimelineEventView = {
  name: string;
  time: string;
  period: string;
  description: string;
  date: { day: number; ordinalSuffix: string; monthShort: string } | null;
};

// CLIENT: the pinned, scrub-driven reveal (ScrollTrigger pin + per-frame writes
// through refs) and the WebGL ripple canvas both need the browser.
export default function TimelineSection({
  title,
  events,
}: {
  title: string;
  events: TimelineEventView[];
}) {
  const EVENTS = events;
  const TIMELINE_EVENT_COUNT = EVENTS.length;
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const nameRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const detailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dateBlockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [rippleEnabled, setRippleEnabled] = useState(false);
  // One-way latch: once the ripple has failed — probe rejected it, the
  // error boundary caught a crash, or the perf monitor gave up — it must
  // never be re-enabled for the rest of the session.
  const rippleFailedRef = useRef(false);

  // The one-time, locked decision reported by RippleWaterScene's time-boxed
  // warm-up (which runs during the cover): show the live ripple, or the static
  // fallback. The section shows the COMPLETE static fallback (CSS water-bg +
  // lotuses) until `rippleCommitted` flips — and that flip happens off-screen
  // during the cover, so there is never a visible swap. `committedFallback`
  // unmounts the canvas once the warm-up gives up, freeing the GPU.
  const [rippleCommitted, setRippleCommitted] = useState(false);
  const [committedFallback, setCommittedFallback] = useState(false);

  // Capability check runs client-side after mount so SSR and the client's
  // first render both produce the static fallback (no hydration mismatch),
  // then this upgrades to the WebGL canvas. shouldEnableRipple() includes
  // the no-WebGL pre-flight probe. The one-shot post-mount setState is the
  // intended SSR-safe pattern here — hence the scoped eslint-disable.
  useEffect(() => {
    if (!rippleFailedRef.current && shouldEnableRipple()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRippleEnabled(true);
    }
  }, []);

  // Shared failure handler for the error boundary and the perf-monitor
  // fallback. Idempotent — latches to the static fallback permanently.
  const handleRippleFailure = useCallback(() => {
    rippleFailedRef.current = true;
    setRippleEnabled(false);
    // Restore the static fallback after a runtime WebGL crash — the one
    // allowed exception to the "decided once, locked" rule.
    setRippleCommitted(false);
    setCommittedFallback(true);
  }, []);

  // One-time decision reported up by RippleWaterScene's warm-up: true → reveal
  // the live ripple; false → lock the static fallback for the session.
  const handleCommit = useCallback((useRipple: boolean) => {
    if (useRipple) setRippleCommitted(true);
    else setCommittedFallback(true);
  }, []);
  // Tracks per-event "reached" state so we only write color/maxHeight on
  // transition rather than every frame. First event starts reached.
  const wasReachedRef = useRef<boolean[]>(EVENTS.map((_, i) => i === 0));

  // Rebuilds on event-COUNT change so a live-added/removed event (from the
  // editor) is included in the pinned-scroll setup — the ScrollTrigger distance,
  // dot positions, and the per-dot reveal loop all key off the count. Text/date
  // edits don't change the count and re-render through JSX without re-running.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const n = EVENTS.length;
      const dotPos = EVENTS.map((_, i) => (i / (n - 1)) * 0.85);

      // ── Cache dot offsets ONCE per layout, not per frame ─────────────
      // The dots are static inside the pinned section — their offset
      // relative to `section` never changes after layout. Previously this
      // ran `getBoundingClientRect()` × 5 every scroll tick, forcing a
      // layout recalc on each one because the prior frame's inline-style
      // writes had invalidated the layout cache. That was the dominant
      // source of the "stuck → catch-up jump" pattern.
      // Helper to safely get the offset of an element relative to the section
      // using offsetTop, which is fast and completely unaffected by active CSS transforms.
      const getOffsetTopRelativeTo = (el: HTMLElement, target: HTMLElement) => {
        let top = 0;
        let curr: HTMLElement | null = el;
        while (curr && curr !== target) {
          top += curr.offsetTop;
          curr = curr.offsetParent as HTMLElement | null;
        }
        return top;
      };

      const dotOffsets: number[] = new Array(n).fill(0);
      let containerH = 0;
      const measure = () => {
        containerH = section.offsetHeight;
        for (let i = 0; i < n; i++) {
          const dot = dotRefs.current[i];
          if (!dot) continue;
          // We add the dot's height / 2 to center the line connection perfectly on the dot.
          dotOffsets[i] = getOffsetTopRelativeTo(dot, section) + dot.offsetHeight / 2;
        }
      };
      // Defer first measure until after layout settles (refs attached).
      requestAnimationFrame(measure);
      ScrollTrigger.addEventListener("refresh", measure);

      // Combined Pin & Animation trigger — locks the pin 1:1 using transforms
      // (to prevent the iOS Safari white-screen compositor drop bug) while
      // smoothly scrubbing progress (via a dummy progress tween object).
      //
      // By using a single ScrollTrigger instance, we completely eliminate
      // the calculation conflict between two triggers acting on the same element,
      // resolving the shaking/jitter behavior perfectly under both Lenis and native scroll.
      const obj = { progress: 0 };
      const anim = gsap.to(obj, {
        progress: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${n * 30}%`,
          pin: true,
          pinType: "transform",
          scrub: 1,
        },
        onUpdate: () => {
          const progress = obj.progress;

          // No per-frame layout reads — use cached offsets.
          const dotCenters = dotOffsets;

          // Lines start at top: 6rem (below the section heading); base line
          // is stretched via CSS bottom:0, so it always reaches the section
          // bottom and we don't touch it here.
          const LINE_TOP_PX = 6 * 16;

          // ── Fill-line height ───────────────────────────────────────────
          if (lineRef.current) {
            let fillPx = dotCenters[0];
            for (let i = 1; i < n; i++) {
              if (progress >= dotPos[i]) {
                fillPx = dotCenters[i];
              } else if (progress > dotPos[i - 1]) {
                const segProgress =
                  (progress - dotPos[i - 1]) / (dotPos[i] - dotPos[i - 1]);
                fillPx =
                  dotCenters[i - 1] +
                  (dotCenters[i] - dotCenters[i - 1]) * segProgress;
              }
            }
            // After the last dot, extend the fill down to the section bottom.
            const lastDotPos = dotPos[n - 1];
            if (progress > lastDotPos) {
              const tailProgress = Math.min(
                (progress - lastDotPos) / (1 - lastDotPos),
                1
              );
              fillPx =
                dotCenters[n - 1] +
                (containerH - dotCenters[n - 1]) * tailProgress;
            }

            // Compositor-only write — scaleY against a fixed-height
            // element from `transform-origin: top` is GPU-only and does
            // not trigger layout reflow. Previously this wrote
            // `style.height` every frame, which invalidates the line
            // element's layout 60-120×/sec — a candidate source of the
            // resize-like shaking observed during the pin.
            const totalLinePx = containerH - LINE_TOP_PX;
            const scaleY =
              totalLinePx > 0
                ? Math.max(0, Math.min(1, (fillPx - LINE_TOP_PX) / totalLinePx))
                : 0;
            lineRef.current.style.transform = `scaleY(${scaleY})`;
          }

          // ── Per-event writes ───────────────────────────────────────────
          for (let i = 0; i < n; i++) {
            const name = nameRefs.current[i];
            const details = detailRefs.current[i];
            const dot = dotRefs.current[i];
            if (!name || !details || !dot) continue;

            const reached = progress >= dotPos[i] - 0.005;
            const overshoot = Math.max(0, progress - dotPos[i]);
            const revealProgress = Math.min(overshoot / 0.08, 1);

            // Compositor-only writes (transform + opacity) — cheap every frame
            if (reached) {
              dot.style.transform = `scale(${1 + 0.4 * (1 - revealProgress * 0.6)})`;
              name.style.opacity = `${0.3 + 0.7 * revealProgress}`;
              details.style.opacity = `${revealProgress}`;
              details.style.transform = `translateY(${(1 - revealProgress) * 12}px)`;
            } else {
              dot.style.transform = "scale(0.8)";
              name.style.opacity = "0.3";
              details.style.opacity = "0";
              details.style.transform = "translateY(12px)";
            }

            // Per-event date block (rendered only for events with a `date`)
            // reveals in lockstep with its own details — same opacity ramp +
            // translateY as the details panel above. Events without a date
            // leave this ref undefined, so the guard simply skips them.
            const dateBlock = dateBlockRefs.current[i];
            if (dateBlock) {
              dateBlock.style.opacity = reached ? `${revealProgress}` : "0";
              dateBlock.style.transform = reached
                ? `translateY(${(1 - revealProgress) * 12}px)`
                : "translateY(12px)";
            }

            // Layout/paint-affecting writes only fire on state change;
            // CSS transitions on the elements smooth the change visually.
            if (reached !== wasReachedRef.current[i]) {
              wasReachedRef.current[i] = reached;
              dot.style.backgroundColor = reached
                ? "var(--color-white)"
                : "var(--color-white-muted)";
              // Removed: details.style.maxHeight write.
              // max-height triggered layout reflow on the justify-between
              // flex parent every frame of the 0.35s CSS transition,
              // causing the entire section to jitter during scroll. The
              // details panel is now position:absolute (see JSX below) and
              // reveals via opacity + translateY only, which are
              // compositor-only and don't touch layout.
            }
          }
        },
      });

      if (titleRef.current) {
        gsap.from(titleRef.current, {
          scale: 0.5,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      }

      return () => {
        anim.kill();
        ScrollTrigger.removeEventListener("refresh", measure);
      };
    }, section);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [EVENTS.length]);

  return (
    // React-owned root wrapper: GSAP ScrollTrigger's pin-spacer nests INSIDE this
    // div, so React only ever moves/removes this node (never the pinned <section>)
    // when the editor toggles a section on/off — avoids the removeChild DOM error.
    <div className="relative w-full">
    <section
      ref={sectionRef}
      className="relative z-10 flex w-full flex-col overflow-x-clip bg-cover bg-center"
      style={{
        // Height floor is viewport-height-INDEPENDENT: only frame width (cqw) +
        // event count (rem) — the same units as the events and the w-full
        // divider below. So no device height can push the last event under the
        // scallop divider; 125svh only ADDS room on tall screens (preserving
        // the original look there). min-height (not a fixed height) also lets
        // the section grow if an event name ever wraps to a second line.
        //   2rem     — section title block + first-row offset
        //   n*10rem  — per-event advance (gap-24 6rem + mt-5 + name line); grows
        //              automatically as events are added to the `events` prop
        //   52cqw    — bottom scallop divider + crowning-wreath reserve; scales
        //              with frame width so it clears on any screen width
        minHeight: `max(125svh, calc(2rem + ${TIMELINE_EVENT_COUNT} * 10rem + 52cqw))`,
        // Only paint the CSS water-bg when the WebGL canvas is OFF (slow
        // connection / save-data). When the canvas is on, it covers the
        // same area with its own GPU-resident water texture — keeping
        // both means two 17 MB uploads of the same image and a wasted
        // paint pass behind the canvas every frame.
        backgroundImage: rippleCommitted
          ? undefined
          : `url('${sharedUrl("/timeline-water-bg.webp")}')`,
        // iOS Safari white-screen fix: pinned sections combined with
        // descendant transform-3D layers (WebGL canvas + multiple
        // will-change ancestors) can have the compositor drop the
        // section's backdrop layer mid-pin, rendering the body's white
        // background instead. Forcing a stable stacking context + GPU
        // layer keeps the section's paint committed.
        isolation: "isolate",
      }}
    >
      {/* Soft white overlay for text contrast on aqua water */}
      <div className="pointer-events-none absolute inset-0 bg-white/15" />

      {/* WebGL ripple canvas — mounted only on capable devices. Capability
          is decided ONCE, upfront, by shouldEnableRipple() — which runs
          the WebGL-availability probe, the reduced-motion check and the
          CPU-core / RAM gates — before the canvas is ever served. It is
          never re-evaluated, so a working ripple never swaps mid-view. The
          error boundary is the sole exception — it catches an actual
          runtime WebGL crash (context loss, shader error, GPU OOM, chunk
          load failure) and latches to the static fallback, since a broken
          canvas cannot be left on screen. */}
      {rippleEnabled && !committedFallback && (
        <RippleErrorBoundary
          onError={handleRippleFailure}
          fallback={<RippleStaticFallback />}
        >
          {/* Mounted while capable AND not yet committed-to-fallback, so it
              can warm during the cover. It sits hidden (opacity 0) behind the
              static fallback until its warm-up commits to the ripple — at
              which point `revealed` flips it visible (off-screen, no swap). */}
          <RippleWaterScene revealed={rippleCommitted} onCommit={handleCommit} />
        </RippleErrorBoundary>
      )}

      {/* Fallback decoration — the COMPLETE static look, shown by default
          until (and unless) the ripple is committed. The CSS water-bg on the
          section element above provides the water; RippleStaticFallback adds
          the two swaying lotus clusters. Incapable device → stays forever. */}
      {!rippleCommitted && <RippleStaticFallback />}

      {/* Section title */}
      <h2
        ref={titleRef}
        className="pointer-events-none relative z-20 mt-12 ml-10 text-start font-cormorant uppercase italic text-xl font-bold"
        style={{
          color: "var(--color-time-title)",
          fontSize: "clamp(1rem, 6cqw, 1.5rem)",
        }}
      >
        {title}
      </h2>

      {/* Vertical line — base. Stretches from below the heading to the
          section bottom. z-20 keeps it above the ripple canvas (z-10). */}
      <div
        className="pointer-events-none absolute z-20"
        style={{
          left: "calc(5rem + 4px)",
          top: "6rem",
          bottom: 0,
          width: "1px",
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--color-white-muted) 0 6px, transparent 6px 8px)",
        }}
      />
      {/* Progress line — same vertical extent as the base line above
          (top: 6rem → bottom: 0). Fill is driven by transform: scaleY()
          from transform-origin: top, written by the scrub onUpdate. That
          stays on the compositor; the previous height-write approach
          was triggering per-frame layout invalidations on this element. */}
      <div
        ref={lineRef}
        className="pointer-events-none absolute z-20"
        style={{
          left: "calc(5rem + 4px)",
          top: "6rem",
          bottom: 0,
          width: "1px",
          backgroundColor: "var(--color-white)",
          transformOrigin: "top",
          transform: "scaleY(0)",
        }}
      />

      {/* Timeline — pointer-events-none so finger/mouse passes through to
          the ripple canvas behind it. Nothing here is interactive. */}
      <div className="pointer-events-none relative z-20 mx-auto flex w-full flex-1 flex-col justify-start gap-24 pb-60  pl-20 pr-8 md:pb-78">
        {EVENTS.map((event, i) => (
          <div key={i} className="relative flex items-start gap-3 mt-5">
            {/* Date block — rendered for any event whose data carries a
                non-empty `date`. Sits in the left gutter (pl-20) to the LEFT
                of the dot. position:absolute so the right side (dot / name /
                details) is byte-for-byte unaffected. */}
            {event.date && (
              <div
                ref={(el) => {
                  dateBlockRefs.current[i] = el;
                }}
                className="pointer-events-none absolute right-full top-8 mr-3 text-right -mt-3"
                style={{
                  color: "var(--color-white)",
                  opacity: 0,
                  transform: "translateY(12px)",
                }}
              >
                <div
                  className="font-cormorant leading-none"
                  style={{ fontSize: "clamp(1.5rem, 5cqw, 2rem)" }}
                >
                  {event.date.day}
                  <sup style={{ fontSize: "0.5em" }}>
                    {event.date.ordinalSuffix}
                  </sup>
                </div>
                <div
                  className="mt-1 font-montserrat uppercase tracking-widest leading-none"
                  style={{ fontSize: "clamp(0.6rem, 2.3cqw, 0.75rem)" }}
                >
                  {event.date.monthShort}
                </div>
              </div>
            )}
            {/* Dot — centered on the vertical line, animates color + box-shadow as you scroll */}
            <div
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              className="relative z-10 mt-8 shrink-0 rounded-full"
              style={{
                width: "9px",
                height: "9px",
                backgroundColor:
                  i === 0 ? "var(--color-white)" : "var(--color-white-muted)",
                transition: "background-color 0.3s",
              }}
            />

            {/* Event content */}
            <div className="relative flex-1 min-w-0 mt-5">
              <h3
                ref={(el) => {
                  nameRefs.current[i] = el;
                }}
                className="font-cormorant font-medium leading-tight uppercase"
                style={{
                  color: "var(--color-white)",
                  opacity: i === 0 ? 1 : 0.3,
                  fontSize: "clamp(1rem, 5cqw, 2rem)",
                }}
              >
                {event.name}
              </h3>

              {/* Details panel — position:absolute so it sits in the gap
                  below the name without participating in the parent flex
                  layout. The previous max-height approach forced
                  justify-between to reflow every frame and was the source
                  of visible jitter during the pinned scroll. Reveal now
                  rides on opacity + translateY only (compositor-only). */}
              <div
                ref={(el) => {
                  detailRefs.current[i] = el;
                }}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "80%",
                  opacity: i === 0 ? 1 : 0,
                  transform: i === 0 ? "translateY(0)" : "translateY(12px)",
                }}
              >
                <p
                  className="mt-1 text-start font-montserrat leading-normal"
                  style={{
                    color: "var(--color-white)",
                    fontSize: "clamp(0.6rem, 2.3cqw, 0.7rem)",
                  }}
                >
                  {event.description}
                </p>
                <p
                  className="mt-1.5 flex items-center gap-1.5 font-montserrat tracking-widest uppercase text-center"
                  style={{
                    color: "var(--color-white)",
                    fontSize: "clamp(0.9rem, 2.5cqw, 1rem)",
                  }}
                >
                  <Clock className="w-[1em] h-[1em] shrink-0" />
                  <span className="font-semibold" style={{
                    color: "var(--color-white)",
                    fontSize: "clamp(0.9rem, 2.5cqw, 1rem)",
                  }}>{event.time}</span>
                  <span className="font-normal" style={{
                    color: "var(--color-white)",
                    fontSize: "clamp(0.7rem, 2.5cqw, 0.7rem)",
                  }}>{event.period}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom-seam scallop divider + crowning wreath — INSIDE the section so they get pinned with it. Renders at natural aspect (no crop, no compression). Clearance to the last event is guaranteed by the section's count-scaled min-height (see the `minHeight` on <section> above), which grows with the event count and reserves ~52cqw at the bottom for this divider + the wreath that extends above its top edge. */}
      <div className="pointer-events-none absolute -bottom-30 left-0 right-0 z-30">
        <Image
          src={asset("/images/divider-scallop-2.webp")}
          alt=""
          width={4316}
          height={2348}
          className="block w-full"
        />
        {/* Floral wreath at top-center of the cropped divider */}
        <div className="pointer-events-none absolute left-1/2 top-5 w-[62%] -translate-x-1/2 -translate-y-1/2">
          <Image
            src={asset("/images/couple-floral-wreath.webp")}
            alt=""
            width={3768}
            height={3035}
            className="w-full"
          />
        </div>
      </div>
    </section>
    </div>
  );
}
