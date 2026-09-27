export interface ResourceCategory {
  id: string;
  label: string;
}

export const resourceCategories: ResourceCategory[] = [
  { id: "tax-updates", label: "Latest Tax Updates" },
  { id: "gst-updates", label: "GST Updates" },
  { id: "income-tax-guides", label: "Income Tax Guides" },
  { id: "business-compliance", label: "Business Compliance" },
  { id: "startup-guides", label: "Startup Guides" },
  { id: "financial-planning", label: "Financial Planning" },
];

export interface ResourcePost {
  slug: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  readingTime: string;
  /** Simple paragraph-based body. Swap for a CMS or MDX when needed. */
  body: string[];
}

export const resourcePosts: ResourcePost[] = [
  {
    slug: "compliance-calendar-fy-2026-27",
    category: "tax-updates",
    date: "2026-04-01",
    title: "Compliance calendar for FY 2026-27: every due date in one place",
    excerpt:
      "Income tax, GST, TDS and ROC deadlines for the year, organised month by month so you can plan cash flow and paperwork.",
    readingTime: "6 min read",
    body: [
      "Missing a statutory deadline is expensive: late fees, interest and in some cases loss of input credit or director disqualification. This calendar consolidates the recurring due dates every Indian business and taxpayer should track.",
      "Monthly: GSTR-1 (11th), GSTR-3B (20th), TDS deposit (7th), PF and ESI (15th). Quarterly: TDS statements, advance tax instalments (15 June, 15 September, 15 December, 15 March). Annual: ITR (31 July for non-audit cases), tax audit (30 September), GSTR-9 (31 December), AOC-4 and MGT-7 (within 30 and 60 days of the AGM).",
      "Dates can shift when the government issues extensions. Our clients receive reminders through the portal seven days before every applicable deadline.",
    ],
  },
  {
    slug: "old-vs-new-tax-regime-which-should-you-pick",
    category: "income-tax-guides",
    date: "2026-03-18",
    title: "Old vs. new tax regime: a practical way to decide",
    excerpt:
      "The new regime is the default, but the old one still wins for many taxpayers with HRA and large deductions. Here is how to compare.",
    readingTime: "5 min read",
    body: [
      "The new regime offers lower slab rates but removes most deductions and exemptions. The old regime keeps deductions such as 80C, 80D, HRA and home-loan interest but taxes income at higher rates.",
      "A quick heuristic: add up the deductions and exemptions you can genuinely claim. If they exceed roughly ₹3.75–4 lakh on a ₹15 lakh salary, the old regime is usually better. Below that, the new regime typically wins.",
      "Salaried taxpayers can switch every year; those with business income can switch out of the new regime only once. Run both computations before filing rather than assuming.",
    ],
  },
  {
    slug: "gstr-2b-reconciliation-checklist",
    category: "gst-updates",
    date: "2026-02-27",
    title: "GSTR-2B reconciliation: a checklist to protect your input tax credit",
    excerpt:
      "Input credit is only as good as your vendors' filings. A monthly reconciliation routine keeps your credit safe and your 3B accurate.",
    readingTime: "4 min read",
    body: [
      "GSTR-2B is the auto-drafted statement of eligible input tax credit for a tax period. Credit not appearing in it is generally not available, regardless of what your purchase register says.",
      "Each month, match purchase invoices to GSTR-2B by GSTIN, invoice number and taxable value. Classify differences as missing in portal, missing in books, mismatch, or duplicate, and follow up with vendors before filing GSTR-3B.",
      "Keep a running list of vendors who consistently file late. Consider withholding the tax component of their payments until credit reflects.",
    ],
  },
  {
    slug: "private-limited-vs-llp-for-founders",
    category: "startup-guides",
    date: "2026-02-10",
    title: "Private Limited vs. LLP: choosing a structure for your startup",
    excerpt:
      "Investors prefer companies; consultants often prefer LLPs. Compare compliance cost, taxation and fundraising flexibility before you decide.",
    readingTime: "7 min read",
    body: [
      "A Private Limited company allows equity fundraising, ESOPs and is the structure most venture investors expect. It carries higher annual compliance: board meetings, statutory audit regardless of turnover, and detailed ROC filings.",
      "An LLP is simpler and cheaper to maintain, taxed at a flat rate with no dividend distribution complications, but cannot issue ESOPs or raise equity in the conventional sense.",
      "If you plan to raise institutional money within 18 months, incorporate a company. If you are a services partnership without external investors, an LLP is often the better fit.",
    ],
  },
  {
    slug: "roc-annual-filing-guide-for-small-companies",
    category: "business-compliance",
    date: "2026-01-22",
    title: "ROC annual filings for small companies: forms, timelines and penalties",
    excerpt:
      "AOC-4, MGT-7A, DIR-3 KYC and ADT-1 explained for directors who want to stay compliant without surprises.",
    readingTime: "5 min read",
    body: [
      "Every company must hold an AGM within six months of the financial year end and file its financial statements (AOC-4) within 30 days and annual return (MGT-7 or MGT-7A for small companies) within 60 days of the AGM.",
      "Directors must complete DIR-3 KYC annually by 30 September. Auditor appointments are reported in ADT-1.",
      "Late filing attracts ₹100 per day per form with no ceiling. Repeated non-filing for two years can lead to strike-off and director disqualification for five years.",
    ],
  },
  {
    slug: "advance-tax-for-freelancers-and-consultants",
    category: "financial-planning",
    date: "2026-01-08",
    title: "Advance tax for freelancers and consultants: how to avoid interest",
    excerpt:
      "If your tax liability exceeds ₹10,000 in a year, you must pay in instalments. Here is a simple system to stay ahead.",
    readingTime: "4 min read",
    body: [
      "Advance tax is due in four instalments: 15% by 15 June, 45% by 15 September, 75% by 15 December and 100% by 15 March. Presumptive taxpayers under section 44ADA can pay the full amount by 15 March.",
      "Estimate annual income conservatively each quarter, subtract TDS already deducted by clients, and pay the balance through Challan 280.",
      "Shortfalls attract interest under sections 234B and 234C at 1% per month. Setting aside 20–25% of every receipt in a separate account makes this painless.",
    ],
  },
  {
    slug: "budget-2026-key-changes-for-individual-taxpayers",
    category: "tax-updates",
    date: "2026-02-02",
    title: "Budget 2026: key changes individual taxpayers should know",
    excerpt:
      "A summary of the announcements that affect salaried employees, investors and senior citizens, and what to do before 31 March.",
    readingTime: "6 min read",
    body: [
      "This note summarises the headline proposals relevant to individuals. Provisions take effect from the dates specified in the Finance Act once passed, so confirm applicability with your professional before acting.",
      "Review your regime choice, revisit investment declarations with your employer, and check whether any capital gains transactions should be completed before or after the financial year end.",
      "Our clients receive a personalised impact note through the portal after every Budget.",
    ],
  },
  {
    slug: "e-invoicing-threshold-what-small-businesses-must-do",
    category: "gst-updates",
    date: "2025-12-15",
    title: "E-invoicing: what businesses crossing the threshold must do",
    excerpt:
      "Once your aggregate turnover crosses the notified limit, every B2B invoice needs an IRN. Here is the setup checklist.",
    readingTime: "4 min read",
    body: [
      "E-invoicing applies to registered persons whose aggregate turnover in any preceding financial year from 2017-18 crossed the notified threshold. Applicability is permanent once triggered.",
      "Register on the Invoice Registration Portal, integrate your billing software or use the offline utility, and ensure invoices carry the IRN and QR code before they are shared with customers.",
      "Cancellation is allowed within 24 hours; after that, issue a credit note. Build this into your billing team's process from day one.",
    ],
  },
];

export function getResourcePost(slug: string): ResourcePost | undefined {
  return resourcePosts.find((post) => post.slug === slug);
}

export function getCategoryLabel(id: string): string {
  return resourceCategories.find((category) => category.id === id)?.label ?? id;
}
