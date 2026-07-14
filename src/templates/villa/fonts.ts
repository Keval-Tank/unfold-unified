import localFont from "next/font/local";

// ═══════════════════════════════════════════════════════════════════════════
//  VILLA — the typefaces this template owns.
// ═══════════════════════════════════════════════════════════════════════════
//  Each face is exposed as a raw --ff-* CSS variable. The shared globals.css
//  declares the *roles* (--font-body, --font-heading, …) that point at these,
//  and theme.css decides which role gets which face.
//
//  `fontClass` must be applied to the element that carries data-template, so
//  the --ff-* vars are in scope for everything the template renders.

// Cormorant ships its italic glyphs in a separate file, so the src array binds
// that file to `style: italic` — giving TRUE italics rather than a synthesized
// slant for `.font-cormorant italic`.
const cormorant = localFont({
  src: [
    {
      path: "./fonts/CormorantGaramond-VariableFont_wght.ttf",
      weight: "300 700",
      style: "normal",
    },
    {
      path: "./fonts/CormorantGaramond-Italic-VariableFont_wght.ttf",
      weight: "300 700",
      style: "italic",
    },
  ],
  variable: "--ff-cormorant",
  display: "swap",
});

const manrope = localFont({
  src: "./fonts/Manrope-VariableFont_wght.ttf",
  weight: "200 800",
  variable: "--ff-manrope",
  display: "swap",
});


// NOTE: exmouth.ttf used to be loaded here (as --ff-couple AND --ff-heading, twice
// from the same file). Nothing ever rendered it — no component uses .font-script or
// .font-exmouth — so it is no longer loaded. The .ttf is still on disk if a future
// section wants it.
export const fontClass = `${cormorant.variable} ${manrope.variable}`;
