"use client";

import { useEffect, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import RenderTemplate from "@/components/RenderTemplate";
import { templateFor } from "@/templates/registry";
import {
  PREVIEW_DATA,
  PREVIEW_READY,
  type PreviewMessage,
} from "@/lib/preview-messages";
import type { TemplateData } from "@/lib/template-types";

// ═══════════════════════════════════════════════════════════════════════════
//  The editor's live preview — the invitation, rendered in the browser.
// ═══════════════════════════════════════════════════════════════════════════
//  The editor posts the template here on every change and this re-renders in
//  place. No draft save, no server round-trip, no reload — so the cover screen
//  stays dismissed, the scroll position holds, and there is no white flash.
//
//  It renders through RenderTemplate: the SAME components, with the SAME props,
//  that serve a guest on /couple/<slug>. Only the environment differs — server
//  there, browser here. That is only possible because the invitation tree is
//  isomorphic (no server-only imports anywhere in it), and it stays that way
//  because the one thing that isn't — next/font — arrives as `fontClass`,
//  resolved by the server page that renders this.
//
//  On the config: the whole template lives in this window. That is not a leak.
//  This is an operator route, the operator already has the config open in the
//  form next to it, and no guest ever loads /preview/live.

export default function PreviewLive({
  fontClasses,
}: {
  /** Resolved next/font classes per template, computed server-side. */
  fontClasses: Record<string, string>;
}) {
  const [template, setTemplate] = useState<TemplateData | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // A postMessage listener hears from ANY origin unless it says otherwise.
      if (event.origin !== window.location.origin) return;

      const message = event.data as PreviewMessage | undefined;
      if (message?.type !== PREVIEW_DATA) return;
      setTemplate(message.data);
    };

    window.addEventListener("message", onMessage);
    // Announce on mount rather than waiting to be spoken to, so a reload of this
    // frame (or a Fast Refresh) re-syncs itself without the editor noticing.
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);

    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Toggling a section off unmounts it; editing a heading reflows the page. Either
  // way every ScrollTrigger below now holds stale start/end pixels, and the pinned
  // sections would pin at the wrong scroll offsets. Re-measure after the browser
  // has laid the new tree out — hence rAF, not a bare call.
  useEffect(() => {
    if (!template) return;
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [template]);

  if (!template) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-900 text-xs text-neutral-500">
        waiting for the editor…
      </div>
    );
  }

  const slug = template.site.templateSlug;

  // RenderTemplate calls notFound() on an unknown design, which is right on a
  // server route and useless in an iframe. Catch it here instead and say so.
  if (!templateFor(slug)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-900 p-6 text-center text-xs text-red-400">
        This build ships no design called “{slug}”.
      </div>
    );
  }

  return <RenderTemplate template={template} fontClass={fontClasses[slug] ?? ""} />;
}
