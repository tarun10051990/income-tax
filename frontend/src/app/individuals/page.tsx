import type { Metadata } from "next";
import AudiencePage from "@/components/marketing/AudiencePage";
import { generalFaqs } from "@/content/marketing";

export const metadata: Metadata = {
  title: "Tax Services for Individuals: ITR Filing, Capital Gains & Planning",
  description:
    "Personal income tax services for salaried employees, investors, freelancers and NRIs: ITR filing, capital gains, tax planning, notices and refunds.",
  alternates: { canonical: "/individuals" },
};

export default function IndividualsPage() {
  return (
    <AudiencePage
      id="individuals"
      pathname="/individuals"
      eyebrow="For Individuals"
      title="Personal tax, handled by a professional who knows your file"
      subtitle="ITR filing, capital gains, tax planning and notice responses for salaried employees, investors, freelancers and NRIs."
      pains={[
        {
          title: "Multiple income sources",
          description: "Two employers, rental income, dividends and interest — we consolidate everything into the correct ITR form.",
        },
        {
          title: "Capital gains headaches",
          description: "Equity, mutual funds, ESOPs, crypto or property: we compute gains, set off losses and claim every exemption you qualify for.",
        },
        {
          title: "Notices and refunds",
          description: "Received a notice or waiting on a refund? We respond on your behalf and follow up with the department.",
        },
      ]}
      faqs={[generalFaqs[0], generalFaqs[1], generalFaqs[6], generalFaqs[7], generalFaqs[8]]}
    />
  );
}
