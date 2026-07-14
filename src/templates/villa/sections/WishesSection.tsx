"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import Pressable from "@/components/Pressable";
import { asset } from "../asset";
import type { WishesContent } from "@/lib/template-types";

// A CLIENT component: it owns a controlled form (name, attendance, message).
export default function WishesSection({ content }: { content: Omit<WishesContent, "included"> }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState<
    "attending" | "not_attending" | null
  >(null);

  // Send clears every field back to its empty state (name, message, and the
  // attendance choice). Hook a real submit up here later if needed.
  const handleSend = () => {
    setName("");
    setMessage("");
    setAttendance(null);
  };

  return (
    <div className="w-full">
      <section className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
      style={{ backgroundImage: `url('${asset("/images/eu-paper.webp")}')` }}>
        {/* Form group — a COMPLETE decorative box. All four sides belong to
          THIS one container: left/right gold borders (border-l/border-r) plus
          the top/bottom flourish dividers, which are absolute children pinned
          to this box's own top/bottom edges and stretched to its full width
          (inset-x-0). Because every side is tied to the same element, the box
          stays closed and the borders always meet the divider ends on every
          screen size — no more section-relative drift. */}
        <div
          className="relative z-10 w-full border-l border-r"
          style={{
            // Widened so the frame covers a bigger area AND absorbs the interior
            // padding — the inner form stays as wide as before (a touch wider),
            // never shrunk by the horizontal padding.
            maxWidth: "clamp(16rem, 86cqw, 25rem)",
            transform: "translateY(-15%)",
            // Frame the whole form in gold.
            borderColor: "var(--color-gold)",
            // Extra horizontal padding, offset by the wider maxWidth above so the
            // fields don't get narrower.
            paddingTop: "clamp(2rem, 19cqw, 5.75rem)",
            paddingBottom: "clamp(2rem, 15cqw, 5.75rem)",
            paddingLeft: "clamp(1.5rem, 8cqw, 2.25rem)",
            paddingRight: "clamp(1.5rem, 8cqw, 2.25rem)",
          }}
        >
          {/* Top flourish — full box width (inset-x-0), centered ON the top
            edge (top-0 + -translate-y-1/2) so its ends meet both side borders.
            Its aspect-ratio equals the SVG viewBox, so mask:contain fills it
            edge-to-edge and it scales with the box on every screen. */}
          <div
            role="img"
            aria-label="Divider"
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
            style={{
              // A bit wider than the box (110%) and re-centered, so the
              // flourish — which has transparent padding inside its SVG — reaches
              // out to meet both side borders. Percentage keeps it consistent
              // on every screen.
              width: "105%",
              aspectRatio: "2598 / 312",          // match the SVG's viewBox
              backgroundColor: "var(--color-gold)",
              WebkitMaskImage: `url('${asset("/images/vintage-divider.svg")}')`,
              maskImage: `url('${asset("/images/vintage-divider.svg")}')`,
              WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
              WebkitMaskSize: "contain", maskSize: "contain",
              WebkitMaskPosition: "center", maskPosition: "center",
              scale: -1,
            }}
          />
          {/* Bottom flourish — mirror of the top, centered ON the bottom edge
            (bottom-0 + translate-y-1/2) so its ends meet both side borders. */}
          <div
            role="img"
            aria-label="Divider"
            className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2"
            style={{
              // Same 110% widen as the top flourish so its ends meet the borders.
              width: "105%",
              aspectRatio: "2598 / 312",          // match the SVG's viewBox
              backgroundColor: "var(--color-gold)",
              WebkitMaskImage: `url('${asset("/images/vintage-divider.svg")}')`,
              maskImage: `url('${asset("/images/vintage-divider.svg")}')`,
              WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
              WebkitMaskSize: "contain", maskSize: "contain",
              WebkitMaskPosition: "center", maskPosition: "center",
            }}
          />
          <ScrollReveal animation="fadeInUp">
            <h2
              className="font-heading text-center leading-none uppercase"
              style={{
                color: "var(--color-primary-dark)",
                fontSize: "clamp(2.25rem, 10cqw, 3.25rem)",
              }}
            >
              {content.heading}
            </h2>
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={0.15}>
            <div
              className="text-left"
              style={{ marginTop: "clamp(0.85rem, 4cqw, 1.25rem)" }}
            >
              <label
                htmlFor="wish-name"
                className="block font-body font-bold tracking-wider uppercase"
                style={{
                  color: "var(--color-primary-dark)",
                  fontSize: "clamp(0.5rem, 2.5cqw, 0.7rem)",
                }}
              >
                {content.nameLabel} <span aria-hidden="true">*</span>
              </label>
              <input
                id="wish-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={content.namePlaceholder}
                required
                className="w-full rounded-md border font-body outline-none focus:ring-2"
                style={{
                  borderColor: "var(--color-divider)",
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  color: "var(--color-text)",
                  marginTop: "clamp(0.15rem, 0.8cqw, 0.25rem)",
                  paddingLeft: "clamp(0.5rem, 2.5cqw, 0.75rem)",
                  paddingRight: "clamp(0.5rem, 2.5cqw, 0.75rem)",
                  paddingTop: "clamp(0.7rem, 1.5cqw, 0.4rem)",
                  paddingBottom: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                  fontSize: "clamp(0.6rem, 3cqw, 0.8rem)",
                }}
              />

              <p
                className="font-body font-bold tracking-wider uppercase"
                style={{
                  color: "var(--color-primary-dark)",
                  marginTop: "clamp(0.65rem, 3.2cqw, 1rem)",
                  fontSize: "clamp(0.5rem, 2.5cqw, 0.7rem)",
                }}
              >
                {content.attendQuestion}
              </p>
              <div
                className="flex"
                style={{
                  marginTop: "clamp(0.25rem, 1.3cqw, 0.4rem)",
                  gap: "clamp(0.35rem, 1.8cqw, 0.5rem)",
                }}
              >
                <Pressable
                  type="button"
                  onClick={() => setAttendance("attending")}
                  className="flex-1 rounded-full border font-body tracking-wider"
                  style={{
                    borderColor: "var(--color-primary)",
                    color:
                      attendance === "attending"
                        ? "var(--color-white)"
                        : "var(--color-primary)",
                    backgroundColor:
                      attendance === "attending"
                        ? "var(--color-primary)"
                        : "transparent",
                    paddingTop: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                    paddingBottom: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                    fontSize: "clamp(0.5rem, 2.5cqw, 0.7rem)",
                  }}
                >
                  {content.attendYes}
                </Pressable>
                <Pressable
                  type="button"
                  onClick={() => setAttendance("not_attending")}
                  className="flex-1 rounded-full border font-body tracking-wider"
                  style={{
                    borderColor: "var(--color-primary)",
                    color:
                      attendance === "not_attending"
                        ? "var(--color-white)"
                        : "var(--color-primary)",
                    backgroundColor:
                      attendance === "not_attending"
                        ? "var(--color-primary)"
                        : "transparent",
                    paddingTop: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                    paddingBottom: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                    fontSize: "clamp(0.5rem, 2.5cqw, 0.7rem)",
                  }}
                >
                  {content.attendNo}
                </Pressable>
              </div>

              <label
                htmlFor="wish-message"
                className="block font-body font-bold tracking-wider uppercase"
                style={{
                  color: "var(--color-primary-dark)",
                  marginTop: "clamp(0.65rem, 3.2cqw, 1rem)",
                  fontSize: "clamp(0.5rem, 2.5cqw, 0.7rem)",
                }}
              >
                {content.messageLabel} <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="wish-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={content.messagePlaceholder}
                required
                rows={3}
                className="w-full resize-none rounded-md border font-body outline-none focus:ring-2"
                style={{
                  borderColor: "var(--color-divider)",
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  color: "var(--color-text)",
                  marginTop: "clamp(0.15rem, 0.8cqw, 0.25rem)",
                  paddingLeft: "clamp(0.5rem, 2.5cqw, 0.75rem)",
                  paddingRight: "clamp(0.5rem, 2.5cqw, 0.75rem)",
                  paddingTop: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                  paddingBottom: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                  fontSize: "clamp(0.6rem, 3cqw, 0.8rem)",
                }}
              />

              <div
                className="text-center"
                style={{ marginTop: "clamp(0.5rem, 2.5cqw, 0.75rem)" }}
              >
                <Pressable
                  type="button"
                  onClick={handleSend}
                  className="rounded-full font-body font-bold tracking-wider uppercase text-white"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    paddingLeft: "clamp(1rem, 5cqw, 1.5rem)",
                    paddingRight: "clamp(1rem, 5cqw, 1.5rem)",
                    paddingTop: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                    paddingBottom: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                    fontSize: "clamp(0.5rem, 2.5cqw, 0.7rem)",
                  }}
                >
                  {content.sendButton}
                </Pressable>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
