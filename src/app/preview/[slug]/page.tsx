import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RenderTemplate from "@/components/RenderTemplate";
import { loadTemplate } from "@/lib/store";
import { fontClassFor } from "@/templates/fonts";

// ═══════════════════════════════════════════════════════════════════════════
//  /preview/<slug> — a saved draft, server-rendered.
// ═══════════════════════════════════════════════════════════════════════════
//  Renders data/draft/<slug>.json through the very same path as a published
//  couple, so this is the *real* page: the honest check that what the editor
//  shows live and what a guest will actually receive agree.
//
//  It is no longer what the editor's iframe points at — that is /preview/live,
//  which renders in the browser from a postMessage and so updates on every
//  keystroke with no round-trip. This route is the "show me the real thing"
//  link, reached from the dashboard.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = await loadTemplate("draft", slug);
  if (!template) notFound();

  return (
    <RenderTemplate
      template={template}
      fontClass={fontClassFor(template.site.templateSlug)}
    />
  );
}
