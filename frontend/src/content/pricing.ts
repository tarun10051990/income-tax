export type PricingAudience = "individuals" | "businesses" | "startups";

export interface PricingPlan {
  name: string;
  price: number;
  unit?: string;
  description: string;
  features: string[];
  /** e.g. "1 ITR filing" or "12 GST returns" */
  quota?: string;
  popular?: boolean;
  ctaLabel?: string;
}

export const pricingTabs: Array<{ id: PricingAudience; label: string; plans: PricingPlan[] }> = [
  {
    id: "individuals",
    label: "Individuals",
    plans: [
      {
        name: "Salaried",
        price: 999,
        description: "For employees with a single Form 16 and standard deductions.",
        quota: "1 ITR filing",
        features: [
          "ITR-1 preparation and filing",
          "Form 16 and 26AS reconciliation",
          "Old vs. new regime comparison",
          "E-verification support",
          "Email support",
        ],
      },
      {
        name: "Salaried Plus",
        price: 1999,
        description: "Multiple employers, house property or interest income.",
        quota: "1 ITR filing",
        popular: true,
        features: [
          "Everything in Salaried",
          "Multiple Form 16s",
          "House property and other income",
          "HRA and deduction optimisation",
          "Dedicated tax professional",
          "Phone and chat support",
        ],
      },
      {
        name: "Capital Gains",
        price: 3499,
        description: "Equity, mutual fund, crypto or property gains.",
        quota: "1 ITR filing",
        features: [
          "Everything in Salaried Plus",
          "ITR-2 preparation",
          "Broker statement processing",
          "Loss set-off and carry-forward",
          "Foreign asset reporting",
        ],
      },
      {
        name: "Professional / Freelancer",
        price: 4999,
        description: "Consultants, freelancers and presumptive business income.",
        quota: "1 ITR filing + advance tax",
        features: [
          "ITR-3 / ITR-4 preparation",
          "Presumptive taxation assessment",
          "Quarterly advance tax computation",
          "Books of accounts guidance",
          "Year-round advisory",
        ],
      },
    ],
  },
  {
    id: "businesses",
    label: "Businesses",
    plans: [
      {
        name: "GST Essentials",
        price: 1499,
        unit: "/ month",
        description: "Monthly GST compliance for small traders and service providers.",
        quota: "12 × GSTR-1 + 12 × GSTR-3B",
        features: [
          "GSTR-1 and GSTR-3B filing",
          "GSTR-2B reconciliation",
          "Up to 100 invoices per month",
          "Due-date reminders",
        ],
      },
      {
        name: "Compliance Suite",
        price: 4999,
        unit: "/ month",
        description: "GST, TDS and bookkeeping in one plan.",
        quota: "GST + TDS + monthly books",
        popular: true,
        features: [
          "Everything in GST Essentials",
          "Monthly bookkeeping (up to 300 transactions)",
          "Quarterly TDS returns",
          "Monthly P&L and balance sheet",
          "Dedicated accountant",
        ],
      },
      {
        name: "Growth",
        price: 9999,
        unit: "/ month",
        description: "For companies with payroll, audits and ROC obligations.",
        quota: "Full finance back office",
        features: [
          "Everything in Compliance Suite",
          "Payroll for up to 25 employees",
          "ROC annual filings",
          "Audit coordination",
          "Quarterly CFO review call",
        ],
      },
    ],
  },
  {
    id: "startups",
    label: "Startups",
    plans: [
      {
        name: "Launch",
        price: 6999,
        description: "Incorporate and get every registration you need to start.",
        quota: "Incorporation + 4 registrations",
        features: [
          "Private Limited or LLP incorporation",
          "DSC for 2 directors",
          "PAN, TAN and GST",
          "MSME (Udyam) registration",
          "Post-incorporation checklist",
        ],
      },
      {
        name: "Founder",
        price: 4999,
        unit: "/ month",
        description: "Ongoing compliance for pre-seed and seed-stage startups.",
        quota: "GST + books + ROC",
        popular: true,
        features: [
          "Monthly bookkeeping",
          "GST and TDS filings",
          "ROC annual compliance",
          "Startup India recognition",
          "Investor-ready monthly MIS",
        ],
      },
      {
        name: "Scale",
        price: 12999,
        unit: "/ month",
        description: "For funded startups with payroll, ESOPs and board reporting.",
        quota: "Everything + fundraising support",
        features: [
          "Everything in Founder",
          "Payroll and ESOP administration",
          "Fundraise filings (PAS-3, SH-7)",
          "80-IAC exemption application",
          "Dedicated startup advisor",
        ],
      },
    ],
  },
];
