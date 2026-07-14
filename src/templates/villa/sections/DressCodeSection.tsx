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
          className="relative z-10 font-heading mb-5 uppercase leading-none"
          style={{ color: "var(--color-primary-dark)", fontSize: "clamp(2.25rem, 10cqw, 3.25rem)" }}
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
          className="relative z-10 mx-auto mt-4 max-w-xs text-sm leading-relaxed font-body"
          style={{ color: "var(--color-text-light)" }}
        >
          {content.quote}
        </p>
      </ScrollReveal>

      <ScrollReveal animation="fadeInUp" delay={0.3}>
        {/* flex-wrap so extra colors flow onto a second row instead of being
            squeezed into one line. */}
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
                className="text-[10px] tracking-wider"
                style={{ color: "var(--color-text-light)" }}
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
