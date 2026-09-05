import Link from "next/link";
import { siteConfig } from "@/content/site";
import { cn } from "@/lib/utils";

export default function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label={`${siteConfig.name} home`}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-primary-light shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 17l4-6 4 3 6-8" />
          <path strokeLinecap="round" d="M15 6h4v4" />
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald ring-2 ring-white" aria-hidden="true" />
      </span>
      <span className={cn("text-xl font-bold tracking-tight", dark ? "text-white" : "text-navy-deep")}>{siteConfig.name}</span>
    </Link>
  );
}
