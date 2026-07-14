import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import { templateFor } from "@/templates/registry";
import { getCoupleNames, weddingInfo } from "@/lib/derive";
import type { TemplateData } from "@/lib/template-types";

// ═══════════════════════════════════════════════════════════════════════════
//  Render a template. The one render path, shared by every route.
// ═══════════════════════════════════════════════════════════════════════════
//  /design/<slug>, /couple/<slug>, the SSR /preview/<slug> and the editor's live
//  preview all come through here — which is what makes the preview trustworthy:
//  it is not an approximation of the invitation, it IS the invitation, produced
//  by the same components that serve the couple's guests.
//
//  On the guest routes it runs on the server and holds the whole TemplateData;
//  `site`, `seo` and the raw wedding fields stop here and never travel onward.
//  It is deliberately ISOMORPHIC — no server-only imports anywhere below it — so
//  the editor can render the identical tree in the browser and update it live.
//
//  `fontClass` comes in as a prop for exactly that reason: see Shell.

export default function RenderTemplate({
  template,
  fontClass,
}: {
  template: TemplateData;
  fontClass: string;
}) {
  const t = templateFor(template.site.templateSlug);
  // The JSON names a design this build doesn't ship. Only reachable from the
  // server routes — the editor's preview checks the slug before it gets here.
  if (!t) notFound();

  const Invitation = t.Invitation;

  return (
    <Shell template={template} fontClass={fontClass}>
      <Invitation
        content={template.content}
        couple={template.couple}
        coupleNames={getCoupleNames(template.couple)}
        wedding={weddingInfo(template.wedding)}
      />
    </Shell>
  );
}
