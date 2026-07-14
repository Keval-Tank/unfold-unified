import { Fragment } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import type { DressCodeContent } from "@/lib/template-types";

// A SERVER component — note the absence of "use client". Its copy is rendered to
// HTML on the server and never crosses into the browser as data. ScrollReveal is
// a client component, but it only receives already-rendered children, so no
// content travels as props.
export default function DressCodeSection({ content }: { content: DressCodeContent }) {
  return (
    <section
      className="relative overflow-hidden px-6 py-16 text-center"
    >
      <ScrollReveal animation="zoomIn">
        <h2
          className="relative z-10 font-cormorant leading-none mb-10 uppercase"
          style={{
            color: "var(--color-primary-dark)",
            fontSize: "clamp(2rem, 9.5cqw, 3rem)",
          }}
        >
          {content.titleLines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </h2>
      </ScrollReveal>

      <ScrollReveal animation="fadeInUp" delay={0.2}>
        <p
          className="relative z-10 mx-auto -mt-6 max-w-xs leading-relaxed font-montserrat"
          style={{
            color: "var(--color-text-light)",
            fontSize: "clamp(0.9rem, 2.8cqw, 1.2rem)",
          }}
        >
          {content.quote}
        </p>
      </ScrollReveal>

      <ScrollReveal animation="fadeInUp" delay={0.3}>
        <div className="relative z-10 mx-auto mt-8 flex max-w-xs flex-wrap justify-center gap-6">
          {content.colors.map((color, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="h-14 w-14 rounded-lg shadow-sm"
                style={{ backgroundColor: color.hex }}
                aria-label={`Dress code color: ${color.name}`}
                role="img"
              />
              <span
                className="tracking-wider font-montserrat"
                style={{
                  color: "var(--color-text-light)",
                  fontSize: "clamp(0.8rem, 2cqw, 1rem)",
                }}
              >
                {color.name}
              </span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
