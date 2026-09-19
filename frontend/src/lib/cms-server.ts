import { defaultContent, mergeContent, type SiteContent } from "@/lib/site-content";

// Server-side fetch: CMS_API_URL lets containers reach the API over the internal network.
const API_BASE_URL =
  process.env.CMS_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
/** How long a published edit may take to appear on the public site. */
const REVALIDATE_SECONDS = Number(process.env.CMS_REVALIDATE_SECONDS ?? 60);

/**
 * Loads the public site content: published CMS collections layered over the bundled defaults.
 * Cached by Next's fetch cache for {@link REVALIDATE_SECONDS}; if the backend is unreachable
 * (e.g. during a static build) the defaults are used so the site never fails to render.
 */
export async function getSiteContent(): Promise<SiteContent> {
  if (process.env.CMS_DISABLED === "true") return defaultContent;
  try {
    const response = await fetch(`${API_BASE_URL}/public/cms`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["cms"] },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return defaultContent;
    const body = (await response.json()) as { data?: Record<string, unknown[]> };
    return mergeContent(body.data);
  } catch {
    return defaultContent;
  }
}
