"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import { FilingProvider } from "@/contexts/FilingContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";
import MobileStickyCta from "@/components/marketing/MobileStickyCta";

/** Route prefixes that belong to the authenticated customer / staff portals. */
const PORTAL_PREFIXES = [
  "/dashboard",
  "/filing",
  "/gst",
  "/payments",
  "/notifications",
  "/support",
  "/profile",
  "/auth",
  "/admin",
  "/consultant",
  "/consultations",
  "/calculator",
  "/advisor",
  "/help",
  "/compliance",
  "/security",
];

function isPortalRoute(pathname: string): boolean {
  return PORTAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const portal = isPortalRoute(pathname);

  return (
    <AuthProvider>
      <FilingProvider>
        {portal ? (
          <>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </>
        ) : (
          <>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <div className="pb-20 md:pb-0">
              <SiteFooter />
            </div>
            <MobileStickyCta />
          </>
        )}
      </FilingProvider>
    </AuthProvider>
  );
}
