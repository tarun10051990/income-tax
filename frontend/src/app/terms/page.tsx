import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";
import { legalUpdated, termsSections } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern our professional services, fees, responsibilities and liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro="The terms that govern our professional services, fees, responsibilities and liability."
      updated={legalUpdated}
      sections={termsSections}
      pathname="/terms"
    />
  );
}
