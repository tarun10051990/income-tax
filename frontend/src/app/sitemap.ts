import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/cms-server";

const staticRoutes = [
  "",
  "/services",
  "/individuals",
  "/businesses",
  "/startups",
  "/pricing",
  "/resources",
  "/resources/videos",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/refund-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { site: siteConfig, services, resources: resourcePosts } = await getSiteContent();
  const now = new Date();
  return [
    ...staticRoutes.map((route) => ({
      url: `${siteConfig.url}${route}`,
      lastModified: now,
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.7,
    })),
    ...services.map((service) => ({
      url: `${siteConfig.url}/services/${service.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...resourcePosts.map((post) => ({
      url: `${siteConfig.url}/resources/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
