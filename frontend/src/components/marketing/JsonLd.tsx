import type { FaqItem } from "./FaqAccordion";
import type { Service } from "@/content/services";
import type { ResourcePost } from "@/content/resources";
import { siteConfig } from "@/content/site";

type Schema = Record<string, unknown>;

export default function JsonLd({ data }: { data: Schema | Schema[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}

export function organizationSchema(): Schema {
  const { contact } = siteConfig;
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    description: siteConfig.description,
    telephone: contact.phone,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${contact.address.line1}, ${contact.address.line2}`,
      addressLocality: contact.address.city,
      addressRegion: contact.address.state,
      postalCode: contact.address.pincode,
      addressCountry: "IN",
    },
    areaServed: "IN",
    sameAs: siteConfig.social.map((item) => item.href),
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:30", closes: "19:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "10:00", closes: "16:00" },
    ],
  };
}

export function faqSchema(items: FaqItem[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function serviceSchema(service: Service): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.seoDescription,
    url: `${siteConfig.url}/services/${service.slug}`,
    provider: { "@type": "ProfessionalService", name: siteConfig.name, url: siteConfig.url },
    areaServed: "IN",
    ...(service.startingPrice !== null && {
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: service.startingPrice,
        priceSpecification: { "@type": "PriceSpecification", minPrice: service.startingPrice, priceCurrency: "INR" },
      },
    }),
  };
}

export function articleSchema(post: ResourcePost): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    url: `${siteConfig.url}/resources/${post.slug}`,
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; href: string }>): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.href}`,
    })),
  };
}
