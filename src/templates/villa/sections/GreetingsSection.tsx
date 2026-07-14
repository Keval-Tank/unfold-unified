import ScrollReveal from "@/components/ScrollReveal";
import { asset } from "../asset";
import type { GreetingsContent } from "@/lib/template-types";

// A SERVER component — no hooks, no browser APIs, pure markup. ScrollReveal is a
// client component, but it only wraps children that were already rendered on the
// server, so no content travels across the boundary as props.
export default function GreetingsSection({
  content,
  coupleNames,
  brideFirstName,
  groomFirstName,
}: {
  content: GreetingsContent;
  coupleNames: string;
  brideFirstName: string;
  groomFirstName: string;
}) {
  return (
    <section
      className="relative flex min-h-lvh w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center px-6 text-center"
      style={{ backgroundImage: `url('${asset("/images/eu-villa.webp")}')`, backgroundColor: "var(--color-cream)" }}
    >
      {/* Soft cream overlay for readability */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: "rgba(245, 239, 230, 0.4)" }}
      />

      <div className="relative z-10 flex w-full flex-col items-center -translate-y-[10vh] sm:translate-y-[vh]">
        <ScrollReveal animation="fadeInUp">
          <p
            className="max-w-60 font-manrope italic leading-relaxed text-center"
            style={{
              color: "var(--color-text)",
              fontSize: "clamp(0.7rem, 2.5vw, 0.8rem)",
            }}
          >
            {content.message}
          </p>
        </ScrollReveal>

        {/* Couple names stacked on their own lines (role=heading keeps the
            semantics that the previous <h2> provided) */}
        <div
          role="heading"
          aria-level={2}
          aria-label={coupleNames}
          className="mt-6 flex flex-col items-center font-cormorant uppercase leading-none"
          style={{ color: "var(--color-primary-dark)", gap: "clamp(0.25rem, 1.5vw, 0.6rem)" }}
        >
          <ScrollReveal animation="fadeInUp" delay={0.2}>
            <span style={{ fontSize: "clamp(2.25rem, 13vw, 3.5rem)" }}>
              {brideFirstName}
            </span>
          </ScrollReveal>
          <ScrollReveal animation="fadeInUp" delay={0.35}>
            <span
              className="italic"
              style={{ fontSize: "clamp(1.5rem, 10vw, 2.25rem)", color: "var(--color-primary-dark)" }}
            >
              &amp;
            </span>
          </ScrollReveal>
          <ScrollReveal animation="fadeInUp" delay={0.5}>
            <span style={{ fontSize: "clamp(2.25rem, 13vw, 3.5rem)" }}>
              {groomFirstName}
            </span>
          </ScrollReveal>
        </div>

        {/* Invites label — semibold montserrat, matching the parents label in
            the couple section; continues the fade sequence after the names */}
        <ScrollReveal animation="fadeInUp" delay={0.65}>
          <p
            className="mt-15 font-manrope font-semibold uppercase tracking-[0.25em]"
            style={{
              color: "var(--color-text-light)",
              fontSize: "clamp(0.8rem, 3vw, 1rem)",
            }}
          >
            {content.invitesLabel}
          </p>
        </ScrollReveal>

        {/* Invitee names — cormorant, normal tracking, each fading in after the
            previous to continue the section's staggered reveal */}
        <div
          className="mt-3 flex flex-col items-center"
          style={{ gap: "clamp(0.15rem, 1vw, 0.4rem)" }}
        >
          {content.inviteeNames.map((name, i) => (
            <ScrollReveal key={name} animation="fadeInUp" delay={0.8 + i * 0.15}>
              <p
                className="font-manrope tracking-normal"
                style={{
                  color: "var(--color-text)",
                  fontSize: "clamp(1rem, 4.5vw, 1.2rem)",
                }}
              >
                {name}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
