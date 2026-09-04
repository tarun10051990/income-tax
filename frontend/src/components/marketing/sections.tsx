import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Users } from "lucide-react";
import { clientLogos, howItWorks, whyChooseUs, type Audience } from "@/content/marketing";
import { getCategoryLabel, type ResourcePost } from "@/content/resources";
import { featuredServices, formatPrice, type Service } from "@/content/services";
import { siteConfig } from "@/content/site";
import { cn } from "@/lib/utils";
import Counter from "./Counter";
import LeadForm from "./LeadForm";
import Reveal from "./Reveal";
import { featureIcons, serviceIcons } from "./icons";
import { Container, CtaLink, Section, SectionHeading } from "./primitives";

export function StatsBand() {
  return (
    <div className="border-y border-slate-200 bg-white">
      <Container>
        <dl className="grid grid-cols-2 divide-slate-200 lg:grid-cols-4 lg:divide-x">
          {siteConfig.stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="px-4 py-8 text-center lg:py-10">
              <dt className="order-2 mt-1 text-sm font-medium text-slate-500">{stat.label}</dt>
              <dd className="text-3xl font-bold tracking-tight text-navy-deep sm:text-4xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </dd>
            </Reveal>
          ))}
        </dl>
      </Container>
    </div>
  );
}

export function AudienceCards({ items }: { items: Audience[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {items.map((audience, i) => {
        const Icon = serviceIcons[audience.icon];
        return (
          <Reveal key={audience.id} delay={i * 100} className="h-full">
            <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl">
              <div className={cn("absolute inset-x-0 top-0 h-32 bg-gradient-to-b", audience.accent)} aria-hidden="true" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-navy shadow-sm ring-1 ring-slate-200">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="relative mt-6 text-2xl font-bold text-navy-deep">{audience.title}</h3>
              <p className="relative mt-2 text-slate-600">{audience.description}</p>
              <ul className="relative mt-6 flex-1 space-y-2">
                {audience.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-emerald" aria-hidden="true" />
                    {highlight}
                  </li>
                ))}
              </ul>
              <CtaLink href={audience.href} variant="outline" className="relative mt-8 w-full" arrow>
                {audience.ctaLabel}
              </CtaLink>
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}

export function HowItWorks({ dark = false }: { dark?: boolean }) {
  return (
    <div className="relative">
      <Reveal className="process-line absolute left-[12.5%] right-[12.5%] top-7 hidden h-0.5 bg-gradient-to-r from-emerald via-primary-light to-emerald lg:block">
        <span className="sr-only">Process steps</span>
      </Reveal>
      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {howItWorks.map((step, i) => (
          <Reveal key={step.step} as="li" delay={i * 120} className="relative text-center">
            <span
              className={cn(
                "relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ring-8",
                dark ? "bg-emerald text-white ring-navy-deep" : "bg-navy text-white ring-slate-50",
              )}
            >
              {step.step}
            </span>
            <h3 className={cn("mt-5 text-lg font-semibold", dark ? "text-white" : "text-navy-deep")}>{step.title}</h3>
            <p className={cn("mt-2 text-sm leading-relaxed", dark ? "text-slate-300" : "text-slate-600")}>{step.description}</p>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

export function WhyChooseUs() {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-5">
      <Reveal className="lg:col-span-2">
        <div className="relative overflow-hidden rounded-3xl bg-navy-deep p-8 text-white shadow-2xl">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald/30 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Users className="h-6 w-6 text-emerald-light" aria-hidden="true" />
            </span>
            <p className="mt-6 text-2xl font-bold leading-snug">
              A named professional on every engagement — not a ticket number.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Your consultant reviews your history, calls you before deadlines and stays reachable on WhatsApp. That is how
              we keep a 99% on-time record.
            </p>
            <div className="mt-8 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald text-sm font-bold">KR</span>
                <div>
                  <p className="text-sm font-semibold">Kavitha Raman</p>
                  <p className="text-xs text-slate-400">Partner – GST & Indirect Tax</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-200">
                “Your March GSTR-3B is ready for review. Two vendors haven’t filed yet — I’ve flagged ₹18,400 of credit to
                carry forward.”
              </p>
            </div>
          </div>
        </div>
      </Reveal>
      <div className="grid gap-5 sm:grid-cols-2 lg:col-span-3">
        {whyChooseUs.map((feature, i) => {
          const Icon = featureIcons[feature.icon];
          return (
            <Reveal key={feature.title} delay={i * 80}>
              <div className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                  <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="font-semibold text-navy-deep">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

export function FeaturedServices({ items = featuredServices }: { items?: Service[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((service, i) => {
        const Icon = serviceIcons[service.icon];
        return (
          <Reveal key={service.slug} delay={i * 80} className="h-full">
            <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-navy-deep">{service.name}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">{service.summary}</p>
              <p className="mt-5 text-xs font-medium uppercase tracking-wider text-slate-500">Starting from</p>
              <p className="text-2xl font-bold text-navy-deep">
                {service.startingPrice === null ? "Custom quote" : formatPrice(service.startingPrice)}
                {service.priceUnit && <span className="ml-1 text-sm font-medium text-slate-500">{service.priceUnit}</span>}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <CtaLink href={`/services/${service.slug}`} variant="outline" size="sm">
                  View Details
                </CtaLink>
                <CtaLink href={siteConfig.portal.getStartedHref} size="sm">
                  Get Started
                </CtaLink>
              </div>
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}

export function LogoCloud() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {clientLogos.map((logo, i) => (
        <Reveal key={logo.name} as="li" delay={i * 40}>
          <div
            className="group flex h-20 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 grayscale transition-all duration-300 hover:grayscale-0"
            title={logo.name}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-primary-light text-xs font-bold text-white opacity-60 transition-opacity group-hover:opacity-100">
              {logo.mark}
            </span>
            <span className="text-sm font-semibold text-slate-500 transition-colors group-hover:text-navy-deep">{logo.name}</span>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}

export function ResourceCard({ post, index = 0 }: { post: ResourcePost; index?: number }) {
  return (
    <Reveal delay={index * 60} as="article" className="h-full">
      <Link
        href={`/resources/${post.slug}`}
        className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
      >
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="rounded-full bg-emerald/10 px-2.5 py-1 font-semibold text-emerald">{getCategoryLabel(post.category)}</span>
          <time dateTime={post.date} className="inline-flex items-center gap-1 text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </time>
        </div>
        <h3 className="mt-4 text-lg font-semibold leading-snug text-navy-deep group-hover:text-navy">{post.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:text-emerald">
          Read More
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </Reveal>
  );
}

export function LeadCta({ source, defaultService }: { source: string; defaultService?: string }) {
  return (
    <Section id="callback" className="relative overflow-hidden bg-navy-deep text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.25),transparent_55%)]" aria-hidden="true" />
      <Container className="relative grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-light">Free consultation</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Not Sure What You Need? Let’s Figure It Out Together.</h2>
          <p className="mt-5 text-lg text-slate-300">
            Tell us about your requirement and our experts will help you choose the right solution.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            {["Callback within one working day", "Fixed-fee proposal, no hidden charges", "Talk to a qualified professional, not a sales rep"].map(
              (point) => (
                <li key={point} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald/20">
                    <Check className="h-3.5 w-3.5 text-emerald-light" aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ),
            )}
          </ul>
        </Reveal>
        <Reveal delay={120}>
          <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <LeadForm source={source} defaultService={defaultService} />
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

export function SectionCta({ title, subtitle, href = "/contact", label = "Talk to an Expert" }: { title: string; subtitle?: string; href?: string; label?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <SectionHeading title={title} subtitle={subtitle} />
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <CtaLink href={href} size="lg" arrow>
          {label}
        </CtaLink>
        <CtaLink href={siteConfig.portal.getStartedHref} size="lg" variant="outline">
          Get Started Online
        </CtaLink>
      </div>
    </div>
  );
}
