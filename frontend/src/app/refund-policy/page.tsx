import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";
import { getSiteContent } from "@/lib/cms-server";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When professional fees are refundable, what is excluded and how to request a refund.",
  alternates: { canonical: "/refund-policy" },
};

export default async function RefundPolicyPage() {
  const { legal } = await getSiteContent();
  const page = legal.refund;
  return (
    <LegalPage
      title="Refund Policy"
      intro="When professional fees are refundable, what is excluded and how to request a refund."
      updated={page.updated}
      sections={page.sections}
      pathname="/refund-policy"
    />
  );
}
