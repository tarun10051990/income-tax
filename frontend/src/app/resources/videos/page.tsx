import type { Metadata } from "next";
import JsonLd, { breadcrumbSchema } from "@/components/marketing/JsonLd";
import HowToVideos from "@/components/marketing/HowToVideos";
import { Container, CtaLink, PageHero, Section } from "@/components/marketing/primitives";
import { LeadCta } from "@/components/marketing/sections";
import { howToVideos, videoPoster, videoSrc } from "@/content/videos";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: "How-to Videos: File Your ITR and GST Returns Step by Step",
  description:
    "Two-minute screen walkthroughs showing how to upload Form 16 and generate your ITR, and how to record invoices, reconcile and send a GST return for filing on TaxFilr.",
  alternates: { canonical: "/resources/videos" },
};

export default function HowToVideosPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", href: "/" },
            { name: "Resources", href: "/resources" },
            { name: "How-to videos", href: "/resources/videos" },
          ]),
          ...howToVideos.map((video) => ({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: video.title,
            description: video.description,
            thumbnailUrl: `${siteConfig.url}${videoPoster(video)}`,
            contentUrl: `${siteConfig.url}${videoSrc(video)}`,
            uploadDate: "2026-09-06",
          })),
        ]}
      />
      <PageHero
        eyebrow="How-to videos"
        title="See How Filing Works, in Two Minutes"
        subtitle="Short screen recordings of the TaxFilr portal: one for your Income Tax Return, one for GST. Watch, then follow the steps at your own pace."
      >
        <CtaLink href="/auth/register" size="lg" arrow>
          Get Started Free
        </CtaLink>
        <CtaLink href="/contact" variant="secondary" size="lg">
          Ask an Expert
        </CtaLink>
      </PageHero>
      <Section>
        <Container>
          <HowToVideos />
          <p className="mt-8 text-sm text-slate-500">
            The recordings use sample data. Returns sent for review are filed by a TaxFilr professional; the
            acknowledgement (ITR-V / ARN) appears in your portal only after the government portal issues it.
          </p>
        </Container>
      </Section>
      <LeadCta source="resources-videos" />
    </>
  );
}
