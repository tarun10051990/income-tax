import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";
import { getSiteContent } from "@/lib/cms-server";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use, protect and retain your personal and financial information.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const { legal } = await getSiteContent();
  const page = legal.privacy;
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How we collect, use, protect and retain your personal and financial information."
      updated={page.updated}
      sections={page.sections}
      pathname="/privacy"
    />
  );
}
