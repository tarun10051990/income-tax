import type { Metadata } from "next";
import { Suspense } from "react";
import ConsultantSearch from "./ConsultantSearch";

export const metadata: Metadata = {
  title: "Find a CA, Tax Consultant or Lawyer",
  description:
    "Book verified Chartered Accountants, GST consultants, tax lawyers and financial advisors for online or in-person consultations from ₹99.",
};

export default function ConsultantsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16 text-sm text-muted">Loading consultants…</div>}>
      <ConsultantSearch />
    </Suspense>
  );
}
