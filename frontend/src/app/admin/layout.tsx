"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import Button from "@/components/ui/Button";

const NAVIGATION: { href: string; label: string; section: string }[] = [
  { href: "/admin", label: "Overview", section: "Work" },
  { href: "/admin/income-tax/queue", label: "Income tax queue", section: "Work" },
  { href: "/admin/gst/queue", label: "GST queue", section: "Work" },
  { href: "/admin/documents", label: "Documents", section: "Work" },
  { href: "/admin/queries", label: "Queries", section: "Work" },
  { href: "/admin/customers", label: "Taxpayers", section: "Records" },
  { href: "/admin/payments", label: "Fees", section: "Records" },
  { href: "/admin/reports", label: "Reports", section: "Records" },
  { href: "/admin/notifications", label: "Templates", section: "Administration" },
  { href: "/admin/users", label: "Staff", section: "Administration" },
  { href: "/admin/config", label: "Rules and deadlines", section: "Administration" },
  { href: "/admin/audit-logs", label: "Audit trail", section: "Administration" },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isAuthenticated, isReady, signOut } = useAdminAuth();
  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (isReady && !isAuthenticated && !isLoginRoute) {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, isLoginRoute, isReady, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-sm text-muted">Redirecting to the staff sign in…</div>;
  }

  const sections = Array.from(new Set(NAVIGATION.map((item) => item.section)));

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface px-4 py-6">
        <div className="px-2 pb-4">
          <p className="text-xs uppercase tracking-wide text-muted">Administration</p>
          <p className="text-sm font-semibold">{session?.name}</p>
          <p className="text-xs text-muted">{session?.role.replace(/_/g, " ").toLowerCase()}</p>
        </div>
        {sections.map((section) => (
          <div key={section} className="mb-4">
            <p className="px-2 text-xs uppercase tracking-wide text-muted mb-1">{section}</p>
            {NAVIGATION.filter((item) => item.section === section).map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-2 py-1.5 text-sm ${
                    active ? "bg-primary/10 text-primary font-medium" : "text-muted hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
        <Button variant="ghost" size="sm" className="mt-auto" onClick={signOut}>Sign out</Button>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
