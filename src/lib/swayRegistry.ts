// Module-level registry of the perpetual <Sway> yoyo tweens.
// SmoothScroll pauses all of them during active scroll and resumes them
// on idle, so the GSAP ticker isn't running ~8 transform-rotate tweens
// while Lenis + ScrollTrigger are also driving the scroll path.
import type { gsap } from "gsap";

const tweens = new Set<gsap.core.Tween>();

export function registerSwayTween(t: gsap.core.Tween) {
  tweens.add(t);
}

export function unregisterSwayTween(t: gsap.core.Tween) {
  tweens.delete(t);
}

export function pauseAllSways() {
  tweens.forEach((t) => t.pause());
}

export function resumeAllSways() {
  tweens.forEach((t) => t.resume());
}
