import type { Metadata } from "next";
import Reveal from "@/components/marketing/Reveal";
import { Container, CtaLink, PageHero, Section } from "@/components/marketing/primitives";
import { HowItWorks, LeadCta } from "@/components/marketing/sections";
import ServiceFilter from "@/components/marketing/ServiceFilter";
import { services } from "@/content/services";

export const metadata: Metadata = {
  title: "Services: Income Tax, GST, Accounting, TDS, ROC & Registration",
  description:
    "Explore our full range of tax, accounting and compliance services for individuals, startups and businesses in India. Fixed fees, expert professionals.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Our services"
        title="Everything You Need to Stay Financially Compliant"
        subtitle="One team for income tax, GST, accounting, payroll, ROC and business registration. Pick a service or filter by who you are."
      >
        <CtaLink href="/contact" variant="secondary" size="lg" arrow>
          Talk to an Expert
        </CtaLink>
        <CtaLink href="/pricing" variant="white" size="lg">
          See Pricing
        </CtaLink>
      </PageHero>

      <Section>
        <Container>
          <ServiceFilter services={services} />
        </Container>
      </Section>

      <Section tone="muted">
        <Container>
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight text-navy-deep">How every engagement works</h2>
          </Reveal>
          <div className="mt-14">
            <HowItWorks />
          </div>
        </Container>
      </Section>

      <LeadCta source="services" />
    </>
  );
}
