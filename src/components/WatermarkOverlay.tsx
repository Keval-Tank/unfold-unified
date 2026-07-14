"use client";

/* eslint-disable @next/next/no-img-element */
// A purely additive, transparent watermark layer that tiles the unfoldinvite
// logo across the invite in a staggered pattern. Shown only when the build-time
// flag is on (watermark image set). It is `fixed` + `pointer-events-none`, so it
// never affects layout or interaction — the invite beneath renders and behaves
// exactly as it does without this layer.
import { WATERMARK } from "@/lib/watermark";
import { sharedUrl } from "@/lib/assets";

// Watermark tiling — knobs:
//   ROWS        how many logos stack down the height (bump up for denser cover)
//   LOGO_WIDTH  logo size as % of the invite column width (bigger = larger mark)
//   EDGE_SHIFT  horizontal offset that staggers alternate rows so the logo
//               bleeds past opposite edges (puzzle mark peeks left, ® peeks right)
const ROWS = 4;
const LOGO_WIDTH = 20;
const EDGE_SHIFT = 35;

type Mark = { left: number; top: number;  opacity:number };

// One big logo per row, rows evenly spaced down the full height, alternate rows
// zig-zagged left/right for the staggered edge-bleed look. Fully deterministic
// (no randomness) so the pattern is regular and hydration-safe on static export.
const MARKS: Mark[] = (() => {
  const out: Mark[] = [];
  const rowH = 100 / ROWS;
  for (let r = 0; r < ROWS; r++) {
    const isInterior = r !== 0 && r !== ROWS-1;
    out.push({
      left: 50 + (r % 2 === 0 ? -EDGE_SHIFT : EDGE_SHIFT),
      top: r * rowH + rowH / 2,
      opacity : isInterior ? 0.2 : 0.5
    });
  }
  return out;
})();

export default function WatermarkOverlay() {
  if (!WATERMARK) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-250 flex justify-center overflow-hidden pointer-events-none"
    >
      {/* Constrained to the invite's own phone-width column so the watermark
          sits over the invitation (matching the design) and not the desktop
          margins. Mirrors the layout.tsx `max-w-lg` centered column. */}
      <div className="relative h-full w-full max-w-lg overflow-hidden">
        {MARKS.map((m, i) => (
          <img
            key={i}
            src={sharedUrl("/watermark-logo.png")}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute select-none"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: `${LOGO_WIDTH}%`,
              height: "auto",
              opacity: m.opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
