/**
 * Public-site content model. Defaults come from `src/content/*`; at runtime every collection can be
 * overridden by published entries from the admin CMS (`/api/public/cms`). Anything not managed in
 * the CMS falls back to the bundled defaults so the site always renders.
 */
import type { LegalSection } from "@/components/marketing/LegalPage";
import {
  disclaimerSections,
  legalUpdated,
  privacySections,
  refundSections,
  termsSections,
} from "@/content/legal";
import {
  audiences,
  clientLogos,
  companyValues,
  generalFaqs,
  howItWorks,
  teamMembers,
  testimonials,
  whyChooseUs,
  type Audience,
  type ClientLogo,
  type FeatureIconName,
  type Testimonial,
} from "@/content/marketing";
import { pricingTabs, type PricingAudience, type PricingPlan } from "@/content/pricing";
import { resourceCategories, resourcePosts, type ResourceCategory, type ResourcePost } from "@/content/resources";
import { services, type Service } from "@/content/services";
import { footerColumns, mainNav, siteConfig } from "@/content/site";
import { howToVideos, type HowToVideo } from "@/content/videos";

/** Turns `as const` literal types into their editable, wide equivalents. */
export type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? Widen<U>[]
        : T extends object
          ? { -readonly [K in keyof T]: Widen<T[K]> }
          : T;

export type SiteConfig = Widen<typeof siteConfig>;
export type NavItem = { label: string; href: string };
export type FooterColumn = { heading: string; links: NavItem[] };
export type PricingTab = { id: PricingAudience; label: string; plans: PricingPlan[] };
export type HowItWorksStep = Widen<(typeof howItWorks)[number]>;
export type Feature = { icon: FeatureIconName; title: string; description: string };
export type FaqItem = { question: string; answer: string };
export type TeamMember = Widen<(typeof teamMembers)[number]>;
export type CompanyValue = Widen<(typeof companyValues)[number]>;
export type LegalPageContent = { slug: LegalSlug; title: string; updated: string; sections: LegalSection[] };
export type LegalSlug = "privacy" | "terms" | "disclaimer" | "refund";

export interface SiteContent {
  site: SiteConfig;
  nav: NavItem[];
  footer: FooterColumn[];
  services: Service[];
  pricing: PricingTab[];
  testimonials: Testimonial[];
  clientLogos: ClientLogo[];
  howItWorks: HowItWorksStep[];
  whyChooseUs: Feature[];
  audiences: Audience[];
  faqs: FaqItem[];
  team: TeamMember[];
  values: CompanyValue[];
  resourceCategories: ResourceCategory[];
  resources: ResourcePost[];
  videos: HowToVideo[];
  legal: Record<LegalSlug, LegalPageContent>;
}

/** CMS collection names, in the order the admin screen lists them. */
export const CMS_COLLECTIONS: Array<{ key: keyof SiteContent; label: string; description: string; singleton?: boolean }> = [
  { key: "site", label: "Site settings", description: "Brand, contact details, hours, social links, stats, announcement bar.", singleton: true },
  { key: "nav", label: "Main navigation", description: "Header menu items." },
  { key: "footer", label: "Footer columns", description: "Footer link groups." },
  { key: "services", label: "Services", description: "Service pages, pricing, inclusions, FAQs and SEO copy." },
  { key: "pricing", label: "Pricing tabs", description: "Plans per audience (individuals, businesses, startups)." },
  { key: "testimonials", label: "Testimonials", description: "Client quotes shown on the home page." },
  { key: "clientLogos", label: "Client logos", description: "Trusted-by strip." },
  { key: "howItWorks", label: "How it works", description: "Home page process steps." },
  { key: "whyChooseUs", label: "Why choose us", description: "Feature highlights." },
  { key: "audiences", label: "Audiences", description: "Who we serve cards." },
  { key: "faqs", label: "General FAQs", description: "FAQ page and audience pages." },
  { key: "team", label: "Team", description: "About page team members." },
  { key: "values", label: "Company values", description: "About page values." },
  { key: "resourceCategories", label: "Resource categories", description: "Blog categories." },
  { key: "resources", label: "Resources / blog", description: "Articles and guides." },
  { key: "videos", label: "How-to videos", description: "Walkthrough videos on Resources and Help." },
  { key: "legal", label: "Legal pages", description: "Privacy, terms, disclaimer, refund policy." },
];

