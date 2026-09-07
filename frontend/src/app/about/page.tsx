import type { Metadata } from "next";
import { Award, HeartHandshake, ShieldCheck, Target } from "lucide-react";
import JsonLd, { organizationSchema } from "@/components/marketing/JsonLd";
import Reveal from "@/components/marketing/Reveal";
import { Container, CtaLink, PageHero, Section, SectionHeading } from "@/components/marketing/primitives";
import { LeadCta, LogoCloud, StatsBand } from "@/components/marketing/sections";
import { companyValues, teamMembers } from "@/content/marketing";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: "About Us: Chartered Accountants, Company Secretaries & Tax Advisors",
  description: `${siteConfig.name} is a team of chartered accountants, company secretaries and tax professionals helping individuals, startups and businesses across India stay compliant.`,
  alternates: { canonical: "/about" },
};

const valueIcons = [Target, ShieldCheck, HeartHandshake];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <PageHero
        eyebrow="About us"
        title="Professionals who treat your compliance like their own"
        subtitle={`${siteConfig.name} brings together chartered accountants, company secretaries and tax specialists under one roof so that individuals, founders and finance teams have a single, accountable partner.`}
      >
        <CtaLink href="/contact" variant="secondary" size="lg" arrow>
          Talk to an Expert
        </CtaLink>
        <CtaLink href="/services" variant="white" size="lg">
          Our Services
        </CtaLink>
      </PageHero>

      <StatsBand />

      <Section>
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald">Our story</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-deep">Started by practitioners, built for clarity</h2>
            <div className="mt-6 space-y-4 text-slate-600">
              <p>
                We started as a small chartered accountancy practice serving salaried professionals and neighbourhood businesses.
                The questions were always the same: which form, which deadline, how much, and why. We built {siteConfig.name} to
                answer those questions plainly — and then take the work off your plate.
              </p>
              <p>
                Today our team supports thousands of individuals, startups and SMEs across India with income tax, GST, accounting,
                payroll, ROC compliance and business registration, backed by a secure client portal where you can track every
                filing, document and query.
              </p>
              <p>
                We are an independent professional services firm. We are not affiliated with the Income Tax Department, GSTN or
                the Ministry of Corporate Affairs; government fees and taxes are always shown separately from our professional fees.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Award, title: "Qualified team", text: "CAs, CSs and tax practitioners with 15+ years of combined experience." },
                { icon: ShieldCheck, title: "Two-level review", text: "Every filing is reviewed by a second professional before submission." },
                { icon: Target, title: "Fixed fees", text: "Prices quoted upfront. Government charges always shown separately." },
                { icon: HeartHandshake, title: "Named advisor", text: "One accountable person who knows your history and picks up the phone." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-navy-deep">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section tone="muted">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Our values" title="What we hold ourselves to" />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {companyValues.map((value, i) => {
              const Icon = valueIcons[i % valueIcons.length];
              return (
                <Reveal key={value.title} delay={i * 100}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-navy-deep">{value.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{value.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Leadership" title="Meet the people behind your filings" />
          </Reveal>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {teamMembers.map((member, i) => (
              <Reveal key={member.name} as="li" delay={i * 80}>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-navy to-primary-light text-lg font-bold text-white">
                    {member.initials}
                  </span>
                  <h3 className="mt-4 font-semibold text-navy-deep">{member.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{member.role}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="muted" className="py-12 sm:py-16 lg:py-16">
        <Container>
          <Reveal>
            <SectionHeading title="Trusted by Businesses Across Industries" />
          </Reveal>
          <div className="mt-10">
            <LogoCloud />
          </div>
        </Container>
      </Section>

      <LeadCta source="about" />
    </>
  );
}
