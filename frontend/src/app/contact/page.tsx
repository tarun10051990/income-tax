import type { Metadata } from "next";
import { CalendarCheck, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import JsonLd, { organizationSchema } from "@/components/marketing/JsonLd";
import LeadForm from "@/components/marketing/LeadForm";
import Reveal from "@/components/marketing/Reveal";
import { Container, CtaLink, PageHero, Section } from "@/components/marketing/primitives";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact Us: Talk to a Tax Expert",
  description: `Call, WhatsApp or book a free consultation with ${siteConfig.name}. Offices in ${siteConfig.contact.address.city}; serving clients across India.`,
  alternates: { canonical: "/contact" },
};

const INTENT_SERVICE: Record<string, string> = {
  "custom-plan": "Custom Plan",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ intent?: string; service?: string }> }) {
  const { intent, service } = await searchParams;
  const defaultService = service ?? (intent ? INTENT_SERVICE[intent] : undefined);
  const { contact } = siteConfig;

  return (
    <>
      <JsonLd data={organizationSchema()} />
      <PageHero
        eyebrow="Contact"
        title="Let’s talk about your taxes and compliance"
        subtitle="Call, WhatsApp or leave your details — a qualified professional (not a sales team) gets back to you within one working day."
      >
        <CtaLink href={contact.phoneHref} variant="secondary" size="lg" external>
          <Phone className="h-4 w-4" aria-hidden="true" />
          Call {contact.phone}
        </CtaLink>
        <CtaLink href={contact.whatsappHref} variant="white" size="lg" external>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp Us
        </CtaLink>
      </PageHero>

      <Section id="book">
        <Container className="grid gap-12 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                  <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-navy-deep">Book a Free Consultation</h2>
                  <p className="text-sm text-slate-600">Tell us what you need and pick how you’d like us to reach you.</p>
                </div>
              </div>
              <div className="mt-6">
                <LeadForm source="contact" defaultService={defaultService} submitLabel="Book My Consultation" />
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-bold text-navy-deep">Reach us directly</h2>
              <ul className="mt-5 space-y-5 text-sm">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
                  <address className="not-italic text-slate-700">
                    <span className="font-semibold text-navy-deep">{siteConfig.legalName}</span>
                    <br />
                    {contact.address.line1}
                    <br />
                    {contact.address.line2}
                    <br />
                    {contact.address.city}, {contact.address.state} {contact.address.pincode}
                  </address>
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
                  <div>
                    <a href={contact.phoneHref} className="font-semibold text-navy-deep hover:text-emerald">
                      {contact.phone}
                    </a>
                    <p className="text-slate-600">Call or WhatsApp</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
                  <div>
                    <a href={`mailto:${contact.email}`} className="font-semibold text-navy-deep hover:text-emerald">
                      {contact.email}
                    </a>
                    <p className="text-slate-600">
                      Existing clients:{" "}
                      <a href={`mailto:${contact.supportEmail}`} className="underline-offset-4 hover:underline">
                        {contact.supportEmail}
                      </a>
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-700">
                    {contact.hours.map((slot) => (
                      <div key={slot.days} className="contents">
                        <dt className="font-medium text-navy-deep">{slot.days}</dt>
                        <dd>{slot.time}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <iframe
                title={`Map showing ${siteConfig.name} office location`}
                src={contact.mapEmbedUrl}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
