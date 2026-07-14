"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import Pressable from "@/components/Pressable";
import Sway from "@/components/Sway";
import { useCover } from "@/components/CoverContext";
import { asset } from "../asset";
import type { GalleryContent } from "@/lib/template-types";

const AUTO_PLAY_DELAY = 5000;
const TRANSITION_MS = 1100;
const SWIPE_THRESHOLD = 50;
// One photo is the focal point at 80% of the carousel width. The previous
// and next photos peek in on each side (cropped is fine — they're hints).
const SLIDE_WIDTH_PCT = 80;
const SLIDE_PEEK_OFFSET_PCT = (100 - SLIDE_WIDTH_PCT) / 2;

// Signed circular distance (in slides) from the focused photo to photo `i`,
// given `n` total photos. 0 is the focus (centre), ±1 are the side peeks,
// |offset| >= 2 is off-screen. Because the pointer advances with `% n`, it can
// never address empty space the way the old clone-strip did on a fast swipe.
function slideOffset(i: number, pointer: number, n: number) {
  let offset = i - pointer;
  if (offset > n / 2) offset -= n;
  if (offset < -n / 2) offset += n;
  return offset;
}

// CLIENT: the photo carousel is stateful (pointer, drag, autoplay) and the
// YouTube iframe is mounted lazily. `photos` arrive as already-resolved URLs, so
// the carousel stays N-dynamic without ever seeing a template path.
export default function GallerySection({
  content,
  photos,
}: {
  content: Omit<GalleryContent, "photos" | "included">;
  photos: string[];
}) {
  const PHOTOS = photos;
  const N = PHOTOS.length;
  // `pointer` is the index of the focused photo (0 = c1); every photo is then
  // positioned by its circular offset to it, so looping is just `% N`.
  const [pointer, setPointer] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Offsets we last rendered, so the next step can spot the single photo that
  // wraps across the back (its off-screen jump must skip the animation).
  const prevOffsets = useRef(PHOTOS.map((_, i) => slideOffset(i, 0, N)));

  // YouTube iframe is heavy (~640KB of JS). Option B preload: a static
  // thumbnail placeholder shows until the iframe mounts; the iframe is
  // mounted in the background a few seconds after the user enters the
  // page (while they're still on the Hero), so the embed is fully loaded
  // before they scroll down here — it never loads during a scroll.
  const { entered } = useCover();
  const [videoMounted, setVideoMounted] = useState(false);

  useEffect(() => {
    if (!entered) return;
    // Delay past the Hero intro animation; the video loads after the
    // map's head-start so the two heavy embeds don't spike together.
    const t = setTimeout(() => setVideoMounted(true), 3500);
    return () => clearTimeout(t);
  }, [entered]);

  // Step the focus to the next/previous photo. `% N` keeps it in range no
  // matter how fast swipes arrive, so there is no edge to overrun.
  const advance = useCallback((dir: number) => {
    setPointer((p) => (p + dir + N) % N);
    setDragPx(0);
  }, [N]);

  const resetAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    autoPlayTimer.current = setTimeout(() => advance(1), AUTO_PLAY_DELAY);
  }, [advance]);

  useEffect(() => {
    resetAutoPlay();
    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    };
  }, [pointer, resetAutoPlay]);

  // After each step, remember the offsets we rendered so the next step can
  // tell which photo wrapped across the back (and must not animate its jump).
  useEffect(() => {
    prevOffsets.current = PHOTOS.map((_, i) => slideOffset(i, pointer, N));
  }, [pointer, PHOTOS, N]);

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    startX.current = clientX;
    currentX.current = clientX;
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    currentX.current = clientX;
    setDragPx(clientX - startX.current);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = currentX.current - startX.current;

    if (diff < -SWIPE_THRESHOLD) {
      advance(1);
    } else if (diff > SWIPE_THRESHOLD) {
      advance(-1);
    } else {
      setDragPx(0);
    }
    resetAutoPlay();
  };

  return (
    <section
      className="relative overflow-hidden px-6 py-16 text-center"
    >
      <ScrollReveal animation="zoomIn">
        <h2
          className="font-cormorant leading-none uppercase"
          style={{
            color: "var(--color-primary-dark)",
            fontSize: "clamp(2rem, 9.5cqw, 4rem)",
          }}
        >
          {content.heading}
        </h2>
      </ScrollReveal>

      {/* YouTube video framed by gold Kundan border */}
      <ScrollReveal animation="fadeInUp" delay={0.2}>
        <div className="relative mx-auto mt-8 w-full max-w-sm">
          {/* Gold Kundan border top */}
          {/* <div className="-mb-1 w-full">
            <Image
              src={asset("/images/divider-gold-kundan.webp")}
              alt=""
              width={4320}
              height={845}
              className="w-full"
            />
          </div> */}

          <div
            className="aspect-video w-full overflow-hidden border-x"
            style={{
              borderColor: "var(--color-gold)",
              backgroundColor: "var(--color-cream-dark)",
            }}
          >
            {videoMounted ? (
              <iframe
                src={content.youtubeEmbedUrl}
                title="Wedding prewedding video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setVideoMounted(true)}
                aria-label="Play wedding video"
                className="group relative block h-full w-full"
              >
                <span
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.18)" }}
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition group-hover:scale-110 group-active:scale-90 group-active:brightness-90"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="#ffffff"
                      style={{ marginLeft: "3px" }}
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </button>
            )}
          </div>

          {/* Gold Kundan border bottom (mirrored vertically) */}
          {/* <div className="-mt-1 w-full -scale-y-100">
            <Image
              src={asset("/images/divider-gold-kundan.webp")}
              alt=""
              width={4320}
              height={845}
              className="w-full"
            />
          </div> */}
        </div>
      </ScrollReveal>

      <ScrollReveal animation="fadeInUp" delay={0.3}>
        <p
          className="mx-auto mt-4 max-w-xs leading-relaxed font-montserrat"
          style={{
            color: "var(--color-text-light)",
            fontSize: "clamp(0.78rem, 2.8cqw, 0.875rem)",
          }}
        >
          {content.helperText}
        </p>

        <Pressable
          as="a"
          href={content.youtubeWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-full border px-5 py-1.5 tracking-wider hover:bg-white/30 font-montserrat"
          style={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
            fontSize: "clamp(0.68rem, 2.4cqw, 0.75rem)",
          }}
        >
          {content.youtubeButton}
        </Pressable>
      </ScrollReveal>

      {/* Photo gallery — swipeable, seamlessly infinite carousel. Each photo is
          one persistent node positioned by its circular offset to `pointer`, so
          looping is just `% N` — no clones, no strip to overrun. */}
      <div className="relative z-10 mt-35">
        <div
          className="relative mt-10 -mx-6 overflow-hidden select-none touch-pan-y"
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => {
            e.preventDefault();
            handleDragStart(e.clientX);
          }}
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={() => {
            if (isDragging) handleDragEnd();
          }}
        >
          {/* Invisible focus-sized card sets the carousel's height so the
              absolutely-positioned photos have something to fill — keeps the
              dimensions pixel-identical to the old flex strip. */}
          <div
            aria-hidden
            className="invisible mx-auto px-3"
            style={{ width: `${SLIDE_WIDTH_PCT}%` }}
          >
            <div className="aspect-2/3" />
          </div>

          {PHOTOS.map((photo, i) => {
            const offset = slideOffset(i, pointer, N);
            // The one photo crossing the back seam jumps by more than a slot;
            // it is off-screen, so skip its transition to teleport it invisibly.
            const wrapping = Math.abs(offset - prevOffsets.current[i]) > 1;
            const animate = !isDragging && !wrapping;
            return (
              <div
                key={i}
                className="absolute top-0 px-3"
                style={{
                  width: `${SLIDE_WIDTH_PCT}%`,
                  left: `${SLIDE_PEEK_OFFSET_PCT}%`,
                  transform: `translateX(calc(${offset * 100}% + ${dragPx}px))`,
                  transitionProperty: animate ? "transform" : "none",
                  transitionDuration: animate ? `${TRANSITION_MS}ms` : "0ms",
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <div
                  className="relative aspect-2/3 overflow-hidden rounded-xl shadow-md"
                  style={{ backgroundColor: "var(--color-cream-dark)" }}
                >
                  <Image
                    src={photo}
                    alt={`Wedding photo ${i + 1}`}
                    fill
                    draggable={false}
                    sizes="(max-width: 640px) 80vw, 480px"
                    className="pointer-events-none object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floral spray pinned to LEFT edge of section, in front of cards (z-30) */}
      <Sway
        direction="left"
        intensity={0.5}
        speed={0.9}
        origin="top-left"
        className="pointer-events-none absolute top-[40%] -left-6 z-30 w-40"
      >
        <Image
          src={asset("/images/floral-corner-spray.webp")}
          alt=""
          width={662}
          height={926}
          className="w-full"
        />
      </Sway>

      {/* Corner floral sprays */}
      <Sway
        direction="right"
        intensity={0.5}
        speed={0.9}
        className="pointer-events-none absolute -bottom-2 -right-4 z-0 w-40"
        origin="enter-right"
      >
        <Image
          src={asset("/images/floral-corner-spray.webp")}
          alt=""
          width={662}
          height={926}
          className="w-full -scale-x-100"
        />
      </Sway>
      {/* <Sway
        direction="right"
        intensity={0.5}
        speed={0.9}
        className="pointer-events-none absolute top-4 -left-4 z-0 w-24 rotate-180"
        origin="top-left"
      >
        <Image
          src={asset("/images/floral-corner-spray.webp")}
          alt=""
          width={662}
          height={926}
          className="w-full"
        />
      </Sway> */}
    </section>
  );
}
