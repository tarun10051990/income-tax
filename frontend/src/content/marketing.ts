import type { ServiceIconName } from "./services";

export interface Testimonial {
  name: string;
  role: string;
  rating: number;
  quote: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "Ananya Krishnan",
    role: "Software Engineer, Bengaluru",
    rating: 5,
    quote:
      "I had RSUs from a US employer and no idea how to report them. My tax professional explained everything clearly and the return was filed in two days.",
    initials: "AK",
  },
  {
    name: "Rohit Malhotra",
    role: "Founder, D2C skincare brand",
    rating: 5,
    quote:
      "We moved our GST and books to them after a messy year with a freelancer. Reconciliation is on time every month and we finally trust our input credit numbers.",
    initials: "RM",
  },
  {
    name: "Priya & Sameer Deshpande",
    role: "Co-founders, EdTech startup",
    rating: 5,
    quote:
      "Incorporation, DPIIT recognition and our first fundraise filings — all handled with a single point of contact. Investors commented on how clean our data room was.",
    initials: "PD",
  },
  {
    name: "Mohammed Farhan",
    role: "Proprietor, hardware trading",
    rating: 4,
    quote:
      "Transparent pricing and no surprise charges. The monthly compliance calendar they share has saved me at least two late fees already.",
    initials: "MF",
  },
  {
    name: "Neha Agarwal",
    role: "Independent consultant",
    rating: 5,
    quote:
      "Presumptive taxation and advance tax used to confuse me. Now I get a reminder, pay the challan and move on with my work.",
    initials: "NA",
  },
];

export interface ClientLogo {
  name: string;
  /** Short mark shown in the placeholder logo tile. Replace with an image path when real logos are available. */
  mark: string;
  image?: string;
}

export const clientLogos: ClientLogo[] = [
  { name: "Northwind Retail", mark: "NW" },
  { name: "Brightpath Labs", mark: "BP" },
  { name: "Kaveri Textiles", mark: "KT" },
  { name: "Orbit Logistics", mark: "OL" },
  { name: "Meridian Health", mark: "MH" },
  { name: "Saffron Kitchens", mark: "SK" },
  { name: "Lumen Studios", mark: "LS" },
  { name: "Greenfield Agro", mark: "GA" },
  { name: "Pixelcraft Digital", mark: "PC" },
  { name: "Vistara Interiors", mark: "VI" },
];

export const howItWorks = [
  {
    step: "01",
    title: "Tell Us What You Need",
    description: "Submit your requirement through the website.",
  },
  {
    step: "02",
    title: "Speak With an Expert",
    description: "Connect with the right tax or business professional.",
  },
  {
    step: "03",
    title: "We Handle the Work",
    description: "Our team manages the filing, documentation or compliance process.",
  },
  {
    step: "04",
    title: "Stay Compliant",
    description: "Receive updates, documents and reminders when required.",
  },
];

export type FeatureIconName =
  | "users"
  | "badge-indian-rupee"
  | "timer"
  | "lock"
  | "heart-handshake"
  | "life-buoy";

export const whyChooseUs: Array<{ icon: FeatureIconName; title: string; description: string }> = [
  {
    icon: "users",
    title: "Experienced Professionals",
    description: "Chartered accountants, company secretaries and tax specialists with 15+ years of practice.",
  },
  {
    icon: "badge-indian-rupee",
    title: "Transparent Pricing",
    description: "Fixed fees agreed upfront. Government charges are always shown separately.",
  },
  {
    icon: "timer",
    title: "Fast Turnaround",
    description: "Most returns are prepared within 48 hours of receiving complete documents.",
  },
  {
    icon: "lock",
    title: "Secure Documents",
    description: "Encrypted storage, version history and access limited to the professional on your case.",
  },
  {
    icon: "heart-handshake",
    title: "Personalized Assistance",
    description: "A named professional who knows your history — not a call-centre queue.",
  },
  {
    icon: "life-buoy",
    title: "End-to-End Support",
    description: "From the first consultation to notices years later, we stay with you.",
  },
];

export interface Audience {
  id: "individuals" | "startups" | "businesses";
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  icon: ServiceIconName;
  accent: string;
  highlights: string[];
}

