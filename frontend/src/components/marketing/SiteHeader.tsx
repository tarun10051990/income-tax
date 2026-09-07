"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { mainNav, siteConfig } from "@/content/site";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { CtaLink } from "./primitives";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lg"
      >
        Skip to content
      </a>

      <div className="bg-navy-deep text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-center text-xs sm:text-sm">
          <p className="truncate text-slate-200">{siteConfig.announcement.text}</p>
          <Link
            href={siteConfig.announcement.ctaHref}
            className="hidden shrink-0 items-center gap-1 font-semibold text-emerald-light hover:text-white sm:inline-flex"
          >
            {siteConfig.announcement.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className={cn(
          "border-b transition-colors duration-200",
          scrolled ? "border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md" : "border-transparent bg-white",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />

          <ul className="hidden items-center gap-1 lg:flex">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href) ? "text-navy" : "text-slate-600 hover:bg-slate-100 hover:text-navy",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href={siteConfig.contact.phoneHref}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy xl:inline-flex"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {siteConfig.contact.phone}
            </a>
            <CtaLink href="/contact" className="hidden md:inline-flex">
              Talk to an Expert
            </CtaLink>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy hover:bg-slate-100 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={cn(
            "lg:hidden",
            open ? "block border-t border-slate-200 bg-white" : "hidden",
          )}
        >
          <ul className="space-y-1 px-4 py-4">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-base font-medium",
                    isActive(item.href) ? "bg-slate-100 text-navy" : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-4">
            <CtaLink href="/contact" className="w-full">
              Talk to an Expert
            </CtaLink>
            <CtaLink href={siteConfig.portal.loginHref} variant="outline" className="w-full">
              Client Login
            </CtaLink>
          </div>
        </div>
      </nav>
    </header>
  );
}
