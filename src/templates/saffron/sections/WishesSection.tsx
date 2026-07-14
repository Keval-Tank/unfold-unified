"use client";

import Image from "next/image";
import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import Pressable from "@/components/Pressable";
import { asset } from "../asset";
import type { WishesContent } from "@/lib/template-types";

// CLIENT: the RSVP form is controlled — name/message/attendance live in useState.
export default function WishesSection({ content }: { content: Omit<WishesContent, "included"> }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState<
    "attending" | "not_attending" | null
  >(null);

  const handleSend = () => {
    // Clear the form after sending the wish.
    setName("");
    setMessage("");
    setAttendance(null);
  };

  return (
    <section
      // Paper backdrop, painted on the section itself so it sits BEHIND both
      // image layers below (the ornate rsvp-bg border and the pavilion), whose
      // transparent areas previously fell through to the bare page.
      className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-16 text-center"
      style={{ backgroundImage: `url('${asset("/images/paper-bg.webp")}')` }}
    >
      {/* rsvp-bg (ornate border) — flipped vertically. */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src={asset("/images/rsvp-bg.webp")}
          alt=""
          fill
          sizes="(max-width: 512px) 100vw, 512px"
          className="object-contain object-center -scale-y-100"
        />
      </div>

      {/* Pavilion architecture overlay — pinned at the bottom of the section.
          The PNG's top half is transparent, so only the chhatris + lotus pond paint. */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 object-contain">
        <Image
          src={asset("/images/rsvp-pavilion.webp")}
          alt=""
          width={4320}
          height={7577}
          className="block w-full"
        />
      </div>

      {/* Form group — title + inputs + send button, vertically centered in the section.
          Width and all spacing/typography scale with container width via cqw clamps,
          so the form looks consistent across mobile/desktop-mock widths.
          Each group is wrapped in a ScrollReveal for a staggered fade-in-up reveal. */}
      <div
        className="relative z-10 w-full"
        style={{
          maxWidth: "clamp(13rem, 60cqw, 18rem)",
          transform: "translateY(-15%)",
        }}
      >
        <ScrollReveal animation="fadeInUp">
          <h2
            className="font-cormorant text-center uppercase leading-10 mb-5"
            style={{
              color: "var(--color-primary-dark)",
              fontSize: "clamp(2rem, 10cqw, 2.5rem)",
            }}
          >
            {content.heading}
          </h2>
        </ScrollReveal>

        <div
          className="text-left"
          style={{ marginTop: "clamp(0.85rem, 4cqw, 1.25rem)" }}
        >
          <ScrollReveal animation="fadeInUp" delay={0.1}>
            <label
              htmlFor="wish-name"
              className="block font-montserrat font-normal tracking-wider uppercase"
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
              className="w-full rounded-md border font-montserrat outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-divider)",
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                color: "var(--color-text)",
                marginTop: "clamp(0.15rem, 0.8cqw, 0.25rem)",
                paddingLeft: "clamp(0.5rem, 2.5cqw, 0.75rem)",
                paddingRight: "clamp(0.5rem, 2.5cqw, 0.75rem)",
                paddingTop: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                paddingBottom: "clamp(0.25rem, 1.5cqw, 0.4rem)",
                fontSize: "clamp(0.8rem, 3cqw, 0.9rem)",
              }}
            />
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={0.2}>
            <p
              className="font-montserrat font-normal tracking-wider uppercase"
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
                className="flex-1 rounded-full border font-montserrat tracking-wider"
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
                className="flex-1 rounded-full border font-montserrat tracking-wider"
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
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={0.3}>
            <label
              htmlFor="wish-message"
              className="block font-montserrat font-normal tracking-wider uppercase"
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
              className="w-full resize-none rounded-md border font-montserrat outline-none focus:ring-2"
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
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={0.4}>
            <div
              className="text-center"
              style={{ marginTop: "clamp(0.5rem, 2.5cqw, 0.75rem)" }}
            >
              <Pressable
                type="button"
                onClick={handleSend}
                className="rounded-full font-montserrat font-bold tracking-wider uppercase text-white"
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
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
