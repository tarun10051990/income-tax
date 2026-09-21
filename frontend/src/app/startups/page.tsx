import type { Metadata } from "next";
import AudiencePage from "@/components/marketing/AudiencePage";
import { getSiteContent } from "@/lib/cms-server";

export const metadata: Metadata = {
  title: "Startup Services: Incorporation, DPIIT, Accounting & Fundraising Compliance",
  description:
    "Incorporate, get Startup India recognition, keep investor-ready books and handle fundraise filings with a dedicated startup advisor.",
  alternates: { canonical: "/startups" },
};

export default async function StartupsPage() {
  const { faqs: generalFaqs } = await getSiteContent();
  return (
    <AudiencePage
      id="startups"
      pathname="/startups"
      eyebrow="For Startups"
      title="Founder-friendly finance, from incorporation to Series A"
      subtitle="Registration, accounting, GST, payroll, ESOPs and fundraising compliance handled by advisors who have worked with hundreds of startups."
      pains={[
        {
          title: "Choosing the right structure",
          description: "Private Limited or LLP? We map your fundraising plans to the structure investors expect and register it end to end.",
        },
        {
          title: "Investor-ready books",
          description: "Clean monthly MIS, cap-table hygiene and audit-ready records that make due diligence painless.",
        },
        {
          title: "Fundraise paperwork",
          description: "Valuation reports, PAS-3, SH-7 and shareholder agreement support so your round closes on schedule.",
        },
      ]}
      faqs={[5, 2, 4, 7, 9].map((i) => generalFaqs[i]).filter(Boolean)}
    />
  );
}
