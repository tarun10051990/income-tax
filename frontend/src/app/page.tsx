import type { Metadata } from "next";
import { Check } from "lucide-react";
import FaqAccordion from "@/components/marketing/FaqAccordion";
import HeroVisual from "@/components/marketing/HeroVisual";
import PricingTabs from "@/components/marketing/PricingTabs";
import Reveal from "@/components/marketing/Reveal";
import ServiceCard from "@/components/marketing/ServiceCard";
import TestimonialCarousel from "@/components/marketing/TestimonialCarousel";
import JsonLd, { faqSchema, organizationSchema } from "@/components/marketing/JsonLd";
import { Container, CtaLink, Section, SectionHeading } from "@/components/marketing/primitives";
import {
  AudienceCards,
  FeaturedServices,
  HowItWorks,
  LeadCta,
  LogoCloud,
  ResourceCard,
  StatsBand,
  WhyChooseUs,
} from "@/components/marketing/sections";
import { audiences, generalFaqs } from "@/content/marketing";
import { resourcePosts } from "@/content/resources";
import { services } from "@/content/services";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: `${siteConfig.name} | Income Tax, GST, Accounting & Compliance Experts in India`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const homeFaqs = generalFaqs.slice(0, 6);

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationSchema(), faqSchema(homeFaqs)]} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-50">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden="true" />
        <Container className="relative grid items-center gap-14 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-navy shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald" aria-hidden="true" />
                Income Tax · GST · Accounting · Compliance
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-navy-deep sm:text-5xl lg:text-6xl">
                Simplifying Taxes.
                <br />
                <span className="bg-gradient-to-r from-navy via-primary-light to-emerald bg-clip-text text-transparent">
                  Strengthening Businesses.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Expert tax, accounting and compliance solutions for individuals, startups and growing businesses — all under
                one roof.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap gap-3">
                <CtaLink href={siteConfig.portal.getStartedHref} size="lg" arrow>
                  Get Started
                </CtaLink>
                <CtaLink href="/contact" size="lg" variant="outline">
                  Talk to an Expert
                </CtaLink>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <ul className="mt-10 grid grid-cols-2 gap-3 text-sm font-medium text-slate-700 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {siteConfig.trustIndicators.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/10">
                      <Check className="h-3 w-3 text-emerald" aria-hidden="true" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={200} className="lg:pl-6">
            <HeroVisual />
          </Reveal>
        </Container>
      </section>

      <StatsBand />

      {/* Services */}
      <Section id="services">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Our services"
              title="Everything You Need to Stay Financially Compliant"
              subtitle="From tax filing to business compliance, our experts take care of the complexity so you can focus on what matters."
            />
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <Reveal key={service.slug} delay={(i % 3) * 80} className="h-full">
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Who we serve */}
      <Section tone="muted" id="who-we-serve">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Who we serve" title="Built for every stage of your financial journey" />
          </Reveal>
          <div className="mt-14">
            <AudienceCards items={audiences} />
          </div>
        </Container>
      </Section>

      {/* How it works */}
      <Section id="how-it-works">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="How it works" title="Four steps to stress-free compliance" />
          </Reveal>
          <div className="mt-16">
            <HowItWorks />
          </div>
        </Container>
      </Section>

      {/* Why choose us */}
      <Section tone="muted" id="why-us">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Why choose us" title="Professional Expertise. Simple Experience." />
          </Reveal>
          <div className="mt-14">
            <WhyChooseUs />
          </div>
        </Container>
      </Section>

      {/* Featured services */}
      <Section id="popular">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Popular"
              title="Most Trusted Services"
              subtitle="Transparent starting prices. Government fees and taxes are always shown separately."
            />
          </Reveal>
          <div className="mt-14">
            <FeaturedServices />
          </div>
        </Container>
      </Section>

      {/* Pricing */}
      <Section tone="muted" id="pricing">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Pricing" title="Simple plans for individuals, businesses and startups" />
          </Reveal>
          <div className="mt-12">
            <PricingTabs />
          </div>
          <Reveal className="mt-12">
            <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-navy-deep to-navy p-8 text-white sm:flex-row sm:p-10">
              <div>
                <h3 className="text-2xl font-bold">Need something customized?</h3>
                <p className="mt-2 text-slate-300">Talk to our experts and get a plan tailored to your requirements.</p>
              </div>
              <CtaLink href="/contact?intent=custom-plan" variant="white" size="lg" arrow className="shrink-0">
                Request Custom Plan
              </CtaLink>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Testimonials */}
      <Section id="testimonials">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Testimonials" title="Trusted by Individuals & Businesses" />
          </Reveal>
          <div className="mt-14">
            <TestimonialCarousel />
          </div>
        </Container>
      </Section>

      {/* Logos */}
      <Section tone="muted" className="py-12 sm:py-16 lg:py-16" id="clients">
        <Container>
          <Reveal>
            <SectionHeading title="Trusted by Businesses Across Industries" />
          </Reveal>
          <div className="mt-10">
            <LogoCloud />
          </div>
        </Container>
      </Section>

      {/* Resources */}
      <Section id="insights">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading eyebrow="Resources" title="Stay Ahead With Expert Insights" align="left" />
              <CtaLink href="/resources" variant="outline" arrow className="shrink-0">
                View all resources
              </CtaLink>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resourcePosts.slice(0, 6).map((post, i) => (
              <ResourceCard key={post.slug} post={post} index={i} />
            ))}
          </div>
        </Container>
      </Section>

      {/* FAQ */}
      <Section tone="muted" id="faq">
        <Container className="max-w-4xl">
          <Reveal>
            <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          </Reveal>
          <Reveal className="mt-12">
            <FaqAccordion items={homeFaqs} />
          </Reveal>
          <p className="mt-8 text-center text-sm text-slate-600">
            Have more questions?{" "}
            <CtaLink href="/faq" variant="ghost" size="sm" arrow>
              Browse the full FAQ
            </CtaLink>
          </p>
        </Container>
      </Section>

      <LeadCta source="home" />
    </>
  );
}
