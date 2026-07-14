"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCover } from "@/components/CoverContext";
import { sharedUrl } from "@/lib/assets";

// ═══════════════════════════════════════════════════════════════════════════
//  The loader — ENGINE. One copy, every template.
// ═══════════════════════════════════════════════════════════════════════════
//  It drives the preload race (Image/Audio elements, a progress bar, a 10s
//  timeout, the audio-capability probe) and the hand-off to the cover. None of
//  that is a design decision, so none of it belongs to a template.
//
//  What IS template-owned is the *manifest* — the fixed list of art to preload —
//  and that is data, not code: it arrives as `assets`, resolved server-side into
//  the template's own namespace (see templates/<slug>/preload.ts).
//
//  It takes only the two strings it prints. The config never reaches it.

const TIMEOUT_MS = 10000; // 10 seconds max loading time

export type LoadingScreenProps = {
  children: React.ReactNode;
  /** The two strings the loader shows. */
  eyebrow: string;
  coupleNames: string;
  /** The template's preload manifest — fully-resolved URLs. */
  assets: string[];
  /** The eyebrow's size + opacity are the only visual knob a template turns. */
  eyebrowClassName?: string;
  eyebrowColor?: string;
};

export default function LoadingScreen({
  children,
  eyebrow,
  coupleNames,
  assets,
  eyebrowClassName = "text-xs",
  eyebrowColor = "rgba(255, 255, 255, 0.7)",
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { setAudioReady, setLoadingComplete } = useCover();

  // The manifest as it stood at MOUNT, held in a ref so a re-render cannot
  // restart the preload.
  //
  // This used to be a `useCallback` keyed on `assets` — and Shell rebuilds that
  // array on every render. On a guest page that is harmless (one render), but the
  // editor re-renders this tree on every keystroke, and the loader would have
  // replayed itself each time. Preloading once per mount is also simply the right
  // behaviour: a photo swapped mid-edit loads lazily, like any other image, and
  // the loading screen is long gone by then anyway.
  const assetsRef = useRef(assets);

  const preloadAssets = useCallback(async () => {
    const imageSources = assetsRef.current;
    const audioSources = [
      sharedUrl("/audio/main_bgm.opus"),
      sharedUrl("/audio/main_bgm.mp3"),
    ];

    const totalAssets = imageSources.length + 1; // +1 for audio
    let loadedCount = 0;
    let aborted = false;
    let audioLoaded = false;
    // Track every Audio element so the timeout branch can abort an in-flight BGM
    // download (~3.9MB) that would otherwise keep competing for bandwidth after
    // we've stopped waiting for it.
    const audioEls: HTMLAudioElement[] = [];

    const onAssetLoad = () => {
      if (aborted) return;
      loadedCount++;
      setProgress(Math.min(loadedCount / totalAssets, 1));
    };

    // Preload images
    const imagePromises = imageSources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            onAssetLoad();
            resolve();
          };
          img.onerror = () => {
            onAssetLoad();
            resolve();
          };
          img.src = src;
        })
    );

    // Preload audio (try opus first, fallback to mp3)
    const audioPromise = new Promise<void>((resolve) => {
      const audio = new Audio();
      audioEls.push(audio);

      const onReady = () => {
        audioLoaded = true;
        onAssetLoad();
        resolve();
      };

      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener(
        "error",
        () => {
          // Try mp3 fallback
          const fallback = new Audio();
          audioEls.push(fallback);
          fallback.addEventListener("canplaythrough", onReady, { once: true });
          fallback.addEventListener(
            "error",
            () => {
              onAssetLoad(); // count as done but audioLoaded stays false
              resolve();
            },
            { once: true }
          );
          fallback.src = audioSources[1];
          fallback.load();
        },
        { once: true }
      );

      audio.src = audioSources[0];
      audio.load();
    });

    // Race: wait for all assets OR timeout
    const allLoaded = Promise.all([...imagePromises, audioPromise]);
    const timeout = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), TIMEOUT_MS)
    );

    const result = await Promise.race([
      allLoaded.then(() => "done" as const),
      timeout,
    ]);

    if (result === "timeout") {
      aborted = true;
      setProgress(1);
      // Audio didn't finish in time: abort the in-flight download so it stops
      // competing for bandwidth. Setting src="" + load() cancels the media fetch.
      // The page then continues with no music and no volume toggle (CoverScreen
      // gates both on audioReady, which stays false here). Image preloads are
      // intentionally left running — we still want every image preloaded before
      // the cover screen shows.
      for (const el of audioEls) {
        el.src = "";
        el.removeAttribute("src");
        el.load();
      }
    }

    if (audioLoaded) {
      setAudioReady(true);
    }
  }, [setAudioReady]);

  // Runs ONCE per mount. The latch is what makes the editor's live preview
  // possible: without it, every keystroke would restart the loader.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    preloadAssets().then(() => {
      // Every asset (incl. the timeline ripple textures) is preloaded and the
      // cover is about to show. Green-light the ripple warm-up — set
      // unconditionally (covers the 10s-timeout path too) and one-way only, so
      // the loading screen's own progress/fade stay fully independent.
      setLoadingComplete(true);
      // Small delay to show 100% briefly
      setTimeout(() => {
        setLoaded(true);
        setTimeout(() => {
          setHidden(true);
        }, 600);
      }, 400);
    });
  }, [preloadAssets, setLoadingComplete]);

  return (
    <>
      {/* Main content — ALWAYS at position 0 in the fragment to prevent tree remount */}
      {children}

      {/* Loading screen overlay — sits on top via fixed positioning, removed after fade */}
      {!hidden && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black transition-opacity duration-600"
          style={{ opacity: loaded ? 0 : 1, pointerEvents: loaded ? "none" : "auto" }}
        >
          <div className="select-none flex flex-col items-center">
            <p
              className={`mb-2 ${eyebrowClassName} font-body tracking-widest uppercase`}
              style={{ color: eyebrowColor }}
            >
              {eyebrow}
            </p>

            <div className="relative py-2">
              {/* Ghost text — low opacity */}
              <h1
                className="font-couple text-[2.375rem] whitespace-nowrap uppercase"
                style={{ color: "rgba(255, 255, 255, 0.15)" }}
              >
                {coupleNames}
              </h1>

              {/* Revealed text — clipped by progress, with negative inset to avoid
                  cropping descenders */}
              <h1
                className="absolute -top-2 -bottom-2 left-0 right-0 flex items-center font-couple text-[2.375rem] whitespace-nowrap uppercase"
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  clipPath: `inset(-10% ${(1 - progress) * 100}% -10% 0)`,
                  transition: "clip-path 0.3s ease-out",
                }}
              >
                {coupleNames}
              </h1>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
