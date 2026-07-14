import Image from "next/image";
import Pressable from "@/components/Pressable";
import { sharedUrl } from "@/lib/assets";

export default function CreditsSection() {
  return (
    <section
      className="w-full px-5 py-5 sm:px-8 sm:py-6"
      style={{ backgroundColor: "var(--color-credits-bg)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
        {/* Glass pill — "Crafted with love using" + the white unfold·invite logo */}
        <div
          className="inline-flex items-center gap-2.5 px-4 py-2.5"
          style={{
            borderRadius: "14px",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.035) 100%)",
            backdropFilter: "blur(14px) saturate(160%)",
            WebkitBackdropFilter: "blur(14px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.30), 0 6px 24px rgba(0,0,0,0.35)",
          }}
        >
          <span
            className="font-manrope whitespace-nowrap"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "clamp(0.625rem, 1.8vw, 0.75rem)",
            }}
          >
            Crafted with love using
          </span>
          <Image
            src={sharedUrl("/unfold-logo-white.svg")}
            alt="Unfold Invite"
            width={1577}
            height={242}
            priority={false}
            style={{ height: "clamp(0.9rem, 3vw, 1.05rem)", width: "auto" }}
          />
        </div>

        {/* Website */}
        <Pressable
          as="a"
          href="https://www.unfoldinvite.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-manrope whitespace-nowrap hover:text-white!"
          style={{
            color: "rgba(255,255,255,0.70)",
            fontSize: "clamp(0.6875rem, 1.8vw, 0.8125rem)",
          }}
        >
          www.unfoldinvite.com
        </Pressable>
      </div>
    </section>
  );
}