/** Maps a `SiteContent` key to the backend collection name (snake_case). */
export function collectionName(key: keyof SiteContent): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export const defaultContent: SiteContent = {
  site: siteConfig as unknown as SiteConfig,
  nav: mainNav.map((item) => ({ ...item })),
  footer: footerColumns.map((column) => ({ heading: column.heading, links: column.links.map((l) => ({ ...l })) })),
  services,
  pricing: pricingTabs,
  testimonials,
  clientLogos,
  howItWorks: howItWorks as unknown as HowItWorksStep[],
  whyChooseUs,
  audiences,
  faqs: generalFaqs,
  team: teamMembers as unknown as TeamMember[],
  values: companyValues as unknown as CompanyValue[],
  resourceCategories,
  resources: resourcePosts,
  videos: howToVideos,
  legal: {
    privacy: { slug: "privacy", title: "Privacy Policy", updated: legalUpdated, sections: privacySections },
    terms: { slug: "terms", title: "Terms of Service", updated: legalUpdated, sections: termsSections },
    disclaimer: { slug: "disclaimer", title: "Disclaimer", updated: legalUpdated, sections: disclaimerSections },
    refund: { slug: "refund", title: "Refund & Cancellation Policy", updated: legalUpdated, sections: refundSections },
  },
};

/** Stable slug for an entry so the CMS import is idempotent and edits map back onto the same document. */
export function entrySlug(key: keyof SiteContent, item: unknown, index: number): string {
  const record = (item ?? {}) as Record<string, unknown>;
  const candidate = [record.slug, record.id, record.href, record.name, record.title, record.label, record.question, record.heading]
    .find((v): v is string => typeof v === "string" && v.length > 0);
  const base = candidate ? candidate : `${key}-${index + 1}`;
  const slug = base
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || `${key}-${index + 1}`;
}

/** Human-readable title for an entry, shown in the admin list. */
export function entryTitle(item: unknown): string | undefined {
  const record = (item ?? {}) as Record<string, unknown>;
  return [record.title, record.name, record.label, record.question, record.heading, record.tagline]
    .find((v): v is string => typeof v === "string" && v.length > 0)
    ?.slice(0, 200);
}

export type ImportPayload = Record<string, Array<{ slug: string; title?: string; data: unknown }>>;

/** Entries the admin "Import bundled defaults" action sends to the backend. */
export function defaultImportPayload(): ImportPayload {
  const payload: ImportPayload = {};
  for (const { key } of CMS_COLLECTIONS) {
    const value = defaultContent[key];
    const items: unknown[] = key === "legal" ? Object.values(value as SiteContent["legal"]) : Array.isArray(value) ? value : [value];
    payload[collectionName(key)] = items.map((item, index) => ({
      slug: key === "site" ? "site" : entrySlug(key, item, index),
      title: key === "site" ? "Site settings" : entryTitle(item),
      data: item,
    }));
  }
  return payload;
}

/** Merges published CMS collections over the defaults. Empty collections keep the bundled content. */
export function mergeContent(published: Record<string, unknown[]> | null | undefined): SiteContent {
  if (!published) return defaultContent;
  const merged: SiteContent = { ...defaultContent, legal: { ...defaultContent.legal } };
  for (const { key } of CMS_COLLECTIONS) {
    const rows = published[collectionName(key)];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    if (key === "site") {
      merged.site = { ...defaultContent.site, ...(rows[0] as Partial<SiteConfig>) } as SiteConfig;
    } else if (key === "legal") {
      for (const row of rows as LegalPageContent[]) {
        if (row.slug in merged.legal) merged.legal[row.slug] = { ...defaultContent.legal[row.slug], ...row };
      }
    } else {
      (merged as unknown as Record<string, unknown>)[key] = rows;
    }
  }
  return merged;
}

/* ---------- helpers that used to live on the static modules ---------- */

export function findService(content: SiteContent, slug: string): Service | undefined {
  return content.services.find((service) => service.slug === slug);
}

export function featuredServicesOf(content: SiteContent): Service[] {
  return content.services.filter((service) => service.featured);
}

export function findResourcePost(content: SiteContent, slug: string): ResourcePost | undefined {
  return content.resources.find((post) => post.slug === slug);
}

export function categoryLabel(content: SiteContent, id: string): string {
  return content.resourceCategories.find((category) => category.id === id)?.label ?? id;
}
