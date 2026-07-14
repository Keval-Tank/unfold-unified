"use client";

import Image from "next/image";
import Sway from "@/components/Sway";
import { sharedUrl } from "@/lib/assets";

/**
 * Static (non-WebGL) decoration for the Timeline section's water area:
 * the two gently-swaying lotus clusters. Rendered by default until the ripple
 * is committed (incapable device, warm-up timed out, or a runtime crash).
 *
 * Shared by both the TimelineSection `!rippleCommitted` branch and the
 * RippleErrorBoundary fallback, so the two render identical markup. Uses the
 * same `lotus-group.webp` (1948×1490) as the WebGL lotuses, so the static and
 * live looks line up — which is why the placement is a prop here too, matching
 * RippleWaterScene's LotusLayout.
 *
 * The water background itself stays as the <section>'s CSS background
 * (TimelineSection), keyed off `rippleCommitted` — unchanged.
 */

/** Where each lotus sits and how big it is. The ONLY thing templates change. */
export type StaticLotusLayout = {
  topRight: { className: string; intensity?: number; speed?: number };
  lowerLeft: { className: string; intensity?: number; speed?: number };
};

/** Saffron's placement — the defaults. */
export const STATIC_LOTUS_DEFAULTS: StaticLotusLayout = {
  topRight: {
    className: "pointer-events-none absolute right-0 top-0 z-10 w-[35%]",
    intensity: 2,
    speed: 1.4,
  },
  lowerLeft: {
    className: "pointer-events-none absolute -left-10 top-[65%] z-10 w-[28%]",
    intensity: 2,
    speed: 1.4,
  },
};

export default function RippleStaticFallback({
  lotus = STATIC_LOTUS_DEFAULTS,
}: {
  lotus?: StaticLotusLayout;
}) {
  return (
    <>
      <div className={lotus.topRight.className}>
        <Sway
          direction="right"
          intensity={lotus.topRight.intensity}
          speed={lotus.topRight.speed}
        >
          <Image
            src={sharedUrl("/lotus-group.webp")}
            alt=""
            width={1948}
            height={1490}
            className="h-auto w-full"
          />
        </Sway>
      </div>
      <div className={lotus.lowerLeft.className}>
        <Sway
          direction="left"
          intensity={lotus.lowerLeft.intensity}
          speed={lotus.lowerLeft.speed}
        >
          <Image
            src={sharedUrl("/lotus-group.webp")}
            alt=""
            width={1948}
            height={1490}
            className="h-auto w-full"
          />
        </Sway>
      </div>
    </>
  );
}
