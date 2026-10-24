"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ConsultantAuthProvider, useConsultantAuth } from "@/contexts/ConsultantAuthContext";
import Button from "@/components/ui/Button";

const NAVIGATION: { href: string; label: string; section: string }[] = [
  { href: "/consultant", label: "Dashboard", section: "Practice" },
  { href: "/consultant/bookings", label: "Requests and appointments", section: "Practice" },
  { href: "/consultant/reviews", label: "Reviews", section: "Practice" },
  { href: "/consultant/profile", label: "Profile and verification", section: "Listing" },
  { href: "/consultant/services", label: "Services and fees", section: "Listing" },
  { href: "/consultant/availability", label: "Availability", section: "Listing" },
  { href: "/consultant/earnings", label: "Earnings and payouts", section: "Money" },
  { href: "/consultant/settings", label: "Bank and settings", section: "Money" },
];

const PUBLIC_ROUTES = ["/consultant/login", "/consultant/register"];

function ConsultantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isAuthenticated, isReady, signOut } = useConsultantAuth();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (isReady && !isAuthenticated && !isPublic) {
      router.replace("/consultant/login");
    }
  }, [isAuthenticated, isPublic, isReady, router]);

  if (isPublic) {
    return <>{children}</>;
  }
  if (!isAuthenticated) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-sm text-muted">Redirecting to the consultant sign in…</div>;
  }

  const sections = Array.from(new Set(NAVIGATION.map((item) => item.section)));

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface px-4 py-6">
        <div className="px-2 pb-4">
          <p className="text-xs uppercase tracking-wide text-muted">Consultant portal</p>
          <p className="text-sm font-semibold">{session?.name}</p>
          <p className="text-xs text-muted truncate">{session?.email}</p>
        </div>
        {sections.map((section) => (
          <div key={section} className="mb-4">
            <p className="px-2 text-xs uppercase tracking-wide text-muted mb-1">{section}</p>
            {NAVIGATION.filter((item) => item.section === section).map((item) => {
              const active = item.href === "/consultant" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-2 py-1.5 text-sm ${active ? "bg-primary/10 text-primary font-medium" : "text-muted hover:bg-gray-50"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
        <Button variant="ghost" size="sm" className="mt-auto" onClick={() => { signOut(); router.replace("/consultant/login"); }}>
          Sign out
        </Button>
      </aside>
      <div className="flex-1 min-w-0">
        <nav className="lg:hidden flex gap-2 overflow-x-auto border-b border-border px-4 py-2 text-sm">
          {NAVIGATION.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-full border border-border px-3 py-1">
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}

export default function ConsultantLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsultantAuthProvider>
      <ConsultantShell>{children}</ConsultantShell>
    </ConsultantAuthProvider>
  );
}
