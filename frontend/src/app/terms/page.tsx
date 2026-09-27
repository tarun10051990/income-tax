import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";
import { getSiteContent } from "@/lib/cms-server";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern our professional services, fees, responsibilities and liability.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const { legal } = await getSiteContent();
  const page = legal.terms;
  return (
    <LegalPage
      title="Terms & Conditions"
      intro="The terms that govern our professional services, fees, responsibilities and liability."
      updated={page.updated}
      sections={page.sections}
      pathname="/terms"
    />
  );
}
