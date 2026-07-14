"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { registerSwayTween, unregisterSwayTween } from "@/lib/swayRegistry";

type SwayDirection = "left" | "right";
const swayConfigs: Record<SwayDirection, { duration: number; rotation: number[] }> = {
  // smaller rotation values and symmetric keyframes produce a more natural sway
  left: { duration: 8, rotation: [-6, 6] },
  right: { duration: 7, rotation: [6, -6] },
};

export default function Sway({
  children,
  direction = "left",
  className = "",
  origin = "auto",
  intensity = 1,
  speed = 1,
}: {
  children: React.ReactNode;
  direction?: SwayDirection;
  className?: string;
  origin?: "auto" | "top-left" | "bottom-left" | "visual-bottom" | "enter-right" | { x: number; y: number };
  /** Scale rotation amplitude (0.5 = half, 1 = default, 2 = double) */
  intensity?: number;
  /** Scale animation speed (0.5 = slower, 1 = default, 2 = faster) */
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const config = swayConfigs[direction];
    // Ensure transform origin is set on the element (use gsap.set to avoid timing issues)
    gsap.set(el, { transformOrigin: "bottom center" });

    // If the visual element (image) doesn't occupy the full wrapper height,
    // compute the transform origin according to the requested `origin` mode
    // and set a pixel-based transformOrigin so rotation pivot matches the desired point.
    let rafId: number | null = null;
    let imgOnLoad: (() => void) | null = null;
    let resizeRaf: number | null = null;

    const computeAndSetOrigin = () => {
      try {
        const elRect = el.getBoundingClientRect();
        const img = el.querySelector("img") as HTMLImageElement | null;
        // default origin: center-bottom of wrapper
        let originX = elRect.width / 2;
        let originY = elRect.height;

        if (typeof origin === "object" && origin !== null && "x" in origin && "y" in origin) {
          // custom pixel coords relative to wrapper
          originX = origin.x;
          originY = origin.y;
        } else if (origin === "top-left") {
          if (img) {
            const imgRect = img.getBoundingClientRect();
            originX = imgRect.left - elRect.left;
            originY = imgRect.top - elRect.top;
          } else {
            originX = 0;
            originY = 0;
          }
        } else if (origin === "bottom-left") {
          if (img) {
            const imgRect = img.getBoundingClientRect();
            originX = imgRect.left - elRect.left;
            originY = imgRect.bottom - elRect.top;
          } else {
            originX = 0;
            originY = elRect.height;
          }
        } else if (origin === "enter-right") {
          // pivot at the point where the image meets the right edge of the viewport
          if (img) {
            const imgRect = img.getBoundingClientRect();
            const viewportRight = window.innerWidth || document.documentElement.clientWidth;
            const intersectionX = Math.min(imgRect.right, viewportRight);
            originX = intersectionX - elRect.left;
            originY = imgRect.bottom - elRect.top; // visual bottom
          }
        } else if (origin === "visual-bottom" || origin === "auto") {
          if (img) {
            const imgRect = img.getBoundingClientRect();
            originX = imgRect.left - elRect.left + imgRect.width / 2;
            originY = imgRect.bottom - elRect.top;
          }
        }

        // clamp to wrapper bounds
        originX = Math.max(0, Math.min(originX, elRect.width));
        originY = Math.max(0, Math.min(originY, elRect.height));

        gsap.set(el, { transformOrigin: `${originX}px ${originY}px` });
      } catch (e) {
        // ignore measurement errors
      }
    };

    const imgEl = el.querySelector("img") as HTMLImageElement | null;
    if (imgEl) {
      if (imgEl.complete && imgEl.naturalWidth) {
        computeAndSetOrigin();
      } else {
        imgOnLoad = () => {
          computeAndSetOrigin();
          if (imgEl && imgOnLoad) imgEl.removeEventListener("load", imgOnLoad);
          imgOnLoad = null;
        };
        imgEl.addEventListener("load", imgOnLoad);
        // also compute after a frame as a fallback
        rafId = requestAnimationFrame(computeAndSetOrigin);
      }
    } else {
      // no image descendant - compute origin based on wrapper
      rafId = requestAnimationFrame(computeAndSetOrigin);
    }

    // Recompute origin on resize (throttled via rAF)
    const onResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        computeAndSetOrigin();
        resizeRaf = null;
      });
    };
    window.addEventListener("resize", onResize);

    // Detect if element (or its computed transform) has a negative scaleX (mirror) and
    // invert rotation values so mirrored elements still sway visually in the same direction.
    let scaleX = 1;
    try {
      const cs = window.getComputedStyle(el);
      const matrix = cs.transform || cs.webkitTransform;
      if (matrix && matrix !== "none") {
        // Use DOMMatrixReadOnly when available to read scaleX
        // Fallback to parsing matrix(a, b, c, d, e, f)
        try {
          // DOMMatrixReadOnly is supported in modern browsers
          // @ts-ignore DOMMatrixReadOnly exists in runtime
          const m = new DOMMatrixReadOnly(matrix);
          scaleX = m.a;
        } catch {
          const match = matrix.match(/matrix\(([^,]+),/);
          if (match) scaleX = parseFloat(match[1]);
        }
      }
    } catch (e) {
      // ignore and keep scaleX = 1
    }

    const baseRotation = config.rotation[0]; // e.g. -6 or 6
    const flipped = scaleX < 0 ? -1 : 1;

    // Randomize amplitude and duration slightly per instance
    const ampVariance = 0.85 + Math.random() * 0.3; // 0.85..1.15
    const amplitude = baseRotation * intensity * flipped * ampVariance;

    const durationVariance = 0.85 + Math.random() * 0.3;
    const halfCycle = (config.duration / speed) * durationVariance;

    // Start from center (0), sway to one side, then yoyo back — no jerk
    gsap.set(el, { rotation: 0 });

    const tween = gsap.to(el, {
      rotation: amplitude,
      duration: halfCycle,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    // Desynchronize instances so they don't all move in lockstep
    tween.progress(Math.random());

    // Register so SmoothScroll can pause/resume the whole flock during scroll
    registerSwayTween(tween);

    return () => {
      unregisterSwayTween(tween);
      tween.kill();
    };
  }, [direction, intensity, speed]);

  return (
    <div ref={ref} className={className} style={{ transformOrigin: "bottom center", willChange: "transform" }}>
      {children}
    </div>
  );
}