export const audiences: Audience[] = [
  {
    id: "individuals",
    title: "Individuals",
    description: "ITR filing, tax planning, capital gains and personal tax assistance.",
    ctaLabel: "Explore Individual Services",
    href: "/individuals",
    icon: "receipt",
    accent: "from-sky-500/15 to-transparent",
    highlights: ["Salaried & multiple Form 16s", "Capital gains & crypto", "NRIs & foreign income", "Notices & refunds"],
  },
  {
    id: "startups",
    title: "Startups",
    description: "Registration, accounting, GST, payroll and compliance.",
    ctaLabel: "Explore Startup Services",
    href: "/startups",
    icon: "rocket",
    accent: "from-emerald-500/15 to-transparent",
    highlights: ["Incorporation & DPIIT", "Investor-ready books", "ESOPs & fundraising", "Monthly MIS"],
  },
  {
    id: "businesses",
    title: "Businesses",
    description: "Accounting, taxation, GST, ROC and ongoing compliance.",
    ctaLabel: "Explore Business Services",
    href: "/businesses",
    icon: "building",
    accent: "from-indigo-500/15 to-transparent",
    highlights: ["GST & TDS every month", "Payroll & bookkeeping", "ROC annual filings", "Audit coordination"],
  },
];

export const generalFaqs = [
  {
    question: "Which ITR should I file?",
    answer:
      "It depends on your sources of income. ITR-1 covers salary, one house property and other income up to ₹50 lakh; ITR-2 adds capital gains and multiple properties; ITR-3 and ITR-4 apply to business or professional income. We confirm the right form after a short review.",
  },
  {
    question: "What documents are required for ITR filing?",
    answer:
      "Typically PAN, Aadhaar, Form 16, Form 26AS/AIS, bank interest certificates, capital gains statements and proof of investments. Your professional shares a precise checklist based on your profile.",
  },
  {
    question: "How does GST registration work?",
    answer:
      "We collect your PAN, business proof and address documents, file the application on the GST portal, respond to any clarification and share your GSTIN — usually within 7 working days.",
  },
  {
    question: "How often should GST returns be filed?",
    answer:
      "Regular taxpayers file GSTR-1 and GSTR-3B monthly; QRMP taxpayers file quarterly with monthly payments; composition dealers file quarterly CMP-08 and annual GSTR-4. An annual GSTR-9 applies above the turnover threshold.",
  },
  {
    question: "Can you handle accounting for my business?",
    answer:
      "Yes. We offer monthly bookkeeping, payroll, reconciliations and financial statements with a dedicated accountant, in Tally, Zoho Books or QuickBooks.",
  },
  {
    question: "How long does company registration take?",
    answer:
      "A Private Limited company or LLP is typically incorporated within 7–12 working days once documents are ready, subject to MCA processing and name availability.",
  },
  {
    question: "Do you provide tax planning?",
    answer:
      "Yes. Tax planning engagements cover regime selection, salary structuring, investments, capital gains planning and advance tax, with a mid-year review.",
  },
  {
    question: "Can I speak directly with an expert?",
    answer:
      "Absolutely. Every engagement is handled by a named professional you can reach by phone, WhatsApp or through the client portal.",
  },
  {
    question: "How are my documents protected?",
    answer:
      "Documents are stored encrypted, versioned and accessible only to the professional assigned to your case. We never share data with third parties without your consent.",
  },
  {
    question: "What happens after I submit my request?",
    answer:
      "You receive a confirmation immediately. Within one working day an expert calls to understand your requirement and shares a fixed-fee proposal and document checklist.",
  },
];

export const teamMembers = [
  { name: "Arjun Nair", role: "Founder & Managing Partner, CA", initials: "AN" },
  { name: "Kavitha Raman", role: "Partner – GST & Indirect Tax", initials: "KR" },
  { name: "Siddharth Bose", role: "Company Secretary – ROC & Legal", initials: "SB" },
  { name: "Meera Iyer", role: "Head of Accounting & Payroll", initials: "MI" },
];

export const companyValues = [
  { title: "Clarity over jargon", description: "We explain every number and every deadline in plain language." },
  { title: "Accuracy first", description: "Two-level review on every filing before it leaves our desk." },
  { title: "Long-term partnership", description: "We measure success by how many years clients stay with us." },
];
