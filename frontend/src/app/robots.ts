import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/cms-server";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { site: siteConfig } = await getSiteContent();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/filing", "/gst", "/payments", "/notifications", "/profile", "/api/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
