import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RenderTemplate from "@/components/RenderTemplate";

import { loadTemplate } from "@/lib/store";
import { fontClassFor } from "@/templates/fonts";
import {
  buildSeo,
  buildJsonLd,
  getCoupleNames,
  getCoupleFullNames,
  weddingInfo,
} from "@/lib/derive";

// ═══════════════════════════════════════════════════════════════════════════
//  /design/<slug> — the public showcase for a template.
// ═══════════════════════════════════════════════════════════════════════════
//  Rendered on the SERVER from data/design/<slug>.json. The JSON is read here and
//  never served: there is no /template.json endpoint, and no fetch from the page.
//
//  The design is chosen by `site.templateSlug` in that JSON — hand it saffron's
//  data and you get saffron; hand it villa's and you get villa. One build, both.
//
//  Dynamic, not prerendered: the JSON lives in R2, which does not exist at build
//  time. Editing a showcase is a bucket write, not a rebuild.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = await loadTemplate("design", slug);
  if (!template) return {};

  const seo = buildSeo(template.site, template.seo);
  const title = `${getCoupleNames(template.couple)} Wedding Invitation`;
  const description = `You are invited to celebrate the wedding of ${getCoupleFullNames(
    template.couple
  )} on ${weddingInfo(template.wedding).longDisplay}.`;

  return {
    title,
    description,
    keywords: seo.keywords,
    applicationName: "Unfold Invite",
    creator: "Unfold Invite",
    publisher: "Unfold Invite",
    category: "Weddings",
    alternates: { canonical: seo.url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      type: "website",
      url: seo.url,
      siteName: "Unfold Invite",
      title,
      description,
      locale: "en_US",
      images: [{ url: seo.ogImage, width: 295, height: 635, alt: seo.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [seo.ogImage],
      creator: template.site.twitter,
      site: template.site.twitter,
    },
  };
}

export default async function DesignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = await loadTemplate("design", slug);
  if (!template) notFound();

  const jsonLd = buildJsonLd(
    template.site,
    buildSeo(template.site, template.seo)
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* The same render path as /couple/<slug> and the editor's preview. `site`,
          `seo` and the raw wedding fields are consumed above — they become <meta>
          tags and JSON-LD — and never travel into the page. */}
      <RenderTemplate
        template={template}
        fontClass={fontClassFor(template.site.templateSlug)}
      />
    </>
  );
}
