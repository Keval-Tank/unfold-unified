import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RenderTemplate from "@/components/RenderTemplate";
import { loadTemplate } from "@/lib/store";
import { fontClassFor } from "@/templates/fonts";
import { assetUrl } from "@/lib/assets";
import { getCoupleNames, getCoupleFullNames, weddingInfo } from "@/lib/derive";

// ═══════════════════════════════════════════════════════════════════════════
//  /couple/<slug> — a real invitation.
// ═══════════════════════════════════════════════════════════════════════════
//  Server-rendered per request from data/couple/<slug>.json. That file is not in
//  public/ and no route serves it: the only way its contents reach anyone is as
//  the rendered page.
//
//  Deliberately NOT statically generated — a couple published a minute ago must
//  work without a rebuild. This is the whole point of dropping `output: "export"`:
//  a new couple is one JSON file, not a ~30 MB forked build.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = await loadTemplate("couple", slug);
  if (!template) return { title: "Invitation not found" };

  const names = getCoupleNames(template.couple);
  const title = `${names} Wedding Invitation`;
  const description = `You are invited to celebrate the wedding of ${getCoupleFullNames(
    template.couple
  )} on ${weddingInfo(template.wedding).longDisplay}.`;

  // The link-preview image is the couple's OWN cover photo — this is what shows
  // up when they share the invite on WhatsApp, and it is the single most visible
  // reason this page is server-rendered rather than built from a client fetch.
  const cover = template.content.cover;
  const coverImage =
    cover.design === "portrait" && cover.portraitImage
      ? cover.portraitImage
      : cover.classicImage;
  const ogImage = assetUrl(template.site.templateSlug, coverImage);

  return {
    title,
    description,
    // A couple's invitation is private — it is shared, not searched for.
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: ogImage, alt: names }],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CouplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = await loadTemplate("couple", slug);
  if (!template) notFound();

  // next/font is resolved HERE, on the server, and handed down as a plain class
  // string — see templates/fonts.ts.
  return (
    <RenderTemplate
      template={template}
      fontClass={fontClassFor(template.site.templateSlug)}
    />
  );
}
