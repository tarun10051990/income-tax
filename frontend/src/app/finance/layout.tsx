"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/investments", label: "Investments" },
  { href: "/finance/tax-payments", label: "Tax payments" },
  { href: "/finance/tracking", label: "Tax tracking" },
  { href: "/finance/savings", label: "Tax savings" },
  { href: "/finance/refunds", label: "Refunds" },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isReady, pathname, router]);

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My finances</h1>
        <p className="text-sm text-muted">
          Investments, tax paid, liabilities, savings and refunds across financial years — all computed from your records.
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Finance sections">
        {TABS.map((tab) => {
          const active = tab.href === "/finance" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                active ? "border-primary text-primary font-medium" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
