import type { Metadata } from "next";
import FaqAccordion from "@/components/marketing/FaqAccordion";
import PricingTabs from "@/components/marketing/PricingTabs";
import Reveal from "@/components/marketing/Reveal";
import { Container, CtaLink, PageHero, Section, SectionHeading } from "@/components/marketing/primitives";
import { FeaturedServices, LeadCta } from "@/components/marketing/sections";
import type { PricingAudience } from "@/content/pricing";
import { pricingTabs } from "@/content/pricing";

export const metadata: Metadata = {
  title: "Pricing: Transparent Plans for ITR, GST, Accounting & Startups",
  description:
    "Fixed-fee pricing for income tax filing, GST compliance, accounting, company registration and startup packages. No hidden charges; government fees shown separately.",
  alternates: { canonical: "/pricing" },
};

const pricingFaqs = [
  {
    question: "Are government fees included?",
    answer: "No. Professional fees are fixed and quoted upfront; statutory fees, stamp duty and taxes payable to the government are shown separately and paid at actuals.",
  },
  {
    question: "Can I upgrade or change my plan later?",
    answer: "Yes. Monthly plans can be upgraded any time and the difference is prorated. Annual plans can be upgraded at renewal or earlier on request.",
  },
  {
    question: "What if my requirement doesn’t fit a plan?",
    answer: "Request a custom plan. An advisor will scope your requirement and share a fixed-fee proposal within one working day.",
  },
  {
    question: "Do you offer refunds?",
    answer: "If we have not started work on your engagement, fees are refundable in full. See our refund policy for details.",
  },
];

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initial = pricingTabs.some((item) => item.id === tab) ? (tab as PricingAudience) : "individuals";

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Transparent pricing. No surprises."
        subtitle="Choose a plan for individuals, businesses or startups. Every price is a fixed professional fee — government charges are always shown separately before you pay."
      >
        <CtaLink href="/contact?intent=custom-plan" variant="secondary" size="lg" arrow>
          Request Custom Plan
        </CtaLink>
      </PageHero>

      <Section>
        <Container>
          <PricingTabs initial={initial} />
          <Reveal className="mt-14">
            <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-navy-deep to-navy p-8 text-white sm:flex-row sm:p-10">
              <div>
                <h2 className="text-2xl font-bold">Need something customized?</h2>
                <p className="mt-2 text-slate-300">Talk to our experts and get a plan tailored to your requirements.</p>
              </div>
              <CtaLink href="/contact?intent=custom-plan" variant="white" size="lg" arrow className="shrink-0">
                Request Custom Plan
              </CtaLink>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section tone="muted">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Popular" title="Most Trusted Services" />
          </Reveal>
          <div className="mt-12">
            <FeaturedServices />
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="max-w-4xl">
          <Reveal>
            <SectionHeading eyebrow="Pricing FAQ" title="Questions about pricing" />
          </Reveal>
          <Reveal className="mt-12">
            <FaqAccordion items={pricingFaqs} />
          </Reveal>
        </Container>
      </Section>

      <LeadCta source="pricing" />
    </>
  );
}
