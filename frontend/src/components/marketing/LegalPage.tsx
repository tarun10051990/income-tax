import Link from "next/link";
import { Container } from "./primitives";
import { siteConfig } from "@/content/site";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Refund Policy", href: "/refund-policy" },
];

export default function LegalPage({
  title,
  intro,
  updated,
  sections,
  pathname,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
  pathname: string;
}) {
  return (
    <>
      <div className="border-b border-slate-200 bg-slate-50">
        <Container className="max-w-4xl py-14 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald">Legal</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-navy-deep">{title}</h1>
          <p className="mt-4 text-lg text-slate-600">{intro}</p>
          <p className="mt-4 text-sm text-slate-500">Last updated: {updated}</p>
        </Container>
      </div>
      <Container className="grid max-w-4xl gap-12 py-12 lg:grid-cols-[1fr_220px] lg:py-16">
        <div className="marketing-prose">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy can be sent to{" "}
              <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a> or by post to {siteConfig.legalName},{" "}
              {siteConfig.contact.address.line1}, {siteConfig.contact.address.line2}, {siteConfig.contact.address.city}{" "}
              {siteConfig.contact.address.pincode}.
            </p>
          </section>
        </div>
        <nav aria-label="Legal pages" className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={link.href === pathname ? "page" : undefined}
                  className={link.href === pathname ? "font-semibold text-navy" : "text-slate-600 hover:text-navy"}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </>
  );
}
