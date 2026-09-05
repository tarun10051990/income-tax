import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";
import { legalUpdated, refundSections } from "@/content/legal";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When professional fees are refundable, what is excluded and how to request a refund.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="When professional fees are refundable, what is excluded and how to request a refund."
      updated={legalUpdated}
      sections={refundSections}
      pathname="/refund-policy"
    />
  );
}
