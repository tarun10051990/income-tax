import type { Metadata } from "next";
import FaqAccordion from "@/components/marketing/FaqAccordion";
import JsonLd, { faqSchema } from "@/components/marketing/JsonLd";
import Reveal from "@/components/marketing/Reveal";
import { Container, CtaLink, PageHero, Section } from "@/components/marketing/primitives";
import { LeadCta } from "@/components/marketing/sections";
import { generalFaqs } from "@/content/marketing";
import { services } from "@/content/services";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about ITR filing, GST registration and returns, accounting, company registration, tax planning and how we protect your documents.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const serviceGroups = services.filter((service) => service.faqs.length > 0);
  return (
    <>
      <JsonLd data={faqSchema([...generalFaqs, ...serviceGroups.flatMap((s) => s.faqs)])} />
      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        subtitle="Straight answers on filing, pricing, timelines and security. Can’t find yours? Ask an expert — it’s free."
      >
        <CtaLink href="/contact" variant="secondary" size="lg" arrow>
          Ask an Expert
        </CtaLink>
      </PageHero>

      <Section>
        <Container className="max-w-4xl">
          <Reveal>
            <h2 className="text-2xl font-bold text-navy-deep">General</h2>
            <div className="mt-6">
              <FaqAccordion items={generalFaqs} />
            </div>
          </Reveal>
          {serviceGroups.map((service) => (
            <Reveal key={service.slug} className="mt-16">
              <h2 className="text-2xl font-bold text-navy-deep">{service.name}</h2>
              <div className="mt-6">
                <FaqAccordion items={service.faqs} defaultOpen={null} />
              </div>
            </Reveal>
          ))}
        </Container>
      </Section>

      <LeadCta source="faq" />
    </>
  );
}
