"use client";

export default function LandscapeOverlay() {
  return (
    <div
      id="landscape-overlay"
      className="fixed inset-0 z-300 hidden flex-col items-center justify-center gap-6 px-8 text-center landscape-mobile:flex"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      {/* Rotating phone icon */}
      <div className="landscape-rotate-icon">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--color-primary)" }}
        >
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" />
        </svg>
      </div>

      <p
        className="font-heading text-3xl"
        style={{ color: "var(--color-primary-dark)" }}
      >
        Rotate Your Device
      </p>

      <p
        className="max-w-xs text-sm leading-relaxed"
        style={{ color: "var(--color-text-light)" }}
      >
        Please switch to portrait mode for the best experience
      </p>
    </div>
  );
}
