"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { FilingProvider } from "@/contexts/FilingContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FilingProvider>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </FilingProvider>
    </AuthProvider>
  );
}
