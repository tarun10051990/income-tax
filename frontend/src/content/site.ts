/**
 * Central site configuration. Everything a non-developer is likely to change
 * (company details, contact channels, social links, headline statistics) lives here.
 */
export const siteConfig = {
  name: "TaxFilr",
  legalName: "TaxFilr Advisory Private Limited",
  tagline: "Simplifying Taxes. Strengthening Businesses.",
  description:
    "Expert income tax, GST, accounting and compliance solutions for individuals, startups and growing businesses — all under one roof.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.taxfilr.in",
  announcement: {
    text: "Your Trusted Partner for Tax, Compliance & Business Solutions",
    ctaLabel: "Book a Free Consultation",
    ctaHref: "/contact#book",
  },
  contact: {
    phone: "+91 98765 43210",
    phoneHref: "tel:+919876543210",
    whatsapp: "+91 98765 43210",
    whatsappHref: "https://wa.me/919876543210?text=Hi%2C%20I%27d%20like%20to%20talk%20to%20a%20tax%20expert.",
    email: "hello@taxfilr.in",
    supportEmail: "support@taxfilr.in",
    address: {
      line1: "4th Floor, Lakeview Business Park",
      line2: "Outer Ring Road, Bellandur",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560103",
      country: "India",
    },
    hours: [
      { days: "Monday – Friday", time: "9:30 AM – 7:00 PM" },
      { days: "Saturday", time: "10:00 AM – 4:00 PM" },
      { days: "Sunday", time: "Closed" },
    ],
    mapEmbedUrl:
      "https://www.google.com/maps?q=Bellandur%2C%20Bengaluru%2C%20Karnataka&output=embed",
  },
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/", icon: "linkedin" },
    { label: "Instagram", href: "https://www.instagram.com/", icon: "instagram" },
    { label: "Facebook", href: "https://www.facebook.com/", icon: "facebook" },
    { label: "YouTube", href: "https://www.youtube.com/", icon: "youtube" },
  ],
  stats: [
    { value: 10000, suffix: "+", label: "Clients Served" },
    { value: 25000, suffix: "+", label: "Returns & Filings" },
    { value: 99, suffix: "%", label: "On-Time Compliance" },
    { value: 15, suffix: "+ Years", label: "Professional Experience" },
  ],
  trustIndicators: [
    "Expert Professionals",
    "Transparent Pricing",
    "Secure Documentation",
    "End-to-End Support",
  ],
  portal: {
    getStartedHref: "/auth/register",
    loginHref: "/auth/login",
  },
} as const;

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "For Individuals", href: "/individuals" },
  { label: "For Businesses", href: "/businesses" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerColumns = [
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Our Team", href: "/about#team" },
      { label: "Careers", href: "/about#careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Services",
    links: [
      { label: "Income Tax", href: "/services/income-tax" },
      { label: "GST", href: "/services/gst" },
      { label: "Accounting", href: "/services/accounting" },
      { label: "TDS", href: "/services/tds" },
      { label: "ROC Compliance", href: "/services/roc-compliance" },
      { label: "Company Registration", href: "/services/company-registration" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "How-to Videos", href: "/resources/videos" },
      { label: "Tax Guides", href: "/resources?category=income-tax-guides" },
      { label: "FAQs", href: "/faq" },
      { label: "Tax Calendar", href: "/resources/compliance-calendar-fy-2026-27" },
      { label: "Blogs", href: "/resources" },
      { label: "News & Updates", href: "/resources?category=tax-updates" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Disclaimer", href: "/disclaimer" },
      { label: "Refund Policy", href: "/refund-policy" },
    ],
  },
] as const;
