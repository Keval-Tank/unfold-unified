import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import Pressable from "@/components/Pressable";
import { asset } from "../asset";
import type { CoupleContent } from "@/lib/template-types";

// A SERVER component — note the absence of "use client". It has no effects and no
// browser APIs, so its copy renders to HTML on the server and never crosses into
// the browser as data. ScrollReveal / Pressable / Image are client components, but
// they only receive already-rendered children, so no content travels as props.
//
// The two portraits arrive as finished URLs (`bridePhoto` / `groomPhoto`) — the
// asset namespacing happened on the server; `asset()` is used here only for the
// decorative wreath frame, which is part of the design rather than the content.
export default function CoupleSection({
  content,
  brideFullName,
  groomFullName,
  bridePhoto,
  groomPhoto,
}: {
  content: Omit<CoupleContent, "included">;
  brideFullName: string;
  groomFullName: string;
  bridePhoto: string;
  groomPhoto: string;
}) {
  return (
    <section className="relative overflow-y-visible px-6 pt-16 pb-32 text-center">
      <ScrollReveal animation="zoomIn" delay={0.2}>
        {/* Heading, one <p> per line. The first line carries the top margin; each
            line after it is pulled up tight against the one above (-mt-5), which
            is why this is an array of lines rather than a single string. */}
        {content.headingLines.map((line, i) => (
          <p
            key={i}
            className={`${
              i === 0 ? "mt-10" : "-mt-5"
            } font-couple font-semibold tracking-tight uppercase italic`}
            style={{
              color: "var(--color-hero-text)",
              fontSize: "clamp(3rem, 9cqw, 3.5rem)",
            }}
          >
            {line}
          </p>
        ))}
      </ScrollReveal>

      <ScrollReveal animation="zoomIn" delay={0.3}>
        <p
          className="mx-auto max-w-70 mt-2 leading-relaxed font-body"
          style={{
            color: "var(--color-text-light)",
            fontSize: "clamp(0.8rem, 2.7cqw, 1rem)",
          }}
        >
          {content.intro}
        </p>
      </ScrollReveal>

      {/* groom */}
      <div className="relative mt-12 flex flex-col items-center">
        {/* Floral wreath frame wrapping the portrait */}
        <ScrollReveal animation="zoomIn" className="relative z-10 w-[90%]">
          <div className="relative mx-auto aspect-2836/4973 w-[90%]">
            {/* Portrait clipped to the frame's oval opening. The opening sits in
                the upper-middle of the frame (not centered, and shorter than the
                full container), so the clip wrapper is inset asymmetrically:
                top/bottom != and slightly larger than the opening so the
                elliptical photo edges tuck UNDER the carved border instead of
                showing in the transparent zones. overflow-hidden + rounded-[50%]
                clips the photo to that ellipse. */}
            <div
              className="absolute overflow-hidden rounded-[50%]"
              style={{ top: "17%", bottom: "25%", left: "8%", right: "8%" }}
            >
              <Image
                src={groomPhoto}
                alt={`Portrait of groom`}
                fill
                className="object-cover object-top scale-[1]"
              />
            </div>
            <Image
              src={asset("/images/eu-wreath.webp")}
              alt=""
              fill
              sizes="(max-width: 512px) 0vw, 400px"
              className="object-contain pointer-events-none scale-x-[-1]"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal animation="slideInDown">
          <h3
            className="font-couple uppercase -mt-10 leading-none"
            style={{
              color: "var(--color-primary-dark)",
              fontSize: "clamp(1.75rem, 6.7cqw, 2.5rem)",
            }}
          >
            {groomFullName}
          </h3>
          <p
            className="mt-1 font-body"
            style={{
              color: "var(--color-text-light)",
              fontSize: "clamp(0.875rem, 3.15cqw, 1.125rem)",
            }}
          >
            {content.groom.parentLabel}
            <br />
            <span className="font-semibold">{content.groom.parents}</span>
          </p>
        </ScrollReveal>
        <ScrollReveal animation="zoomIn" delay={0.2}>
          <Pressable
            as="a"
            href={content.groom.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-full border tracking-wider hover:bg-white/50"
            style={{
              borderColor: "var(--color-primary)",
              color: "var(--color-primary)",
              fontSize: "clamp(0.8rem, 2.7cqw, 1rem)",
              paddingLeft: "clamp(1.125rem, 4.5cqw, 1.75rem)",
              paddingRight: "clamp(1.125rem, 4.5cqw, 1.75rem)",
              paddingTop: "clamp(0.3125rem, 1.35cqw, 0.625rem)",
              paddingBottom: "clamp(0.3125rem, 1.35cqw, 0.625rem)",
            }}
          >
            {content.instagramLabel}
          </Pressable>
        </ScrollReveal>
      </div>

      {/* bride */}
      <div className="relative mt-16 flex flex-col items-center">

        {/* Floral wreath frame wrapping the portrait — flipped horizontally for the groom */}
        <ScrollReveal animation="zoomIn" className="relative z-10 w-[90%]">
           <div className="relative mx-auto aspect-2836/4973 w-[90%]">
            {/* Portrait clipped to the frame's oval opening. The opening sits in
                the upper-middle of the frame (not centered, and shorter than the
                full container), so the clip wrapper is inset asymmetrically:
                top/bottom != and slightly larger than the opening so the
                elliptical photo edges tuck UNDER the carved border instead of
                showing in the transparent zones. overflow-hidden + rounded-[50%]
                clips the photo to that ellipse. */}
            <div
              className="absolute overflow-hidden rounded-[50%]"
              style={{ top: "17%", bottom: "25%", left: "8%", right: "8%" }}
            >
              <Image
                src={bridePhoto}
                alt={`Portrait of bride`}
                fill
                className="object-cover object-top scale-[1]"
              />
            </div>
            <Image
              src={asset("/images/eu-wreath.webp")}
              alt=""
              fill
              sizes="(max-width: 512px) 0vw, 400px"
              className="object-contain pointer-events-none"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal animation="slideInDown">
          <h3
            className="font-couple uppercase -mt-10 leading-none"
            style={{
              color: "var(--color-primary-dark)",
              fontSize: "clamp(1.75rem, 6.7cqw, 2.5rem)",
            }}
          >
            {brideFullName}
          </h3>
          <p
            className="mt-1 font-body"
            style={{
              color: "var(--color-text-light)",
              fontSize: "clamp(0.875rem, 3.15cqw, 1.125rem)",
            }}
          >
            {content.bride.parentLabel}
            <br />
            <span className="font-semibold">{content.bride.parents}</span>
          </p>
        </ScrollReveal>
        <ScrollReveal animation="zoomIn" delay={0.2}>
          <Pressable
            as="a"
            href={content.bride.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-full border tracking-wider hover:bg-white/50"
            style={{
              borderColor: "var(--color-primary)",
              color: "var(--color-primary)",
              fontSize: "clamp(0.8rem, 2.7cqw, 1rem)",
              paddingLeft: "clamp(1.125rem, 4.5cqw, 1.75rem)",
              paddingRight: "clamp(1.125rem, 4.5cqw, 1.75rem)",
              paddingTop: "clamp(0.3125rem, 1.35cqw, 0.625rem)",
              paddingBottom: "clamp(0.3125rem, 1.35cqw, 0.625rem)",
            }}
          >
            {content.instagramLabel}
          </Pressable>
        </ScrollReveal>
      </div>

    </section>
  );
}
