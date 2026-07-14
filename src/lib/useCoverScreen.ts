"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCover } from "@/components/CoverContext";

// ═══════════════════════════════════════════════════════════════════════════
//  The CoverScreen's entire behaviour. Identical in every template — copy it,
//  don't fork it. The cover DESIGNS (src/components/covers/*) are then pure
//  appearance: markup, classes, colours, assets, copy. Swap the design, keep
//  the machine.
// ═══════════════════════════════════════════════════════════════════════════
//
//  THE CLOCK. Every delay below is an offset from `loadingComplete`, which
//  LoadingScreen fires the instant `preloadAssets()` resolves (call it t0).
//  The loader then holds at 100% for 400ms and fades for 600ms, so its overlay
//  unmounts at t0+1000 — which is why a `photoDelay` of 1000 means "the photo
//  begins fading up exactly as the curtain clears".
//
//  Anchoring on t0 (rather than on the loader's fade, or its unmount) is what
//  lets all six templates share one hook: previously each template's gate fired
//  at a different point in that sequence, so identical-looking delays produced
//  different on-screen timings.

export type CoverTimings = {
  /** ms from t0. Only set this if the design fades its couple name in;
   *  most leave the name at constant opacity and ignore `showText`. */
  textDelay?: number;
  /** ms from t0 until the cover photo starts fading up. */
  photoDelay: number;
  /** ms from t0 until the "Open Invitation" button starts fading up. */
  buttonDelay: number;
};

// ── The staged reveal, owned by the DESIGN ───────────────────────────────────
// Each cover design choreographs its own entrance, so the timings live with the
// design that uses them. `active` is the engine's go-signal (= loadingComplete).
// Under `prefers-reduced-motion` the stagger is skipped and everything reveals
// at once; the design's own opacity transitions still run, so it fades rather
// than snaps.
export function useCoverReveal(
  active: boolean,
  { textDelay = 0, photoDelay, buttonDelay }: CoverTimings
) {
  const [showText, setShowText] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (!active) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShowText(true);
      setShowPhoto(true);
      setShowButton(true);
      return;
    }

    const timers = [
      setTimeout(() => setShowText(true), textDelay),
      setTimeout(() => setShowPhoto(true), photoDelay),
      setTimeout(() => setShowButton(true), buttonDelay),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active, textDelay, photoDelay, buttonDelay]);

  return { showText, showPhoto, showButton };
}

// ── The engine, owned by CoverScreen ─────────────────────────────────────────
// Audio, the enter gate, the mute toggle, and the handoff to the page. Knows
// nothing about how any particular cover looks.
export function useCoverScreen() {
  const { onEnter, audioReady, loadingComplete } = useCover();

  // `entered` is LOCAL, and deliberately distinct from the context's `entered`.
  // This one unmounts the cover; the context one (set via onEnter() below) is
  // what HeroSection watches to start its GSAP entrance and what SmoothScroll
  // watches to unlock body scroll. Both flip 800ms after the tap.
  const [entered, setEntered] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [muted, setMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const handleEnter = useCallback(() => {
    setHiding(true);

    // Only play if the loader actually preloaded the track. On the timeout path
    // `audioReady` stays false and the invitation runs silently — no music, and
    // no mute button for music that isn't there.
    if (audioReady) {
      const audio = audioRef.current;
      if (audio) {
        audio.play().catch(() => { });
      }
    }

    // Let the cover's 700ms fade finish, then unmount it and signal the page.
    setTimeout(() => {
      setEntered(true);
      onEnter();
    }, 800);
  }, [audioReady, onEnter]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }, []);

  return {
    entered,
    hiding,
    muted,
    audioReady,
    audioRef,
    loadingComplete,
    handleEnter,
    toggleMute,
  };
}
