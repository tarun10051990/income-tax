import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";
import { legalUpdated, disclaimerSections } from "@/content/legal";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Website content is general information only; we are an independent firm with no government affiliation.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      intro="Website content is general information only; we are an independent firm with no government affiliation."
      updated={legalUpdated}
      sections={disclaimerSections}
      pathname="/disclaimer"
    />
  );
}
