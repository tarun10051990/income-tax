import type { Metadata } from "next";
import AudiencePage from "@/components/marketing/AudiencePage";
import { getSiteContent } from "@/lib/cms-server";

export const metadata: Metadata = {
  title: "Business Services: GST, Accounting, TDS, Payroll & ROC Compliance",
  description:
    "Outsourced finance and compliance for SMEs and growing companies: monthly GST and TDS, bookkeeping, payroll, ROC filings and audit support.",
  alternates: { canonical: "/businesses" },
};

export default async function BusinessesPage() {
  const { faqs: generalFaqs } = await getSiteContent();
  return (
    <AudiencePage
      id="businesses"
      pathname="/businesses"
      eyebrow="For Businesses"
      title="A complete finance and compliance back office for growing businesses"
      subtitle="Accounting, GST, TDS, payroll, ROC and ongoing compliance — delivered by a dedicated team so your leadership can focus on growth."
      pains={[
        {
          title: "Missed deadlines and late fees",
          description: "A compliance calendar for your entity, reminders before every due date and a team that files on time, every time.",
        },
        {
          title: "Lost input tax credit",
          description: "Monthly GSTR-2B reconciliation and vendor follow-ups so credit you have paid for never lapses.",
        },
        {
          title: "Books that don’t support decisions",
          description: "Monthly P&L, balance sheet and cash-flow reports you can actually use, plus quarterly review calls.",
        },
      ]}
      faqs={[3, 4, 2, 8, 9].map((i) => generalFaqs[i]).filter(Boolean)}
    />
  );
}
