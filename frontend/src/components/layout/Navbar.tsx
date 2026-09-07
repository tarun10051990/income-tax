"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const consultantPortal = pathname === "/consultant" || pathname.startsWith("/consultant/");

  if (consultantPortal) {
    return (
      <nav className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">TaxFilr</span>
            <span className="text-sm text-muted">Consultant portal</span>
          </Link>
          <Link href="/consultants" className="text-sm text-muted hover:text-foreground">Public marketplace</Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-surface border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-primary">TaxFilr</span>
            </Link>
            <div className="hidden sm:flex items-center gap-6">
              <Link href="/calculator" className="text-sm text-muted hover:text-foreground transition-colors">
                Tax Calculator
              </Link>
              {isAuthenticated && (
                <>
                  <Link href="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/filing/upload" className="text-sm text-muted hover:text-foreground transition-colors">
                    File Return
                  </Link>
                  <Link href="/consultations" className="text-sm text-muted hover:text-foreground transition-colors">
                    Consultations
                  </Link>
                  <Link href="/gst" className="text-sm text-muted hover:text-foreground transition-colors">
                    GST
                  </Link>
                  <Link href="/payments" className="text-sm text-muted hover:text-foreground transition-colors">
                    Payments
                  </Link>
                  <Link href="/support" className="text-sm text-muted hover:text-foreground transition-colors">
                    Queries
                  </Link>
                  <Link href="/advisor" className="text-sm text-muted hover:text-foreground transition-colors">
                    AI Advisor
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/notifications" className="text-sm text-muted hover:text-foreground" aria-label="Notifications">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1h6z" />
                  </svg>
                </Link>
                <Link href="/profile" className="hidden sm:flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user?.name}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
