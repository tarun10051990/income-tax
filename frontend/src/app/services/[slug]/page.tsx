import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, FileText } from "lucide-react";
import FaqAccordion from "@/components/marketing/FaqAccordion";
import JsonLd, { breadcrumbSchema, faqSchema, serviceSchema } from "@/components/marketing/JsonLd";
import LeadForm from "@/components/marketing/LeadForm";
import Reveal from "@/components/marketing/Reveal";
import ServiceCard from "@/components/marketing/ServiceCard";
import { serviceIcons } from "@/components/marketing/icons";
import { Container, CtaLink, Section, SectionHeading } from "@/components/marketing/primitives";
import { formatPrice, getService, services } from "@/content/services";
import { siteConfig } from "@/content/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: service.seoTitle,
    description: service.seoDescription,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: { title: service.seoTitle, description: service.seoDescription, url: `/services/${service.slug}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const Icon = serviceIcons[service.icon];
  const related = services.filter((item) => item.slug !== service.slug && item.audiences.some((a) => service.audiences.includes(a))).slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          serviceSchema(service),
          faqSchema(service.faqs),
          breadcrumbSchema([
            { name: "Home", href: "/" },
            { name: "Services", href: "/services" },
            { name: service.name, href: `/services/${service.slug}` },
          ]),
        ]}
      />

      <div className="relative overflow-hidden bg-navy-deep text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.2),transparent_55%)]" aria-hidden="true" />
        <Container className="relative grid items-center gap-12 py-16 lg:grid-cols-5 lg:py-24">
          <div className="lg:col-span-3">
            <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-white">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/services" className="hover:text-white">
                    Services
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-white">
                  {service.name}
                </li>
              </ol>
            </nav>
            <div className="mt-6 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Icon className="h-7 w-7 text-emerald-light" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-light">{service.name}</p>
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{service.headline}</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">{service.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CtaLink href="#enquire" variant="secondary" size="lg" arrow>
                Get Started
              </CtaLink>
              <CtaLink href="/contact" variant="white" size="lg">
                Talk to an Expert
              </CtaLink>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-3xl bg-white p-8 text-navy-deep shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Starting from</p>
              <p className="mt-2 text-4xl font-bold">
                {service.startingPrice === null ? "Custom quote" : formatPrice(service.startingPrice)}
                {service.priceUnit && <span className="ml-1 text-base font-medium text-slate-500">{service.priceUnit}</span>}
              </p>
              <p className="mt-2 text-sm text-slate-600">Fixed professional fee. Government charges shown separately.</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {service.inclusions.slice(0, 4).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <CtaLink href={siteConfig.portal.getStartedHref} className="mt-8 w-full" size="lg">
                Start Online
              </CtaLink>
            </div>
          </div>
        </Container>
      </div>

      <Section>
        <Container className="grid gap-12 lg:grid-cols-3">
          <div className="space-y-14 lg:col-span-2">
            <Reveal>
              <h2 className="text-2xl font-bold text-navy-deep">What’s included</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {service.inclusions.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal>
              <h2 className="text-2xl font-bold text-navy-deep">How it works</h2>
              <ol className="mt-6 space-y-4">
                {service.process.map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{i + 1}</span>
                    <p className="pt-1.5 text-slate-700">{step}</p>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal>
              <h2 className="text-2xl font-bold text-navy-deep">Documents you’ll need</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {service.documents.map((doc) => (
                  <li key={doc} className="flex items-center gap-3 text-sm text-slate-700">
                    <FileText className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                    {doc}
                  </li>
                ))}
              </ul>
            </Reveal>

            {service.faqs.length > 0 && (
              <Reveal>
                <h2 className="text-2xl font-bold text-navy-deep">Frequently asked questions</h2>
                <div className="mt-6">
                  <FaqAccordion items={service.faqs} />
                </div>
              </Reveal>
            )}
          </div>

          <aside id="enquire" className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <h2 className="text-xl font-bold text-navy-deep">Enquire about {service.name}</h2>
              <p className="mt-1 text-sm text-slate-600">An expert will call you within one working day.</p>
              <div className="mt-6">
                <LeadForm source={`service-${service.slug}`} defaultService={service.name} compact submitLabel="Request a Callback" />
              </div>
            </div>
          </aside>
        </Container>
      </Section>

      {related.length > 0 && (
        <Section tone="muted">
          <Container>
            <SectionHeading title="Related services" />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <ServiceCard key={item.slug} service={item} />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
