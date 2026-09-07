import Link from "next/link";
import { Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { siteConfig } from "@/content/site";

export default function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden" role="region" aria-label="Quick contact">
      <div className="flex items-center gap-2">
        <a
          href={siteConfig.contact.phoneHref}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-navy"
          aria-label="Call us"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
        </a>
        <a
          href={siteConfig.contact.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald/40 bg-emerald/10 text-emerald"
          aria-label="Chat on WhatsApp"
        >
          <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
        </a>
        <Link
          href="/contact"
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-navy text-sm font-semibold text-white"
        >
          Talk to an Expert
        </Link>
      </div>
    </div>
  );
}
