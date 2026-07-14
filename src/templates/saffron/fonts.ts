import localFont from "next/font/local";

// ═══════════════════════════════════════════════════════════════════════════
//  SAFFRON — the typefaces this template owns.
// ═══════════════════════════════════════════════════════════════════════════
//  Each face is exposed as a raw --ff-* CSS variable. The shared globals.css
//  declares the *roles* (--font-body, --font-heading, …) that point at these,
//  and theme.css decides which role gets which face. So swapping a typeface is
//  a one-line change here; no markup or copy is touched.
//
//  `fontClass` must be applied to the element that carries data-template, so
//  the --ff-* vars are in scope for everything the template renders.

const cormorant = localFont({
  src: "./fonts/CormorantGaramond-VariableFont_wght.ttf",
  variable: "--ff-cormorant",
  display: "swap",
});

const montserrat = localFont({
  src: "./fonts/Montserrat-VariableFont_wght.ttf",
  variable: "--ff-montserrat",
  display: "swap",
});

export const fontClass = `${cormorant.variable} ${montserrat.variable}`;
