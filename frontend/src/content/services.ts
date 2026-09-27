export type ServiceIconName =
  | "receipt"
  | "percent"
  | "book-open"
  | "landmark"
  | "shield-check"
  | "building"
  | "rocket"
  | "pie-chart"
  | "scale";

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface Service {
  slug: string;
  name: string;
  icon: ServiceIconName;
  /** One-line description used on cards. */
  summary: string;
  /** Hero copy for the service page. */
  headline: string;
  intro: string;
  /** Configurable starting price. `null` renders "Custom quote". */
  startingPrice: number | null;
  priceUnit?: string;
  featured?: boolean;
  audiences: Array<"individuals" | "startups" | "businesses">;
  inclusions: string[];
  documents: string[];
  process: string[];
  faqs: ServiceFaq[];
  seoTitle: string;
  seoDescription: string;
}

export const services: Service[] = [
  {
    slug: "income-tax",
    name: "Income Tax",
    icon: "receipt",
    summary: "ITR filing, tax planning, capital gains and tax advisory.",
    headline: "Income tax filing and advisory, handled by professionals",
    intro:
      "Whether you are a salaried employee with a single Form 16 or an investor with capital gains across multiple brokers, our tax professionals prepare, review and file your return accurately and on time.",
    startingPrice: 999,
    featured: true,
    audiences: ["individuals", "startups", "businesses"],
    inclusions: [
      "Selection of the correct ITR form (ITR-1 to ITR-4)",
      "Form 16 / 26AS / AIS reconciliation",
      "Old vs. new regime comparison",
      "Capital gains computation for equity, mutual funds and property",
      "Deduction optimisation under Chapter VI-A",
      "E-verification support and refund tracking",
    ],
    documents: [
      "PAN and Aadhaar",
      "Form 16 / salary slips",
      "Form 26AS and AIS",
      "Bank interest certificates",
      "Capital gains statements",
      "Investment and insurance proofs",
    ],
    process: [
      "Share your documents securely through the portal",
      "A tax professional prepares the computation and shares a summary",
      "You review and approve the return",
      "We file the return and help you e-verify",
    ],
    faqs: [
      {
        question: "Which ITR form applies to me?",
        answer:
          "ITR-1 suits most salaried individuals with income up to ₹50 lakh. Capital gains, more than one house property or business income usually require ITR-2 or ITR-3. Our professionals confirm the correct form after reviewing your details.",
      },
      {
        question: "Can you help with a belated or revised return?",
        answer:
          "Yes. We handle belated, revised and updated returns, and explain any late fee or interest implications before filing.",
      },
    ],
    seoTitle: "Income Tax Return Filing & Tax Advisory Services",
    seoDescription:
      "Professional ITR filing, capital gains computation, regime comparison and year-round tax advisory for individuals and businesses in India.",
  },
  {
    slug: "gst",
    name: "GST",
    icon: "percent",
    summary: "GST registration, return filing, reconciliation and compliance.",
    headline: "GST registration, returns and reconciliation without the stress",
    intro:
      "From getting your GSTIN to filing GSTR-1 and GSTR-3B every month, our GST specialists keep your books, e-invoices and returns reconciled so you never lose input tax credit.",
    startingPrice: 1499,
    priceUnit: "/ month",
    featured: true,
    audiences: ["startups", "businesses"],
    inclusions: [
      "New GST registration and amendments",
      "Monthly / quarterly GSTR-1 and GSTR-3B preparation",
      "GSTR-2B input tax credit reconciliation",
      "Annual return (GSTR-9) and reconciliation statement",
      "E-invoice and e-way bill guidance",
      "Notice replies and department correspondence",
    ],
    documents: [
      "PAN, Aadhaar and business registration proof",
      "Sales and purchase registers",
      "Bank statements",
      "Previous returns (if migrating)",
    ],
    process: [
      "Connect your invoices via upload or import",
      "We reconcile purchases against GSTR-2B",
      "Review the computed liability and credit",
      "Returns are prepared and filed by your deadline",
    ],
    faqs: [
      {
        question: "Do I need GST registration?",
        answer:
          "Registration is mandatory once aggregate turnover crosses the prescribed threshold (₹40 lakh for goods and ₹20 lakh for services in most states), for inter-state supply of goods, and for e-commerce sellers. Voluntary registration can also make sense to claim input credit.",
      },
      {
        question: "How often are GST returns filed?",
        answer:
          "Most regular taxpayers file GSTR-1 and GSTR-3B monthly. Small taxpayers under the QRMP scheme file quarterly with monthly tax payments. Composition dealers file CMP-08 quarterly and GSTR-4 annually.",
      },
    ],
    seoTitle: "GST Registration, Return Filing & Reconciliation Services",
    seoDescription:
      "End-to-end GST services in India: registration, monthly GSTR-1/3B filing, GSTR-2B reconciliation, annual returns and notice handling.",
  },
  {
    slug: "accounting",
    name: "Accounting",
    icon: "book-open",
    summary: "Bookkeeping, financial statements, payroll and accounting support.",
    headline: "Clean books, timely financials and a team that understands your business",
    intro:
      "Outsource your bookkeeping to a dedicated accountant who records transactions, reconciles bank accounts, runs payroll and delivers monthly financial statements you can act on.",
    startingPrice: 2999,
    priceUnit: "/ month",
    featured: true,
    audiences: ["startups", "businesses"],
    inclusions: [
      "Monthly bookkeeping and bank reconciliation",
      "Accounts payable and receivable tracking",
      "Payroll processing with PF, ESI and TDS",
      "Monthly P&L, balance sheet and cash-flow reports",
      "Year-end closing and audit support",
      "Dedicated accountant with quarterly review calls",
    ],
    documents: [
      "Bank and credit card statements",
      "Sales and purchase invoices",
      "Expense receipts",
      "Employee master and salary structure",
    ],
    process: [
      "Onboarding call to map your chart of accounts",
      "Monthly document collection and recording",
      "Reconciliation and review by a senior accountant",
      "Financial statements delivered to your inbox",
    ],
    faqs: [
      {
        question: "Which accounting software do you use?",
        answer:
          "We work with Tally, Zoho Books and QuickBooks, and can continue in whichever tool your business already uses.",
      },
    ],
    seoTitle: "Outsourced Accounting, Bookkeeping & Payroll Services",
    seoDescription:
      "Monthly bookkeeping, payroll, reconciliations and financial statements for startups and SMEs, delivered by a dedicated accountant.",
  },
  {
    slug: "tds",
    name: "TDS",
    icon: "landmark",
    summary: "TDS calculations, payments, returns and compliance.",
    headline: "Accurate TDS deduction, deposit and quarterly returns",
    intro:
      "We compute TDS on salaries, contractor payments, rent and professional fees, ensure timely deposit, and file quarterly statements so your deductees receive their Form 16/16A without follow-ups.",
    startingPrice: 1999,
    priceUnit: "/ quarter",
    audiences: ["businesses", "startups"],
    inclusions: [
      "TAN application",
      "Monthly TDS computation and challan generation",
      "Quarterly 24Q / 26Q / 27Q returns",
      "Form 16 and Form 16A generation",
      "Correction statements and default resolution",
      "Lower deduction certificate assistance",
    ],
    documents: [
      "TAN and PAN details",
      "Vendor and employee master",
      "Payment ledgers",
      "Challan copies",
    ],
    process: [
      "Share payment details monthly",
      "We compute liability and share challans",
      "Quarterly returns are prepared and filed",
      "Certificates are generated for deductees",
    ],
    faqs: [
      {
        question: "What are the TDS return due dates?",
        answer:
          "Quarterly TDS statements are generally due on 31 July, 31 October, 31 January and 31 May for the four quarters respectively. Monthly deposit is due by the 7th of the following month (30 April for March).",
      },
    ],
    seoTitle: "TDS Return Filing & Compliance Services",
    seoDescription:
      "TDS computation, challan payment, quarterly 24Q/26Q filing, Form 16/16A generation and default correction for Indian businesses.",
  },
  {
    slug: "roc-compliance",
    name: "ROC Compliance",
    icon: "shield-check",
    summary: "Annual filings, company compliance and statutory requirements.",
    headline: "Stay on the right side of the Companies Act",
    intro:
      "Directors carry personal liability for missed filings. Our company secretarial team maintains your statutory registers, prepares board and AGM documentation and files annual returns with the Registrar of Companies.",
    startingPrice: 7999,
    priceUnit: "/ year",
    audiences: ["startups", "businesses"],
    inclusions: [
      "AOC-4 and MGT-7 / MGT-7A annual filings",
      "DIR-3 KYC for directors",
      "Board and general meeting minutes",
      "Statutory registers maintenance",
      "Changes in directors, capital and registered office",
      "LLP Form 8 and Form 11 filings",
    ],
    documents: [
      "Certificate of incorporation, MOA and AOA",
      "Audited financial statements",
      "Director and shareholder details",
      "Previous year filings",
    ],
    process: [
      "Compliance calendar prepared for your entity",
      "Documents collected before each due date",
      "Forms prepared and shared for digital signature",
      "Filed with MCA and acknowledgements shared",
    ],
    faqs: [
      {
        question: "What happens if annual filings are delayed?",
        answer:
          "Additional fees of ₹100 per day per form apply without upper limit, and continued default can lead to director disqualification and strike-off. We track every due date so this does not happen.",
      },
    ],
    seoTitle: "ROC & Company Secretarial Compliance Services",
    seoDescription:
      "Annual ROC filings, director KYC, statutory registers and event-based MCA compliance for private limited companies and LLPs.",
  },
  {
    slug: "company-registration",
    name: "Business Registration",
    icon: "building",
    summary: "Private Limited, LLP, Partnership and other business registrations.",
    headline: "Register your business the right way, from day one",
    intro:
      "We help founders choose the right structure, reserve a name, draft charter documents and complete incorporation with PAN, TAN, GST and bank account — usually within 10 working days.",
    startingPrice: 6999,
    featured: true,
    audiences: ["startups", "businesses"],
    inclusions: [
      "Structure advisory: Pvt Ltd, LLP, OPC, Partnership, Proprietorship",
      "Name reservation and DSC for directors",
      "MOA / AOA or LLP agreement drafting",
      "Incorporation with PAN and TAN",
      "GST, MSME (Udyam) and Shops & Establishment registrations",
      "Post-incorporation compliance checklist",
    ],
    documents: [
      "PAN and Aadhaar of promoters",
      "Passport-size photographs",
      "Address proof of promoters",
      "Registered office proof and NOC",
    ],
    process: [
      "Consultation to finalise structure and capital",
      "Name approval and digital signatures",
      "Drafting and filing of incorporation forms",
      "Certificate issued, followed by bank and tax registrations",
    ],
    faqs: [
      {
        question: "How long does company registration take?",
        answer:
          "With documents in order, a private limited company or LLP is typically incorporated in 7–12 working days, depending on MCA processing times and name availability.",
      },
    ],
    seoTitle: "Company Registration: Private Limited, LLP & Partnership",
    seoDescription:
      "Incorporate a Private Limited company, LLP, OPC or partnership in India with name approval, DSC, drafting, PAN/TAN and GST registration.",
  },
  {
    slug: "startup-services",
    name: "Startup Services",
    icon: "rocket",
    summary: "Startup registration, compliance, taxation and business advisory.",
    headline: "A finance and compliance back office built for early-stage founders",
    intro:
      "Focus on product and customers while we manage incorporation, DPIIT recognition, ESOP structuring, investor-ready books and every filing that comes with raising money.",
    startingPrice: 4999,
    priceUnit: "/ month",
    audiences: ["startups"],
    inclusions: [
      "Startup India / DPIIT recognition",
      "Section 80-IAC tax exemption application",
      "ESOP policy and valuation coordination",
      "Founder and investor agreement support",
      "Monthly MIS and investor reporting",
      "Fundraise compliance: PAS-3, SH-7, valuation reports",
    ],
    documents: [
      "Incorporation documents",
      "Pitch deck and business plan",
      "Cap table",
      "Bank statements",
    ],
    process: [
      "Discovery call on stage and fundraising plans",
      "Compliance roadmap for the next 12 months",
      "Dedicated startup advisor assigned",
      "Monthly reporting and on-demand support",
    ],
    faqs: [
      {
        question: "Do you help with DPIIT recognition?",
        answer:
          "Yes. We prepare the application, innovation write-up and supporting documents, and follow up until recognition is granted.",
      },
    ],
    seoTitle: "Startup Compliance, Taxation & Advisory Services",
    seoDescription:
      "Startup India recognition, 80-IAC exemption, ESOPs, fundraising compliance and monthly investor reporting for early-stage companies.",
  },
  {
    slug: "tax-planning",
    name: "Tax Planning",
    icon: "pie-chart",
    summary: "Personal and business tax planning to improve tax efficiency.",
    headline: "Plan ahead, pay only what you owe",
    intro:
      "Tax planning works best before the financial year ends. We review your income, investments and business structure to identify legitimate ways to reduce your tax outgo and avoid surprises at filing time.",
    startingPrice: 2499,
    audiences: ["individuals", "businesses", "startups"],
    inclusions: [
      "Regime selection and salary structuring",
      "Investment planning under 80C, 80D, NPS and HRA",
      "Capital gains harvesting and exemption planning",
      "Advance tax computation and reminders",
      "Business entity and remuneration planning",
      "Mid-year review call",
    ],
    documents: [
      "Latest ITR and Form 16",
      "Investment portfolio summary",
      "Salary structure or business P&L",
    ],
    process: [
      "Share your current-year income estimate",
      "Advisor prepares a personalised plan",
      "Review call to walk through recommendations",
      "Quarterly check-ins on advance tax",
    ],
    faqs: [
      {
        question: "Is tax planning the same as tax evasion?",
        answer:
          "No. Tax planning uses deductions, exemptions and structures expressly provided by law. We never recommend concealment or misreporting.",
      },
    ],
    seoTitle: "Personal & Business Tax Planning Services",
    seoDescription:
      "Personalised tax planning for salaried professionals, investors and business owners: regime selection, deductions, capital gains and advance tax.",
  },
  {
    slug: "legal-advisory",
    name: "Legal & Advisory",
    icon: "scale",
    summary: "Business agreements, notices, advisory and related professional services.",
    headline: "Practical legal and financial advisory for growing businesses",
    intro:
      "From vendor agreements to income tax and GST notices, get clear, commercially minded advice from professionals who understand both the law and your numbers.",
    startingPrice: null,
    audiences: ["businesses", "startups", "individuals"],
    inclusions: [
      "Drafting and review of commercial agreements",
      "Replies to income tax and GST notices",
      "Representation before assessing officers",
      "Trademark search and registration",
      "Business valuation and due diligence support",
      "Retainer-based advisory",
    ],
    documents: ["Notice or agreement copy", "Relevant financial records"],
    process: [
      "Share the notice or requirement",
      "Advisor assesses and quotes a fixed fee",
      "Drafting or reply prepared and reviewed with you",
      "Filed or executed, with follow-up as needed",
    ],
    faqs: [
      {
        question: "I received an income tax notice. What should I do?",
        answer:
          "Do not ignore it. Share the notice with us; most notices have a response window of 15–30 days and many can be resolved with a well-documented reply.",
      },
    ],
    seoTitle: "Legal, Notice Response & Business Advisory Services",
    seoDescription:
      "Commercial agreements, tax notice replies, representation, trademark registration and retainer advisory for businesses in India.",
  },
];

export const featuredServices = services.filter((service) => service.featured);

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
