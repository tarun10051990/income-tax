import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";
import { legalUpdated, privacySections } from "@/content/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use, protect and retain your personal and financial information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How we collect, use, protect and retain your personal and financial information."
      updated={legalUpdated}
      sections={privacySections}
      pathname="/privacy"
    />
  );
}
