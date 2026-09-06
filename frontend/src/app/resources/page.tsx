import type { Metadata } from "next";
import HowToVideos from "@/components/marketing/HowToVideos";
import ResourceExplorer from "@/components/marketing/ResourceExplorer";
import { Container, CtaLink, PageHero, Section, SectionHeading } from "@/components/marketing/primitives";
import { LeadCta } from "@/components/marketing/sections";
import { resourceCategories, resourcePosts } from "@/content/resources";

export const metadata: Metadata = {
  title: "Resources: Tax Updates, GST Guides & Compliance Insights",
  description:
    "Plain-English guides and updates on income tax, GST, ROC compliance, startup finance and tax planning from our professionals.",
  alternates: { canonical: "/resources" },
};

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const initialCategory = resourceCategories.some((item) => item.id === category) ? category : undefined;

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Stay Ahead With Expert Insights"
        subtitle="Deadline calendars, regime comparisons, GST reconciliation tips and startup guides — written by the professionals who do this work every day."
      >
        <CtaLink href="/resources/videos" size="lg" arrow>
          Watch How-to Videos
        </CtaLink>
        <CtaLink href="/contact" variant="secondary" size="lg">
          Ask an Expert
        </CtaLink>
      </PageHero>
      <Section id="videos" tone="muted">
        <Container>
          <SectionHeading
            eyebrow="How-to videos"
            title="Watch a Filing From Start to Finish"
            subtitle="Two-minute walkthroughs of the TaxFilr portal for your Income Tax Return and your GST return."
          />
          <HowToVideos showSteps={false} className="mt-12" />
          <div className="mt-8 text-center">
            <CtaLink href="/resources/videos" variant="secondary" arrow>
              Step-by-step notes for each video
            </CtaLink>
          </div>
        </Container>
      </Section>
      <Section>
        <Container>
          <ResourceExplorer posts={resourcePosts} initialCategory={initialCategory} />
        </Container>
      </Section>
      <LeadCta source="resources" />
    </>
  );
}
