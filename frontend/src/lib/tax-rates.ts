import { apiRequest } from "@/lib/api";

/** Income-tax rates stored in the database (tax_regime_settings, tax_slabs, tax_category_rates). */

export type AgeGroup = "BELOW_60" | "SENIOR" | "SUPER_SENIOR";
export type Regime = "OLD" | "NEW";

export interface TaxCategory {
  id: string;
  financialYear: string;
  code: string;
  kind: "INCOME" | "DEDUCTION";
  groupCode: string;
  incomeHead: string;
  section: string | null;
  name: string;
  hint: string | null;
  treatment: "SLAB" | "SPECIAL_RATE" | "EXEMPT";
  rate: number | null;
  exemptionLimit: number | null;
  exemptionGroup: string | null;
  standardDeductionRate: number | null;
  basicExemptionAdjustable: boolean;
  rebateRegimes: string | null;
  surchargeCap: number | null;
  deductionLimit: number | null;
  seniorDeductionLimit: number | null;
  allowedRegimes: string;
  ageGroups: string | null;
  autoFromCodes: string | null;
  sortOrder: number;
  active: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface RegimeSetting {
  id: string;
  financialYear: string;
  assessmentYear: string;
  regime: Regime;
  standardDeduction: number;
  rebateIncomeLimit: number;
  rebateMaxAmount: number;
  rebateMarginalRelief: boolean;
  cessRate: number;
  maxSurchargeRate: number;
}

export interface TaxSlabRow {
  id: string;
  financialYear: string;
  regime: Regime;
  slabType: "INCOME_TAX" | "SURCHARGE";
  ageGroup: "ALL" | AgeGroup;
  incomeFrom: number;
  incomeTo: number | null;
  rate: number;
  sortOrder: number;
}

export interface RateBook {
  financialYear: string;
  assessmentYear: string;
  settings: RegimeSetting[];
  slabs: TaxSlabRow[];
  categories: TaxCategory[];
}

export interface TaxLine {
  code: string;
  name: string;
  section: string | null;
  groupCode: string | null;
  treatment: string;
  rate: number | null;
  amount: number;
  exemptAmount: number;
  taxableAmount: number;
  tax: number;
  note: string | null;
}

export interface RegimeResult {
  regime: Regime;
  grossTotalIncome: number;
  standardDeduction: number;
  hraExemption: number;
  totalDeductions: number;
  slabIncome: number;
  taxableIncome: number;
  slabTax: number;
  specialRateTax: number;
  rebate87A: number;
  surcharge: number;
  surchargeRate: number;
  cess: number;
  totalTax: number;
  taxesPaid: number;
  netPayable: number;
  refund: number;
  effectiveRate: number;
  incomeLines: TaxLine[];
  deductionLines: TaxLine[];
}

export interface ServerTaxResult {
  financialYear: string;
  assessmentYear: string;
  oldRegime: RegimeResult;
  newRegime: RegimeResult;
  recommendedRegime: Regime;
  savings: number;
}

export interface ComputeRequest {
  financialYear: string;
  ageGroup: AgeGroup;
  metroCity: boolean;
  basicSalary?: number;
  hraReceived?: number;
  rentPaid?: number;
  amounts: Record<string, number>;
  tdsOnSalary?: number;
  otherTds?: number;
  advanceTax?: number;
}

export interface SavedComputation {
  id: string;
  input: ComputeRequest;
  result: ServerTaxResult;
  updatedAt: string;
}

export const taxRatesApi = {
  years: () => apiRequest<Array<{ financialYear: string; assessmentYear: string }>>("/public/tax/years"),
  rates: (financialYear?: string) =>
    apiRequest<RateBook>(`/public/tax/rates${financialYear ? `?financialYear=${encodeURIComponent(financialYear)}` : ""}`),
  estimate: (body: ComputeRequest) => apiRequest<ServerTaxResult>("/public/tax/estimate", { method: "POST", body }),
  saveComputation: (body: ComputeRequest) => apiRequest<SavedComputation>("/itr/computations", { method: "POST", body }),
  savedComputation: (financialYear: string) =>
    apiRequest<SavedComputation | null>(`/itr/computations?financialYear=${encodeURIComponent(financialYear)}`),
};

const admin = { scope: "admin" as const };

export const adminTaxRatesApi = {
  rates: (financialYear?: string) =>
    apiRequest<RateBook>(`/admin/tax-rates${financialYear ? `?financialYear=${encodeURIComponent(financialYear)}` : ""}`, admin),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    apiRequest<TaxCategory>(`/admin/tax-rates/categories/${id}`, { ...admin, method: "PUT", body }),
  updateSetting: (id: string, body: Record<string, unknown>) =>
    apiRequest<RegimeSetting>(`/admin/tax-rates/settings/${id}`, { ...admin, method: "PUT", body }),
  updateSlab: (id: string, body: Record<string, unknown>) =>
    apiRequest<TaxSlabRow>(`/admin/tax-rates/slabs/${id}`, { ...admin, method: "PUT", body }),
  copyYear: (body: { fromFinancialYear: string; toFinancialYear: string; toAssessmentYear: string }) =>
    apiRequest<RateBook>("/admin/tax-rates/copy-year", { ...admin, method: "POST", body }),
};

/** "2025-26" -> "2026-27" */
export function assessmentYearOf(financialYear: string): string {
  const [a, b] = financialYear.split("-").map(Number);
  return `${a + 1}-${String(b + 1).padStart(2, "0")}`;
}

const pct = (rate: number) => `${+(rate * 100).toFixed(2)}%`;
const lakh = (n: number) => (n >= 100000 ? `₹${+(n / 100000).toFixed(2)} lakh` : `₹${n.toLocaleString("en-IN")}`);

/** Short, friendly badge text such as "Flat 20%" or "First ₹1.25 lakh free, then 12.5%". */
export function treatmentLabel(c: TaxCategory): string {
  if (c.kind === "DEDUCTION") {
    const limit = c.deductionLimit ? `Up to ${lakh(c.deductionLimit)}` : "No upper limit";
    return c.allowedRegimes.includes("NEW") ? `${limit} · both regimes` : `${limit} · old regime only`;
  }
  if (c.treatment === "EXEMPT") return "Tax-free";
  if (c.treatment === "SPECIAL_RATE" && c.rate !== null) {
    return c.exemptionLimit ? `First ${lakh(c.exemptionLimit)} free, then ${pct(c.rate)}` : `Flat ${pct(c.rate)}`;
  }
  if (c.standardDeductionRate) return `${pct(c.standardDeductionRate)} cut, rest at slab rate`;
  return "Your slab rate";
}

export function slabsFor(book: RateBook, regime: Regime, age: AgeGroup): TaxSlabRow[] {
  const rows = book.slabs.filter((s) => s.regime === regime && s.slabType === "INCOME_TAX");
  const forAge = rows.filter((s) => s.ageGroup === age);
  return (forAge.length ? forAge : rows.filter((s) => s.ageGroup === "ALL")).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function categoryVisibleForAge(c: TaxCategory, age: AgeGroup): boolean {
  return !c.ageGroups || c.ageGroups.split(",").map((s) => s.trim()).includes(age);
}
