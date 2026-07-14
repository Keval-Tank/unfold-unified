"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import Sway from "@/components/Sway";
import { useCover } from "@/components/CoverContext";
import Pressable from "@/components/Pressable";
import { asset } from "../asset";
import type { GalleryContent } from "@/lib/template-types";

const AUTO_PLAY_DELAY = 5000;
const TRANSITION_MS = 1100;
const SWIPE_THRESHOLD = 50;
const SLIDE_WIDTH_PCT = 80; // focal photo width; the remaining 20% splits into two side peeks
const SLIDE_PEEK_OFFSET_PCT = (100 - SLIDE_WIDTH_PCT) / 2;

// Signed circular distance (in slides) from the focused photo to photo `i`.
// For n=6 → {-2,-1,0,1,2,3}. Because the focus advances with `% n`, a fast or
// backward swipe can never outrun it into empty space the way a clone-strip does —
// so a gap between images is structurally impossible.
// `n` is a parameter, not a module constant: the photo list comes from
// template.json and the editor can add or remove photos at runtime.
function slideOffset(i: number, pointer: number, n: number) {
  let offset = i - pointer;
  if (offset > n / 2) offset -= n;
  if (offset < -n / 2) offset += n;
  return offset;
}

// A CLIENT component: it owns the drag/autoplay carousel and the deferred YouTube
// iframe. `photos` arrives as a list of already-resolved URLs — the section never
// namespaces a path itself, so no template-relative content crosses the boundary.
export default function GallerySection({
  content,
  photos,
}: {
  content: Omit<GalleryContent, "photos" | "included">;
  photos: string[];
}) {
  const N = photos.length;

  const [pointer, setPointer] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The focused slide, wrapped into range at RENDER time. Deleting photos in the
  // editor can leave `pointer` past the end of the shortened list; wrapping here
  // (rather than clamping via setState in an effect) keeps it valid immediately,
  // and `advance` self-corrects from the next step on.
  const focus = N > 0 ? ((pointer % N) + N) % N : 0;

  // Offsets we last rendered, so the next step can spot the photo that wraps
  // across the back seam (its off-screen jump must skip the animation).
  const prevOffsets = useRef<number[]>(photos.map((_, i) => slideOffset(i, 0, N)));

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

  // Step focus. `% N` keeps pointer in range no matter how fast swipes arrive.
  const advance = useCallback(
    (dir: number) => {
      if (N === 0) return;
      setPointer((p) => (((p % N) + N) % N + dir + N) % N);
      setDragPx(0);
    },
    [N]
  );

  const resetAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    if (N < 2) return; // nothing to rotate through
    autoPlayTimer.current = setTimeout(() => advance(1), AUTO_PLAY_DELAY);
  }, [advance, N]);

  useEffect(() => {
    resetAutoPlay();
    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    };
  }, [focus, resetAutoPlay]);

  // Remember the offsets we just rendered so the next step can tell which photo
  // wrapped across the back seam (and must therefore not animate its jump).
  // Also re-sized here when the editor adds or removes a photo (N changes).
  useEffect(() => {
    prevOffsets.current = Array.from({ length: N }, (_, i) => slideOffset(i, focus, N));
  }, [focus, N]);

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

    if (diff < -SWIPE_THRESHOLD) advance(1);
    else if (diff > SWIPE_THRESHOLD) advance(-1);
    else setDragPx(0);
    resetAutoPlay();
  };

  return (
    <section
      className="relative overflow-hidden px-6 py-16 text-center"
      style={{ backgroundImage: `url('${asset("/images/eu-paper.webp")}')` }}
    >
      <ScrollReveal animation="zoomIn">
        <h2
          className="font-heading uppercase leading-none mb-10"
          style={{ color: "var(--color-primary-dark)", fontSize: "clamp(2.25rem, 10\cqw, 3.25rem)" }}
        >
          {content.heading}
        </h2>
      </ScrollReveal>

      {/* YouTube video framed by gold Kundan border */}
      <ScrollReveal animation="fadeInUp" delay={0.2}>
        <div className="relative mx-auto mt-8 w-full max-w-sm">

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
              <Pressable
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
                    className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-110"
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
              </Pressable>
            )}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal animation="fadeInUp" delay={0.3}>
        <p
          className="mx-auto mt-4 max-w-xs text-sm leading-relaxed font-body"
          style={{ color: "var(--color-text-light)" }}
        >
          {content.helperText}
        </p>

        <Pressable
          as="a"
          href={content.youtubeWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-full border px-5 py-1.5 text-xs tracking-wider hover:bg-white/30"
          style={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
          }}
        >
          {content.youtubeButton}
        </Pressable>
      </ScrollReveal>

      {/* Photo gallery — infinite pointer-model carousel (no clones, gap-proof in
          BOTH directions). One focal photo at 80% width with side peeks; every
          photo is one persistent absolutely-positioned node placed by its signed
          circular distance to `pointer`, so autoplay and fast/backward swipes
          never expose empty space. */}
      <div
        className="relative -mx-6 mt-25 select-none touch-pan-y overflow-hidden"
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
        {/* Invisible focus-sized card gives the container its height (the real
              photos are absolutely positioned on top of it). */}
        <div
          aria-hidden
          className="invisible mx-auto px-1"
          style={{ width: `${SLIDE_WIDTH_PCT}%` }}
        >
          <div className="aspect-2/3" />
        </div>

        {photos.map((photo, i) => {
          const offset = slideOffset(i, focus, N);
          // The photo crossing the back seam jumps more than one slot; it is
          // off-screen, so skip its transition to teleport it invisibly.
          // A photo just added in the editor has no previous offset — NaN here
          // is falsy for `>`, so it simply animates in.
          const wrapping = Math.abs(offset - prevOffsets.current[i]) > 1;
          const animate = !isDragging && !wrapping;
          return (
            <div
              key={i}
              className="absolute top-0 px-1"
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
                className="relative aspect-2/3 overflow-hidden rounded-lg border"
                style={{
                  backgroundColor: "var(--color-cream-dark)",
                  borderColor: "var(--color-divider)",
                }}
              >
                <Image
                  src={photo}
                  alt={`Wedding gallery photo ${i + 1}`}
                  fill
                  sizes="(max-width: 512px) 80vw, 410px"
                  className="object-cover"
                  draggable={false}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* eu-redesign floral accent — left edge, anchored at 30% from top, with gentle sway */}
      <Sway
        direction="right"
        intensity={0.5}
        speed={0.9}
        origin="bottom-left"
        className="pointer-events-none absolute top-[25%] -left-[15%] z-30 w-1/3"
      >
        <Image
          src={asset("/images/eu-floral-corner.webp")}
          alt=""
          width={576}
          height={883}
          sizes="50vw"
          className="block w-full h-auto"
        />
      </Sway>
    </section>
  );
}
