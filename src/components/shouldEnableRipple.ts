// Decides whether the WebGL ripple canvas should mount for this device.
//
// CURRENT BEHAVIOR: the ripple runs on phones AND desktops. A device with
// no usable WebGL context is rejected by the hasWebGL() pre-flight probe.
// Otherwise only reduce-motion users and genuinely weak devices (low-core
// CPUs, or <4 GB RAM on Chromium) fall back to the static water bg + DOM
// lotuses. ?ripple=false|0 force-disables; ?ripple=true|1 force-enables —
// but even the force-enable cannot override the WebGL probe, since forcing
// a <Canvas> onto a no-WebGL device would hard-crash.
//
// This decision is made ONCE, before the canvas mounts, and is never
// re-checked at runtime — a ripple that has been served never swaps to
// the static fallback mid-view. The sole runtime exception is an actual
// WebGL crash, caught by RippleErrorBoundary. The network-only gate
// further below stays commented out.

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
};

type NavigatorWithExtras = Navigator & {
  connection?: NetworkInformation;
  deviceMemory?: number;
};

// WebGL pre-flight probe. Creates a throwaway <canvas>, attempts a WebGL2
// then WebGL1 context, and immediately releases it. Returns false on any
// browser/device where WebGL is unavailable or disabled — so the ripple
// <Canvas> is never even mounted there. Universal (no Chromium-only APIs).
//
// Context-slot hygiene: browsers cap live WebGL contexts (~16). The probe
// explicitly frees its context via WEBGL_lose_context so repeated calls
// can't starve the real <Canvas> of a context.
function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement("canvas");
    gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    // A context that exists but can't answer a basic query is unusable.
    return (
      !!gl &&
      typeof gl.getParameter === "function" &&
      gl.getParameter(gl.VERSION) != null
    );
  } catch {
    return false;
  } finally {
    try {
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      /* ignore — best-effort cleanup */
    }
  }
}

export function shouldEnableRipple(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const ripParam = params.get("ripple");

  // 1. ?ripple=false|0 — force-disable wins over everything.
  if (ripParam === "false" || ripParam === "0") {
    return false;
  }

  // 2. WebGL pre-flight probe. A device with no usable WebGL context must
  //    NEVER mount <Canvas> — not even ?ripple=true can override this,
  //    because forcing the canvas there would hard-crash. Runs before the
  //    force-enable below for exactly that reason.
  if (!hasWebGL()) {
    return false;
  }

  // 3. ?ripple=true|1 — force-enable, bypassing the capability gates below
  //    (handy for previewing on a phone) but not the WebGL probe above.
  if (ripParam === "true" || ripParam === "1") {
    return true;
  }

  // ── Touch-device gate ───────────────────────────────────────────────
  // `(pointer: coarse)` = primary input is touch (phone/tablet); a
  // touchscreen laptop reports `fine` for its trackpad and is unaffected.
  //
  // DISABLED 2026-05-21: this blanket touch-device block made the ripple
  // desktop-only. A wedding invite is opened mostly on phones, so phones
  // are now eligible. Per-device capability will instead be decided by a
  // detect-gpu pre-filter + a live FPS measurement (see plan) — this
  // crude all-or-nothing gate is the wrong tool. Re-enable by
  // uncommenting the block below.
  // if (window.matchMedia?.("(pointer: coarse)").matches) {
  //   return false;
  // }

  // ── Device-capability gates ─────────────────────────────────────────
  // Still applied to desktops: a weak/low-RAM desktop or a reduce-motion
  // user also falls back to the static water bg + DOM lotuses.

  // 1. Accessibility — user asked OS to reduce motion. Hard veto.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  // 2. CPU cores. Catches iPhone 6/7/8/SE-1 (2 cores) + old Androids.
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores < 4) return false;

  // 3. Pixel-budget × CPU gate. WebGL ripple shades 2 full-viewport FBOs
  //    + a composite pass per frame. At retina dpr the fragment cost
  //    scales with viewport-pixels × dpr². A mid-tier CPU (<6 cores)
  //    paired with a >5 MP framebuffer is where dropped frames start.
  //    Catches iPhone X-class and mid-tier Android phones at full DPR.
  const dpr = window.devicePixelRatio || 1;
  const megapixels =
    (window.innerWidth * window.innerHeight * dpr * dpr) / 1_000_000;
  if (typeof cores === "number" && cores < 6 && megapixels > 5) {
    return false;
  }

  // 4. Device memory (Chrome/Edge). <4 GB RAM → block.
  const mem = (navigator as NavigatorWithExtras).deviceMemory;
  if (typeof mem === "number" && mem < 4) return false;

  // Network conditions (Chrome/Edge/Chrome-Android). Original gate.
  // COMMENTED OUT so that the WebGL water ripple effect is enabled on all devices by default.
  // const conn = (navigator as NavigatorWithExtras).connection;
  // if (conn) {
  //   if (conn.saveData) return false;
  //   if (
  //     conn.effectiveType &&
  //     ["slow-2g", "2g", "3g"].includes(conn.effectiveType)
  //   ) {
  //     return false;
  //   }
  //   if (typeof conn.downlink === "number" && conn.downlink < 1.5) {
  //     return false;
  //   }
  // }

  return true;
}
