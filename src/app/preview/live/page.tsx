import type { Metadata } from "next";
import PreviewLive from "@/components/PreviewLive";
import { FONT_CLASSES } from "@/templates/fonts";

// ═══════════════════════════════════════════════════════════════════════════
//  /preview/live — the editor's iframe.
// ═══════════════════════════════════════════════════════════════════════════
//  A shell with no content: it mounts once and then renders whatever the editor
//  posts to it. It ships no template data of its own, which is why it can be a
//  static page — the invitation arrives over postMessage.
//
//  Its one job as a SERVER component is to resolve next/font, because that only
//  works in server-land. Both templates' classes are handed down, since the
//  operator can switch design without this frame ever reloading.
//
//  Sits alongside /preview/<slug>, which server-renders a SAVED draft. That one
//  is the real page; this one is the live one. Static route beats dynamic, so
//  "live" can never be captured by a couple's slug — and store.ts reserves it
//  anyway.
export const metadata: Metadata = {
  title: "Live preview",
  robots: { index: false, follow: false },
};

export default function PreviewLivePage() {
  return <PreviewLive fontClasses={FONT_CLASSES} />;
}
