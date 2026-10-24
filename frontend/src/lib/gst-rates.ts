import { apiRequest } from "@/lib/api";

/** GST rates and rules stored in the database (gst_rate_categories, gst_rules). */

export type GstTreatment = "TAXABLE" | "NIL" | "EXEMPT" | "ZERO_RATED";
export type GstRuleKind = "SCHEME" | "OPTION" | "THRESHOLD" | "LEVY" | "INVESTMENT";
export type GstItc = "FULL" | "BLOCKED" | "CONDITIONAL" | "NOT_APPLICABLE";

export interface GstRateCategory {
  id: string;
  code: string;
  businessType: string;
  kind: "GOODS" | "SERVICE";
  hsnSac: string | null;
  name: string;
  hint: string | null;
  treatment: GstTreatment;
  rate: number;
  cessRate: number | null;
  reverseCharge: boolean;
  itcAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  sortOrder: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface GstRule {
  id: string;
  code: string;
  kind: GstRuleKind;
  section: string | null;
  name: string;
  hint: string | null;
  rate: number | null;
  amount: number | null;
  specialStateAmount: number | null;
  maxAmount: number | null;
  itc: GstItc | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  sortOrder: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface GstRateBook {
  asOf: string | null;
  categories: GstRateCategory[];
  rules: GstRule[];
}

export interface GstCalculation {
  categoryCode: string;
  categoryName: string;
  hsnSac: string | null;
  treatment: GstTreatment;
  invoiceDate: string;
  interState: boolean;
  rate: number;
  cessRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  invoiceTotal: number;
  reverseCharge: boolean;
  itcAllowed: boolean;
}

export const BUSINESS_TYPES: Record<string, { label: string; emoji: string }> = {
  TRADER: { label: "Shop / trader", emoji: "🛒" },
  MANUFACTURER: { label: "Manufacturer & vehicles", emoji: "🏭" },
  RESTAURANT: { label: "Restaurant & food", emoji: "🍛" },
  HOTEL: { label: "Hotel", emoji: "🏨" },
  IT_SERVICES: { label: "IT & professional", emoji: "💻" },
  CONSTRUCTION: { label: "Construction & property", emoji: "🏗️" },
  TRANSPORT: { label: "Transport", emoji: "🚚" },
  JEWELLERY: { label: "Jewellery", emoji: "💍" },
  HEALTH: { label: "Health & wellness", emoji: "🩺" },
  EDUCATION: { label: "Education", emoji: "🎓" },
  EXPORT: { label: "Export", emoji: "🌍" },
  FINANCE: { label: "Bank & finance", emoji: "🏦" },
  GAMING: { label: "Gaming & lottery", emoji: "🎲" },
};

export const RULE_KINDS: Record<GstRuleKind, { label: string; blurb: string }> = {
  SCHEME: { label: "Ways to pay GST", blurb: "Pick regular GST or the simple composition scheme." },
  OPTION: { label: "Options you can choose", blurb: "Quarterly returns, exports without tax and more." },
  THRESHOLD: { label: "Limits to know", blurb: "When you must register, e-invoice or make an e-way bill." },
  LEVY: { label: "Taxes, interest and fees", blurb: "CGST, SGST, IGST, cess, TDS, TCS, interest and late fees." },
  INVESTMENT: { label: "Buying for your business", blurb: "GST on things you buy or invest in, and whether you get it back (ITC)." },
};

export const ITC_LABELS: Record<GstItc, string> = {
  FULL: "GST paid comes back (ITC)",
  BLOCKED: "No ITC",
  CONDITIONAL: "ITC only in some cases",
  NOT_APPLICABLE: "ITC not relevant",
};

export function percent(fraction: number | null | undefined): string {
  if (fraction === null || fraction === undefined) return "–";
  return `${Number((fraction * 100).toFixed(2))}%`;
}

export function rateLabel(c: Pick<GstRateCategory, "treatment" | "rate" | "cessRate">): string {
  if (c.treatment === "NIL") return "No GST";
  if (c.treatment === "EXEMPT") return "Exempt";
  if (c.treatment === "ZERO_RATED") return "0% (export)";
  return c.cessRate ? `${percent(c.rate)} + ${percent(c.cessRate)} cess` : percent(c.rate);
}

const admin = { scope: "admin" as const };

export const gstRatesApi = {
  rates: (date?: string) =>
    apiRequest<GstRateBook>(`/public/gst/rates${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  calculate: (body: { categoryCode: string; taxableValue: number; invoiceDate?: string; interState?: boolean }) =>
    apiRequest<GstCalculation>("/public/gst/calculate", { method: "POST", body }),
};

export const adminGstRatesApi = {
  rates: () => apiRequest<GstRateBook>("/admin/gst-rates", admin),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    apiRequest<GstRateCategory>(`/admin/gst-rates/categories/${id}`, { ...admin, method: "PUT", body }),
  updateRule: (id: string, body: Record<string, unknown>) =>
    apiRequest<GstRule>(`/admin/gst-rates/rules/${id}`, { ...admin, method: "PUT", body }),
};

/** A hint that starts with a rate (e.g. "18% ...") is out of date once an admin changes the rate. */
export function hintRateIsStale(hint: string | null | undefined, rate: number): boolean {
  const match = hint?.match(/^\s*(\d+(?:\.\d+)?)%/);
  return !!match && Math.abs(Number(match[1]) - rate * 100) > 0.0001;
}

/** Keeps digits and the first decimal point only, so "1.2.3" becomes "1.23". */
export function cleanAmount(value: string): string {
  const [whole, ...rest] = value.replace(/[^0-9.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("")}` : whole;
}
