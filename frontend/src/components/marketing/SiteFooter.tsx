import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { footerColumns, siteConfig } from "@/content/site";
import Logo from "./Logo";
import { socialIcons } from "./icons";
import { Container } from "./primitives";

export default function SiteFooter() {
  const { contact } = siteConfig;
  return (
    <footer className="border-t border-slate-800 bg-navy-deep text-slate-300">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{siteConfig.description}</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-light" aria-hidden="true" />
                <span>
                  {contact.address.line1}, {contact.address.line2}, {contact.address.city} {contact.address.pincode}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-emerald-light" aria-hidden="true" />
                <a href={contact.phoneHref} className="hover:text-white">
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-emerald-light" aria-hidden="true" />
                <a href={`mailto:${contact.email}`} className="hover:text-white">
                  {contact.email}
                </a>
              </li>
            </ul>
          </div>

          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{column.heading}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-slate-400 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.legalName}. All Rights Reserved.
          </p>
          <ul className="flex items-center gap-3">
            {siteConfig.social.map((item) => {
              const Icon = socialIcons[item.icon];
              return (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition-colors hover:border-emerald hover:text-white"
                  >
                    {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600 sm:text-left">
          {siteConfig.name} is an independent professional services firm and is not affiliated with the Income Tax Department,
          GSTN or the Ministry of Corporate Affairs. Government fees and taxes are payable separately and shown transparently.
        </p>
      </Container>
    </footer>
  );
}
