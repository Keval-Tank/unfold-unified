import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import Pressable from "@/components/Pressable";
import Sway from "@/components/Sway";
import ParallaxGarland from "../ParallaxGarland";
import { asset } from "../asset";
import type { CoupleContent } from "@/lib/template-types";

// A SERVER component. Its copy — the parent labels, the Instagram links, the
// names — is rendered to HTML and never crosses into the browser as data. The
// one moving part, the garland parallax, is isolated in a client island.
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
    <section
      // ONE paper image covering the whole section. It used to be `bg-contain`
      // with the browser's default `repeat`, so the texture tiled down the
      // section; bg-cover + bg-no-repeat scales a single copy to fill it.
      className="relative overflow-hidden bg-cover bg-center bg-no-repeat px-6 pt-16 pb-48 text-center"
      style={{ backgroundImage: `url('${asset("/images/paper-bg.webp")}')` }}
    >
      {/* Heading + intro grouped. The wrapper shrinks to the heading's width
          (w-fit); the intro is forced to fill exactly that width — never wider —
          via the width:0 / min-width:100% trick, so it wraps inside the heading
          instead of spilling past it. The heading keeps its natural width. */}
      <div className="mx-auto w-fit">
        <ScrollReveal animation="zoomIn" delay={0.2}>
          {/* Heading, one <p> per line. The first line carries the top margin; each
              line after it is pulled up tight against the one above (-mt-5), which
              is why this is an array of lines rather than a single string. The
              `uppercase` class renders any casing identically. */}
          {content.headingLines.map((line, i) => (
            <p
              key={i}
              className={`${
                i === 0 ? "mt-10" : "-mt-5"
              } font-cormorant font-semibold tracking-tight uppercase`}
              style={{
                color: "var(--color-text-light)",
                fontSize: "clamp(0.5rem, 10.7cqw, 2rem)",
              }}
            >
              {line}
            </p>
          ))}
        </ScrollReveal>

        <ScrollReveal animation="zoomIn" delay={0.3}>
          <p
            className="mx-auto mt-2 leading-tight font-montserrat text-center tracking-normal"
              style={{
              color: "var(--color-text-light)",
              fontSize: "clamp(0.8rem, 2.7cqw, 1.5rem)",
              width: 0,
              minWidth: "90%",
            }}
          >
            {content.intro}
          </p>
        </ScrollReveal>
      </div>

      {/* Groom */}
      <div className="relative mt-12 flex flex-col items-center">
        {/* Marigold stem peeking from behind the LEFT side of the frame */}
        <ScrollReveal
          animation="zoomIn"
          className="pointer-events-none absolute top-15 -left-10 z-0 w-[48%]"
        >
          <Sway direction="left" intensity={0.5} speed={0.7} origin="visual-bottom">
            <Image
              src={asset("/images/marigold-stem.webp")}
              alt=""
              width={1636}
              height={3121}
              className="w-full"
            />
          </Sway>
        </ScrollReveal>

        {/* Carved oval frame wrapping the portrait */}
        <ScrollReveal animation="zoomIn" className="relative z-10 w-[80%]">
          <div className="relative mx-auto aspect-2836/4973">
            {/* Portrait clipped to the frame's oval opening. The opening sits in
                the upper-middle of the frame (not centered, and shorter than the
                full container), so the clip wrapper is inset asymmetrically:
                top/bottom != and slightly larger than the opening so the
                elliptical photo edges tuck UNDER the carved border instead of
                showing in the transparent zones. overflow-hidden + rounded-[50%]
                clips the photo to that ellipse. */}
            <div
              className="absolute overflow-hidden rounded-[50%]"
              style={{ top: "16%", bottom: "31%", left: "8%", right: "8%" }}
            >
              <Image
                src={groomPhoto}
                alt={`Portrait of ${groomFullName}`}
                fill
                className="object-cover object-top"
              />
            </div>
            <Image
              src={asset("/images/couple-oval-frame.webp")}
              alt=""
              fill
              sizes="(max-width: 512px) 80vw, 307px"
              className="object-contain pointer-events-none"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal animation="slideInDown">
          <h3
            className="font-cormorant -mt-10"
            style={{
              color: "var(--color-primary-dark)",
              fontSize: "clamp(2.5rem, 6.7cqw, 3rem)",
            }}
          >
            {groomFullName}
          </h3>
          <p
            className="mt-1 font-montserrat"
            style={{
              color: "var(--color-text-light)",
              fontSize: "clamp(0.8rem, 3.15cqw, 1.5rem)",
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
            className="mt-3 inline-block rounded-full border tracking-wider hover:bg-white/50 font-montserrat"
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

      {/* bride*/}
      <div className="relative mt-16 flex flex-col items-center">
        {/* Floral side garland on the LEFT of the groom frame area — parallax drift only, no entry animation */}
        <div className="pointer-events-none absolute -top-20 -left-6 z-0 w-[35%]">
          <ParallaxGarland className="w-full will-change-transform">
            <Image
              src={asset("/images/floral-side-garland.webp")}
              alt=""
              width={1492}
              height={3860}
              className="w-full left-0"
            />
          </ParallaxGarland>
        </div>

        {/* Marigold stem peeking from behind the RIGHT side of the frame (mirrored) */}
        <ScrollReveal
          animation="zoomIn"
          className="pointer-events-none absolute top-15 -right-10 z-0 w-[48%]"
        >
          <Sway direction="left" intensity={0.5} speed={0.7} origin="visual-bottom">
            <Image
              src={asset("/images/marigold-stem.webp")}
              alt=""
              width={1636}
              height={3121}
              className="w-full -scale-x-100"
            />
          </Sway>
        </ScrollReveal>

        {/* Carved oval frame wrapping the portrait */}
        <ScrollReveal animation="zoomIn" className="relative z-10 w-[80%]">
          <div className="relative mx-auto aspect-2836/4973">
            {/* Portrait clipped to the frame's oval opening. The opening sits in
                the upper-middle of the frame (not centered, and shorter than the
                full container), so the clip wrapper is inset asymmetrically:
                top/bottom != and slightly larger than the opening so the
                elliptical photo edges tuck UNDER the carved border instead of
                showing in the transparent zones. overflow-hidden + rounded-[50%]
                clips the photo to that ellipse. */}
            <div
              className="absolute overflow-hidden rounded-[50%]"
              style={{ top: "16%", bottom: "31%", left: "8%", right: "8%" }}
            >
              <Image
                src={bridePhoto}
                alt={`Portrait of ${brideFullName}`}
                fill
                className="object-cover object-top"
              />
            </div>
            <Image
              src={asset("/images/couple-oval-frame.webp")}
              alt=""
              fill
              sizes="(max-width: 512px) 80vw, 307px"
              className="object-contain pointer-events-none"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal animation="slideInDown">
          <h3
            className="font-cormorant -mt-10"
            style={{
              color: "var(--color-primary-dark)",
              fontSize: "clamp(2.5rem, 6.7cqw, 3rem)",
            }}
          >
            {brideFullName}
          </h3>
          <p
            className="mt-1 font-montserrat"
            style={{
              color: "var(--color-text-light)",
              fontSize: "clamp(0.8rem, 3.15cqw, 1.5rem)",
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
            className="mt-3 inline-block rounded-full border tracking-wider hover:bg-white/50 font-montserrat"
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
