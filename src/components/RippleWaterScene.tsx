"use client";

import { useRef, useMemo, useEffect, useState, useCallback, memo } from "react";
import { Canvas, useFrame, useThree, createPortal } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import { useCover } from "@/components/CoverContext";
import { sharedUrl } from "@/lib/assets";

// Warm-up budget: the canvas gets this long (during the static cover) to
// compile shaders + upload textures invisibly. Primed within the budget →
// the live ripple is committed; otherwise the static fallback is, for the
// whole session. ~500ms = good + most mid-range phones pass; only quite slow
// devices fall back.
const WARM_BUDGET_MS = 500;
// How many real frames the warm burst must paint to count as "primed". Frame
// 1 pays the one-time cold start (compile shaders, allocate FBOs, upload
// textures); frames 2–3 are cheap repeats that confirm the loop is steady and
// let the wall-clock budget measure that frame 1 finished in time. All three
// render the same calm-water scene — they differ only in time.
const WARM_FRAMES_TO_PRIME = 3;

// ── Procedural stamp texture (ring) ────────────────────────────────────
// 256×256 canvas-rendered radial gradient used as the click "pebble drop"
// stamp on the displacement FBO. Hollow center → bright ring at ~70% radius
// → fade to transparent.
function useRingTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    // Multi-wavefront: three concentric rings of decreasing intensity at
    // ~30% / ~50% / ~70% radii — looks like a real drop ripple set.
    grad.addColorStop(0.00, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.22, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.30, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.38, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.46, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.52, "rgba(255, 255, 255, 0.6)");
    grad.addColorStop(0.58, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.66, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.72, "rgba(255, 255, 255, 0.3)");
    grad.addColorStop(0.78, "rgba(255, 255, 255, 0)");
    grad.addColorStop(1.00, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

// ── Waves scene ────────────────────────────────────────────────────────
// Pool of 20 invisible ring meshes. On click, the wrapper pushes (x, y,
// fireAt) entries into clickQueue; the frame loop drains entries whose
// fireAt has elapsed and stamps a ring at that position. Each click
// schedules a primary + a 110ms-delayed echo for a pebble-drop splash feel.
function Waves({
  clickQueue,
}: {
  clickQueue: React.RefObject<
    { x: number; y: number; fireAt: number; scale: number }[]
  >;
}) {
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringIdx = useRef(0);
  const ringTex = useRingTexture();

  const stampRing = (cx: number, cy: number, scale: number) => {
    ringIdx.current = (ringIdx.current + 1) % ringRefs.current.length;
    const m = ringRefs.current[ringIdx.current];
    if (!m) return;
    m.position.x = cx;
    m.position.y = cy;
    m.visible = true;
    m.scale.x = scale;
    m.scale.y = scale;
    (m.material as THREE.MeshBasicMaterial).opacity = 1;
  };

  useFrame((state) => {
    const { viewport } = state;

    // ── Click ring queue (each click pushes 4 staggered stamps) ───────
    const queue = clickQueue.current;
    if (queue && queue.length > 0) {
      const now = performance.now();
      for (let i = queue.length - 1; i >= 0; i--) {
        if (now >= queue[i].fireAt) {
          const c = queue[i];
          stampRing((c.x * viewport.width) / 2, (c.y * viewport.height) / 2, c.scale);
          queue.splice(i, 1);
        }
      }
    }

    // ── Per-frame anim for ring pool (linear outward expansion) ───────
    for (const m of ringRefs.current) {
      if (!m) continue;
      const mat = m.material as THREE.MeshBasicMaterial;
      // Slower fade so rings travel ~4–5 cm before fading.
      mat.opacity *= 0.95;
      // Slightly faster growth than before — peak ring radius lands at
      // ~4–5 cm visible.
      m.scale.x += 0.05;
      m.scale.y += 0.05;
    }
  });

  return (
    <>
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(el) => {
            ringRefs.current[i] = el;
          }}
          visible={false}
        >
          <planeGeometry args={[1, 1, 1, 1]} />
          <meshBasicMaterial map={ringTex} transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// ── Lotus placement — the only thing templates tune ────────────────────
// The scene, the shaders and the ripple physics are identical everywhere; only
// how big the two lotuses are and how far in the lower-left one sits differ
// between templates. Exposing that as one small object is what lets both
// templates share this 500-line file verbatim.
export type LotusLayout = {
  topRightWidthFrac: number;
  lowerLeftWidthFrac: number;
  lowerLeftXFrac: number;
};

/** Saffron's proportions — the defaults. */
export const LOTUS_DEFAULTS: LotusLayout = {
  topRightWidthFrac: 0.35,
  lowerLeftWidthFrac: 0.28,
  lowerLeftXFrac: 0.2,
};

/** Native ratio of lotus-group.webp (1948×1490). */
const LOTUS_ASPECT = 1490 / 1948;

// ── Lotus plane with continuous floating loop ──────────────────────────
// Gentle bob (y), small lateral drift (x), and a slow rotation wobble.
// Each instance gets its own phase seed so the two lotuses don't tick in
// sync, which would feel mechanical.
function Lotus({
  src,
  anchor,
  widthFrac,
  aspect,
  phase,
  lowerLeftXFrac = 0.2,
}: {
  src: string;
  anchor: "topRight" | "lowerLeft";
  widthFrac: number; // fraction of viewport width
  aspect: number; // height / width
  phase: number;
  // How far in from the left edge the lower-left lotus sits, as a fraction of its
  // own width. Templates tune this (saffron 0.20, villa 0.10) — a prop, rather
  // than a reason to keep two copies of 500 lines of identical shader code.
  lowerLeftXFrac?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const tex = useMemo(() => {
    const t = new THREE.TextureLoader().load(src, (loaded) => {
      // Mipmaps must be re-flagged once the image actually loads.
      loaded.needsUpdate = true;
    });
    t.colorSpace = THREE.SRGBColorSpace;
    // Mipmaps OFF — our WebP textures are non-power-of-two (e.g. 1103×1200)
    // and some mobile GPUs render NPOT-mipmaps as garbled bands. Stick to
    // plain linear filtering; dpr=2 covers the sharpness need.
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }, [src]);

  const widthW = viewport.width * widthFrac;
  const heightW = widthW * aspect;

  const base = useMemo(() => {
    if (anchor === "topRight") {
      return {
        x: viewport.width / 2 - widthW * 0.42,
        y: viewport.height / 2 - heightW * 0.45,
      };
    }
    return {
      x: -viewport.width / 2 + widthW * lowerLeftXFrac,
      y: -viewport.height * 0.18,
    };
  }, [viewport.width, viewport.height, anchor, widthW, heightW, lowerLeftXFrac]);

  useFrame((state) => {
    const m = meshRef.current;
    if (!m) return;
    const t = state.clock.getElapsedTime();
    m.position.x = base.x + Math.sin(t * 0.5 + phase * 1.7) * 0.05;
    m.position.y = base.y + Math.sin(t * 0.7 + phase) * 0.08;
    m.rotation.z = Math.sin(t * 0.4 + phase) * 0.06;
  });

  return (
    // renderOrder=1 + depthTest=false makes the lotus paint on top of the
    // composite mesh (which is the warped water bg), so the lotuses sit
    // ABOVE the ripple layer instead of being warped by it.
    <mesh ref={meshRef} scale={[widthW, heightW, 1]} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tex}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Water background plane ─────────────────────────────────────────────
function WaterBgPlane() {
  const { viewport } = useThree();
  const tex = useMemo(() => {
    const t = new THREE.TextureLoader().load(
      sharedUrl("/timeline-water-bg.webp"),
      (loaded) => { loaded.needsUpdate = true; }
    );
    t.colorSpace = THREE.SRGBColorSpace;
    // No mipmaps — NPOT WebP + mobile GPUs = render glitches.
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }, []);
  return (
    // Oversize the plane by 5% so that perspective at z=-0.1 doesn't leave
    // a thin transparent border at the edges of the FBO (which would let
    // the section's CSS bg leak through after the composite sample).
    <mesh position={[0, 0, -0.1]} scale={[viewport.width * 1.05, viewport.height * 1.05, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

// ── Composite shader ───────────────────────────────────────────────────
// Samples the waves FBO's red channel, derives a 2D direction from it, and
// warps the visual FBO's UVs by (dir × magnitude × 0.11).
const COMPOSITE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D uTexture;
  uniform sampler2D uDisplacement;
  uniform vec2 winResolution;
  varying vec2 vUv;
  float PI = 3.141592653589793238;

  void main() {
    vec2 vUvScreen = gl_FragCoord.xy / winResolution.xy;
    vec4 displacement = texture2D(uDisplacement, vUvScreen);
    float theta = displacement.r * 2.0 * PI;
    vec2 dir = vec2(sin(theta), cos(theta));
    vec2 uv = vUvScreen + dir * displacement.r * 0.14;
    gl_FragColor = texture2D(uTexture, uv);
  }
`;

function Composite({
  clickQueue,
  warming,
  onPrimed,
  lotus = LOTUS_DEFAULTS,
}: {
  clickQueue: React.RefObject<
    { x: number; y: number; fireAt: number; scale: number }[]
  >;
  warming: boolean;
  onPrimed: () => void;
  lotus?: LotusLayout;
}) {
  const wavesScene = useMemo(() => new THREE.Scene(), []);
  const visualScene = useMemo(() => new THREE.Scene(), []);
  const wavesRT = useFBO();
  const visualRT = useFBO();
  const compositeRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  // Counts painted frames during the warm-up burst (see WARM_FRAMES_TO_PRIME).
  const warmFrameCountRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: null as THREE.Texture | null },
      uDisplacement: { value: null as THREE.Texture | null },
      winResolution: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  useFrame((state) => {
    const { gl, camera, size } = state;

    gl.setRenderTarget(wavesRT);
    gl.render(wavesScene, camera);

    gl.setRenderTarget(visualRT);
    gl.render(visualScene, camera);

    gl.setRenderTarget(null);

    if (compositeRef.current) {
      const mat = compositeRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uDisplacement.value = wavesRT.texture;
      mat.uniforms.uTexture.value = visualRT.texture;
      // CRITICAL: use the renderer's ACTUAL pixel ratio (set by R3F's
      // <Canvas dpr={[1, 2]}>), not a separate hardcoded clamp. Mismatch
      // here causes vUvScreen to be off by (actualDpr / clamp) ≈ 1.33x
      // on phones, shifting the visible ripple ~33% of viewport away from
      // the actual click.
      const dpr = state.gl.getPixelRatio();
      mat.uniforms.winResolution.value.set(size.width * dpr, size.height * dpr);
    }

    // Warm-up priming: while the invisible burst runs, count painted frames.
    // Frame 1 pays the cold start (compile + texture upload); once we've
    // painted WARM_FRAMES_TO_PRIME we're primed → let the parent commit to
    // the live ripple. onPrimed is idempotent (the parent guards it).
    if (warming) {
      warmFrameCountRef.current += 1;
      if (warmFrameCountRef.current >= WARM_FRAMES_TO_PRIME) {
        onPrimed();
      }
    }
  });

  return (
    <>
      {createPortal(<Waves clickQueue={clickQueue} />, wavesScene)}
      {/* Only the water bg goes through the ripple distortion. */}
      {createPortal(<WaterBgPlane />, visualScene)}

      <mesh ref={compositeRef} scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={COMPOSITE_VERT}
          fragmentShader={COMPOSITE_FRAG}
          uniforms={uniforms}
        />
      </mesh>

      {/* Lotuses live in the main scene (NOT visualScene) so they paint on
          top of the warped water bg, undistorted. */}
      <Lotus
        src={sharedUrl("/lotus-group.webp")}
        anchor="topRight"
        widthFrac={lotus.topRightWidthFrac}
        aspect={LOTUS_ASPECT}
        phase={0}
      />
      <Lotus
        src={sharedUrl("/lotus-group.webp")}
        anchor="lowerLeft"
        widthFrac={lotus.lowerLeftWidthFrac}
        lowerLeftXFrac={lotus.lowerLeftXFrac}
        aspect={LOTUS_ASPECT}
        phase={1.7}
      />
    </>
  );
}

// memo'd, and that matters more than it looks. The editor's live preview
// re-renders this whole tree on every keystroke; this component owns a WebGL
// context and its shader/texture warm-up. All three of its props are stable
// (a module-level LOTUS, a useCallback, a boolean), so memo skips it outright
// and the canvas is left alone while the operator types.
function RippleWaterScene({
  revealed = false,
  onCommit,
  lotus = LOTUS_DEFAULTS,
}: {
  // Wrapper opacity gate — false while warming/undecided (canvas hidden),
  // flipped true by the parent once it commits to the ripple. The flip
  // happens during the cover (off screen), so there's no visible swap.
  revealed?: boolean;
  // Reports the one-time decision up to the parent: true = use the live
  // ripple, false = use the static fallback (locked for the session).
  onCommit?: (useRipple: boolean) => void;
  // The template's lotus proportions (see LotusLayout).
  lotus?: LotusLayout;
}) {
  // Queue of click stamps. Each entry carries its target fire time (ms,
  // in performance.now() units) AND its initial scale. On each click we
  // push 4 staggered stamps with decreasing scale → real "pebble drop"
  // splash with primary wave + 3 trailing wavefronts.
  const clickQueue = useRef<
    { x: number; y: number; fireAt: number; scale: number }[]
  >([]);

  // ── Time-boxed warm-up + one-time decision ─────────────────────────────
  // While the static cover is up (all assets preloaded, user hasn't entered)
  // the canvas paints an invisible burst to pay the WebGL cold start. If it
  // primes within WARM_BUDGET_MS → commit the ripple; otherwise (or if the
  // user reaches the section first) → commit the fallback. Decided ONCE then
  // locked — committedRef makes the three deciders race-safe.
  const { loadingComplete, entered } = useCover();
  const [warming, setWarming] = useState(false);
  const committedRef = useRef(false);
  const warmStartedRef = useRef(false);

  const commit = useCallback(
    (useRipple: boolean) => {
      if (committedRef.current) return;
      committedRef.current = true;
      setWarming(false);
      onCommit?.(useRipple);
    },
    [onCommit]
  );

  const handlePrimed = useCallback(() => commit(true), [commit]);

  useEffect(() => {
    if (!loadingComplete || entered || warmStartedRef.current) return;

    let deadline: number | undefined;
    const startWarm = () => {
      if (committedRef.current) return;
      warmStartedRef.current = true;
      setWarming(true);
      // Backstop: if we haven't primed in time, fall back. A blocked main
      // thread only makes this fire late (harmless during the cover) — it
      // can never commit the ripple early (that needs painted frames).
      deadline = window.setTimeout(() => commit(false), WARM_BUDGET_MS);
    };

    // requestIdleCallback slots the burst into a genuine idle gap; {timeout}
    // guarantees it still runs on a busy thread. Safari lacks it → setTimeout.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = hasIdle
      ? window.requestIdleCallback(startWarm, { timeout: 200 })
      : window.setTimeout(startWarm, 200);

    return () => {
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      if (deadline !== undefined) window.clearTimeout(deadline);
      // Don't leave the burst running if deps change mid-warm (e.g. the user
      // taps Enter); the approach guard commits the fallback later.
      setWarming(false);
    };
  }, [loadingComplete, entered, commit]);

  // Pause the WebGL render loop when the timeline section is scrolled out
  // of view. Default to FALSE so the canvas doesn't burn frames during the
  // entire Hero/Couple approach before IO has fired its first callback.
  // rootMargin: "200px" wakes the canvas ~one viewport early so it's warm
  // by the time the section pins, but keeps it paused everywhere else.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // dpr cap: 2× on desktop for sharp lotuses; 1.75× on touch devices to
  // cut the FBO pipeline's per-frame fragment cost ~23% where it matters
  // most. Computed once — must stay stable for the Canvas lifetime.
  const [maxDpr] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
      ? 1.75
      : 2
  );

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        // Sticky decision: if the section is about to be seen before warm-up
        // has decided, lock in the fallback — never a swap the user can watch.
        // No-op once already committed (committedRef guards it).
        if (entry.isIntersecting) commit(false);
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [commit]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    const now = performance.now();
    // Primary splash + 3 trailing wavefronts, each a touch smaller and
    // 60ms behind the previous. Combined with the multi-ring texture
    // (3 concentric peaks per stamp) the result reads as real water.
    clickQueue.current.push({ x, y, fireAt: now,       scale: 0.30 });
    clickQueue.current.push({ x, y, fireAt: now +  60, scale: 0.25 });
    clickQueue.current.push({ x, y, fireAt: now + 120, scale: 0.20 });
    clickQueue.current.push({ x, y, fireAt: now + 180, scale: 0.15 });
  };

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-10"
      onPointerDown={handlePointerDown}
      // pointerEvents (when revealed) ensures finger/mouse events actually
      // reach the canvas even when ancestors flip pointer-events.
      // touchAction:pan-y lets the browser/Lenis handle vertical scroll
      // swipes through this canvas, while quick taps still fire pointerDown →
      // ripple stamp. opacity:0 keeps the warm-up burst invisible until the
      // parent commits to the ripple (the flip happens during the cover).
      style={{
        pointerEvents: revealed ? "auto" : "none",
        touchAction: "pan-y",
        opacity: revealed ? 1 : 0,
      }}
    >
      <Canvas
        // "always" while Timeline is in view OR during the warm-up burst;
        // "never" pauses the render loop entirely otherwise.
        frameloop={visible || warming ? "always" : "never"}
        // 2× on desktop; 1.75× on touch devices (see maxDpr above) to cut
        // the FBO pipeline cost. 1× was too blurry; 3× crushed perf.
        dpr={[1, maxDpr]}
        flat
        gl={{ antialias: false, alpha: true }}
        camera={{ position: [0, 0, 5], fov: 50 }}
      >
        <Composite
          clickQueue={clickQueue}
          warming={warming}
          onPrimed={handlePrimed}
          lotus={lotus}
        />
      </Canvas>
    </div>
  );
}

export default memo(RippleWaterScene);
