import { Check } from "lucide-react";
import type { PricingAudience } from "@/content/pricing";
import { services } from "@/content/services";
import { siteConfig } from "@/content/site";
import FaqAccordion, { type FaqItem } from "./FaqAccordion";
import JsonLd, { breadcrumbSchema, faqSchema } from "./JsonLd";
import PricingTabs from "./PricingTabs";
import Reveal from "./Reveal";
import ServiceCard from "./ServiceCard";
import { Container, CtaLink, PageHero, Section, SectionHeading } from "./primitives";
import { HowItWorks, LeadCta } from "./sections";

export interface AudiencePageProps {
  id: PricingAudience;
  eyebrow: string;
  title: string;
  subtitle: string;
  pains: Array<{ title: string; description: string }>;
  faqs: FaqItem[];
  pathname: string;
}

export default function AudiencePage({ id, eyebrow, title, subtitle, pains, faqs, pathname }: AudiencePageProps) {
  const relevant = services.filter((service) => service.audiences.includes(id));
  return (
    <>
      <JsonLd data={[faqSchema(faqs), breadcrumbSchema([{ name: "Home", href: "/" }, { name: eyebrow, href: pathname }])]} />
      <PageHero eyebrow={eyebrow} title={title} subtitle={subtitle}>
        <CtaLink href={siteConfig.portal.getStartedHref} variant="secondary" size="lg" arrow>
          Get Started
        </CtaLink>
        <CtaLink href="/contact" variant="white" size="lg">
          Talk to an Expert
        </CtaLink>
      </PageHero>

      <Section>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="What we solve" title="Common challenges we take off your plate" />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pains.map((pain, i) => (
              <Reveal key={pain.title} delay={i * 80}>
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-navy-deep">{pain.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{pain.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="muted">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Services" title={`Services for ${eyebrow.toLowerCase()}`} />
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relevant.map((service, i) => (
              <Reveal key={service.slug} delay={(i % 3) * 80} className="h-full">
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="How it works" title="Four steps to stress-free compliance" />
          </Reveal>
          <div className="mt-16">
            <HowItWorks />
          </div>
        </Container>
      </Section>

      <Section tone="muted">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Pricing" title="Transparent plans" />
          </Reveal>
          <div className="mt-12">
            <PricingTabs initial={id} />
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="max-w-4xl">
          <Reveal>
            <SectionHeading eyebrow="FAQ" title="Questions we hear most" />
          </Reveal>
          <Reveal className="mt-12">
            <FaqAccordion items={faqs} />
          </Reveal>
        </Container>
      </Section>

      <LeadCta source={pathname.replace("/", "")} />
    </>
  );
}
