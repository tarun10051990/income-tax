"use client";

import { createContext, useContext, type ReactNode } from "react";
import { defaultContent, type SiteContent } from "@/lib/site-content";

const SiteContentContext = createContext<SiteContent>(defaultContent);

export function SiteContentProvider({ content, children }: { content: SiteContent; children: ReactNode }) {
  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

/** Public-site content (CMS-managed with bundled fallbacks) for client components. */
export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}
