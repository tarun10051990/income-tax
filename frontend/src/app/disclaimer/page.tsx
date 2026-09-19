import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";
import { getSiteContent } from "@/lib/cms-server";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Website content is general information only; we are an independent firm with no government affiliation.",
  alternates: { canonical: "/disclaimer" },
};

export default async function DisclaimerPage() {
  const { legal } = await getSiteContent();
  const page = legal.disclaimer;
  return (
    <LegalPage
      title="Disclaimer"
      intro="Website content is general information only; we are an independent firm with no government affiliation."
      updated={page.updated}
      sections={page.sections}
      pathname="/disclaimer"
    />
  );
}
