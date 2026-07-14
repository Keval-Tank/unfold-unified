"use client";

import { createPortal } from "react-dom";
import Pressable from "@/components/Pressable";
import { useCoverScreen } from "@/lib/useCoverScreen";
import { sharedUrl } from "@/lib/assets";
import type { CoverData, CoverDesignComponent } from "@/components/covers-types";

// The cover ENGINE. It owns the background audio, the enter gate, the mute
// button and the teardown — never the appearance.
//
// Both the DESIGN and its DATA are resolved on the SERVER (see Shell.tsx) and
// handed in. Two consequences:
//   • `cover` carries only what the design draws — one image URL and three
//     strings. Not the template, not the slug, not the design id.
//   • Only the ACTIVE cover component reaches the browser. Resolving the
//     registry here instead would pull every template's cover into the bundle
//     of every page.
export default function CoverScreen({
  children,
  cover,
  CoverDesign,
}: {
  children: React.ReactNode;
  cover: CoverData;
  CoverDesign: CoverDesignComponent | null;
}) {
  const {
    entered,
    hiding,
    muted,
    audioReady,
    audioRef,
    loadingComplete,
    handleEnter,
    toggleMute,
  } = useCoverScreen();

  return (
    <>
      {/* Background audio — only render if audio was preloaded */}
      {audioReady && (
        <audio ref={audioRef} loop preload="auto">
          <source src={sharedUrl("/audio/main_bgm.opus")} type="audio/ogg; codecs=opus" />
          <source src={sharedUrl("/audio/main_bgm.mp3")} type="audio/mpeg" />
        </audio>
      )}

      {/* Cover screen — the active design draws itself; `active` is its
          go-signal, and it calls onEnter when the user taps its open control.
          CoverDesign is not a component defined during render: it is a lookup in
          a static registry of module-level components. Resolving it per render
          (rather than once at module scope) is what lets the editor swap the
          cover design live. */}
      {!entered && CoverDesign && (
        // eslint-disable-next-line react-hooks/static-components
        <CoverDesign
          active={loadingComplete}
          hiding={hiding}
          onEnter={handleEnter}
          eyebrow={cover.eyebrow}
          button={cover.button}
          coupleNames={cover.coupleNames}
          image={cover.image}
        />
      )}

      {/* Main content */}
      {children}

      {/* Mute/unmute button — portaled to <body> so it escapes the
          container-query context. The page wrapper in layout.tsx has
          `container-type: inline-size` (needed for cqw units), which makes
          it a containing block for position:fixed descendants — without
          the portal the button anchored to the bottom of that full-height
          wrapper (the last section) instead of the viewport. */}
      {entered && audioReady && typeof document !== "undefined" &&
        createPortal(
          <Pressable
            onClick={toggleMute}
            aria-label={muted ? "Unmute background music" : "Mute background music"}
            className="fixed z-50 flex h-10 w-10 items-center justify-center rounded-full shadow-lg border border-white/30 backdrop-blur-xl"
            style={{
              backgroundColor: "rgba(139, 115, 85, 0.25)",
              color: "var(--color-white)",
              right: "max(1.5rem, calc((100vw - 32rem) / 2 + 1.5rem))",
              // Static bottom offset. An earlier Visual-Viewport "lift" tracked the
              // browser's bottom chrome, but on iOS Safari the chrome is at the TOP,
              // so the button slid up and down as the URL bar collapsed on scroll.
              // We trade the Brave/Opera bottom-nav case (button may sit behind it)
              // to keep iOS Safari rock-stable, since that's the dominant viewing
              // surface here. `env(safe-area-inset-bottom)` clears the home indicator.
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
            }}
          >
            {muted ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </Pressable>,
          document.body
        )}
    </>
  );
}
