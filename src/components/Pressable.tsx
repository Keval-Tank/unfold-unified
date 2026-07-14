"use client";

import { useState } from "react";
import type { CSSProperties, ComponentPropsWithoutRef, ElementType } from "react";

/**
 * Shared press-feedback wrapper for every clickable control on the page.
 *
 * The press is driven by POINTER EVENTS, not the CSS `:active` pseudo-class.
 * iOS Safari refuses to apply `:active` on tap to `<a>` links (it works for
 * `<button>`, which is why only the outline links showed nothing on mobile).
 * Pointer events, by contrast, fire reliably on iOS for every element type — so
 * we track a `pressed` state from them and apply the shrink via inline style.
 * No dependency on `:active` for touch, so links and buttons behave identically.
 *
 *   • pressed (inline)   → scale 0.9 + brightness 0.9. `transition: none` makes
 *                          it *snap in instantly* on finger-down; clearing it on
 *                          release lets the base `duration-200` ease it back —
 *                          so even a quick tap shows the full press, no timers.
 *                          Inline also wins specificity over `hover:scale-105`.
 *   • hover:scale-105     → grow on hover (mouse only — touch has no hover).
 *   • active:scale-90 …   → keeps the press cue for KEYBOARD users (Space/Enter
 *                           fires `:active`, which pointer events don't).
 *
 * Polymorphic: renders a <button> by default, or any element via `as`
 * (e.g. `as="a"`, `as={Link}`), forwarding all native props (href, onClick, …).
 */
const PRESS =
  "transition duration-200 ease-out hover:scale-105 active:scale-90 active:brightness-90 active:duration-0";

const PRESSED_STYLE: CSSProperties = {
  scale: "0.9",
  filter: "brightness(0.9)",
  transition: "none", // snap in; the base transition eases the release
};

type PressableProps<T extends ElementType> = {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

export default function Pressable<T extends ElementType = "button">({
  as,
  className,
  style,
  ...rest
}: PressableProps<T>) {
  const [pressed, setPressed] = useState(false);

  // Dynamic polymorphic tag — a generic ElementType can't be statically
  // reconciled with concrete JSX prop types, so we widen the tag here. The
  // call site still gets full prop type-checking via PressableProps<T>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = (as ?? "button") as any;
  return (
    <Tag
      {...rest}
      className={className ? `${PRESS} ${className}` : PRESS}
      style={
        pressed
          ? { ...(style as CSSProperties), ...PRESSED_STYLE }
          : (style as CSSProperties)
      }
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    />
  );
}
