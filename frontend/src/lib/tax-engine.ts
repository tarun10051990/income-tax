// Indian Income Tax Computation Engine — AY 2025-26 (FY 2024-25)

export interface SalaryDetails {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  leaveEncashment: number;
  otherAllowances: number;
}

export interface Deductions {
  pfContribution: number;
  professionalTax: number;
  standardDeduction: number;
  section80C: number;       // PPF, ELSS, LIC, etc. (max 1,50,000)
  section80CCD1B: number;   // NPS additional (max 50,000)
  section80D: number;       // Health insurance
  section80TTA: number;     // Savings interest (max 10,000)
  section24: number;        // Home loan interest (max 2,00,000)
  hraExemption: number;
  otherDeductions: number;
}

export interface AdditionalIncome {
  savingsInterest: number;
  fdInterest: number;
  rdInterest: number;
  capitalGainsSTCG: number;
  capitalGainsLTCG: number;
  rentalIncome: number;
  otherIncome: number;
}

export interface TaxInput {
  financialYear: string;
  salary: SalaryDetails;
  deductions: Deductions;
  additionalIncome: AdditionalIncome;
  tdsDeducted: number;
  metroCity: boolean;       // for HRA calculation
  rentPaid: number;         // annual rent for HRA
}

export interface TaxResult {
  grossSalary: number;
  totalIncome: number;
  taxableIncomeOld: number;
  taxableIncomeNew: number;
  taxOldRegime: number;
  taxNewRegime: number;
  cessOld: number;
  cessNew: number;
  totalTaxOld: number;
  totalTaxNew: number;
  refundOld: number;
  refundNew: number;
  recommendedRegime: "old" | "new";
  deductionsOld: number;
  deductionsNew: number;
  savings: number;
}

// Old Tax Regime Slabs FY 2024-25
function calculateOldRegimeTax(taxableIncome: number): number {
  if (taxableIncome <= 250000) return 0;
  let tax = 0;
  if (taxableIncome > 250000) tax += Math.min(taxableIncome - 250000, 250000) * 0.05;
  if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.20;
  if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30;
  // Rebate u/s 87A — if taxable income <= 5,00,000
  if (taxableIncome <= 500000) tax = 0;
  return tax;
}

// New Tax Regime Slabs FY 2024-25
function calculateNewRegimeTax(taxableIncome: number): number {
  if (taxableIncome <= 300000) return 0;
  let tax = 0;
  if (taxableIncome > 300000) tax += Math.min(taxableIncome - 300000, 400000) * 0.05;
  if (taxableIncome > 700000) tax += Math.min(taxableIncome - 700000, 300000) * 0.10;
  if (taxableIncome > 1000000) tax += Math.min(taxableIncome - 1000000, 200000) * 0.15;
  if (taxableIncome > 1200000) tax += Math.min(taxableIncome - 1200000, 300000) * 0.20;
  if (taxableIncome > 1500000) tax += (taxableIncome - 1500000) * 0.30;
  // Rebate u/s 87A — if taxable income <= 7,00,000
  if (taxableIncome <= 700000) tax = 0;
  return tax;
}

export function calculateHRAExemption(
  basicSalary: number,
  hra: number,
  rentPaid: number,
  metroCity: boolean
): number {
  const hraPercent = metroCity ? 0.50 : 0.40;
  const exemption1 = hra;
  const exemption2 = rentPaid - 0.10 * basicSalary;
  const exemption3 = hraPercent * basicSalary;
  return Math.max(0, Math.min(exemption1, exemption2, exemption3));
}

export function computeTax(input: TaxInput): TaxResult {
  const salary = input.salary;
  const deductions = input.deductions;
  const additional = input.additionalIncome;

  // Gross salary
  const grossSalary =
    salary.basicSalary +
    salary.hra +
    salary.specialAllowance +
    salary.bonus +
    salary.leaveEncashment +
    salary.otherAllowances;

  // Total additional income
  const totalAdditional =
    additional.savingsInterest +
    additional.fdInterest +
    additional.rdInterest +
    additional.capitalGainsSTCG +
    additional.capitalGainsLTCG +
    additional.rentalIncome +
    additional.otherIncome;

  const totalIncome = grossSalary + totalAdditional;

  // HRA exemption (only for old regime)
  const hraExemption = calculateHRAExemption(
    salary.basicSalary,
    salary.hra,
    input.rentPaid,
    input.metroCity
  );

  // OLD REGIME DEDUCTIONS
  const oldStandardDeduction = Math.min(deductions.standardDeduction || 50000, 50000);
  const old80C = Math.min(deductions.section80C + deductions.pfContribution, 150000);
  const old80CCD1B = Math.min(deductions.section80CCD1B, 50000);
  const old80D = Math.min(deductions.section80D, 100000);
  const old80TTA = Math.min(deductions.section80TTA, 10000);
  const old24 = Math.min(deductions.section24, 200000);
  const oldProfTax = deductions.professionalTax;

  const totalDeductionsOld =
    oldStandardDeduction +
    old80C +
    old80CCD1B +
    old80D +
    old80TTA +
    old24 +
    hraExemption +
    oldProfTax +
    deductions.otherDeductions;

  // NEW REGIME DEDUCTIONS (only standard deduction of 75,000 for FY 2024-25)
  const newStandardDeduction = 75000;
  const totalDeductionsNew = newStandardDeduction;

  // Taxable income
  const taxableIncomeOld = Math.max(0, totalIncome - totalDeductionsOld);
  const taxableIncomeNew = Math.max(0, totalIncome - totalDeductionsNew);

  // Tax calculations
  const taxOldRegime = calculateOldRegimeTax(taxableIncomeOld);
  const taxNewRegime = calculateNewRegimeTax(taxableIncomeNew);

  // Cess (4%)
  const cessOld = Math.round(taxOldRegime * 0.04);
  const cessNew = Math.round(taxNewRegime * 0.04);

  const totalTaxOld = taxOldRegime + cessOld;
  const totalTaxNew = taxNewRegime + cessNew;

  // Refund
  const refundOld = input.tdsDeducted - totalTaxOld;
  const refundNew = input.tdsDeducted - totalTaxNew;

  const recommendedRegime = totalTaxOld <= totalTaxNew ? "old" : "new";
  const savings = Math.abs(totalTaxOld - totalTaxNew);

  return {
    grossSalary,
    totalIncome,
    taxableIncomeOld,
    taxableIncomeNew,
    taxOldRegime,
    taxNewRegime,
    cessOld,
    cessNew,
    totalTaxOld,
    totalTaxNew,
    refundOld,
    refundNew,
    recommendedRegime,
    deductionsOld: totalDeductionsOld,
    deductionsNew: totalDeductionsNew,
    savings,
  };
}

// Tax-saving suggestions engine
export interface TaxSuggestion {
  title: string;
  section: string;
  description: string;
  maxBenefit: number;
  currentUsed: number;
  remainingLimit: number;
  potentialSaving: number;
  riskLevel: "low" | "medium" | "high";
  lockInPeriod: string;
  investmentOptions: string[];
}

export function generateTaxSuggestions(input: TaxInput): TaxSuggestion[] {
  const suggestions: TaxSuggestion[] = [];
  const deductions = input.deductions;
  const taxRate = 0.30; // Assume highest slab for savings estimate

  // Section 80C
  const used80C = deductions.section80C + deductions.pfContribution;
  if (used80C < 150000) {
    const remaining = 150000 - used80C;
    suggestions.push({
      title: "Invest in tax-saving instruments under Section 80C",
      section: "80C",
      description: `You have ₹${remaining.toLocaleString("en-IN")} unused limit. Invest in ELSS, PPF, NSC, Tax-Saver FD, or SCSS.`,
      maxBenefit: 150000,
      currentUsed: used80C,
      remainingLimit: remaining,
      potentialSaving: Math.round(remaining * taxRate),
      riskLevel: "low",
      lockInPeriod: "3-15 years",
      investmentOptions: ["ELSS Mutual Funds (3yr)", "PPF (15yr)", "Tax Saver FD (5yr)", "NSC (5yr)", "SCSS (5yr)", "Sukanya Samriddhi (21yr)"],
    });
  }

  // Section 80CCD(1B) — NPS
  if (deductions.section80CCD1B < 50000) {
    const remaining = 50000 - deductions.section80CCD1B;
    suggestions.push({
      title: "Invest in NPS under Section 80CCD(1B)",
      section: "80CCD(1B)",
      description: `Additional ₹${remaining.toLocaleString("en-IN")} deduction available over and above 80C limit by investing in National Pension System.`,
      maxBenefit: 50000,
      currentUsed: deductions.section80CCD1B,
      remainingLimit: remaining,
      potentialSaving: Math.round(remaining * taxRate),
      riskLevel: "medium",
      lockInPeriod: "Till retirement (60 years)",
      investmentOptions: ["NPS Tier-1 Account"],
    });
  }

  // Section 80D — Health Insurance
  if (deductions.section80D < 25000) {
    const remaining = 25000 - deductions.section80D;
    suggestions.push({
      title: "Purchase health insurance under Section 80D",
      section: "80D",
      description: `Claim up to ₹${remaining.toLocaleString("en-IN")} for self & family health insurance premium. Additional ₹50,000 for parents (senior citizens).`,
      maxBenefit: 100000,
      currentUsed: deductions.section80D,
      remainingLimit: remaining,
      potentialSaving: Math.round(remaining * taxRate),
      riskLevel: "low",
      lockInPeriod: "Annual",
      investmentOptions: ["Health Insurance Premium", "Preventive Health Check-up (₹5,000)"],
    });
  }

  // Section 24 — Home Loan Interest
  if (deductions.section24 < 200000 && deductions.section24 > 0) {
    const remaining = 200000 - deductions.section24;
    suggestions.push({
      title: "Claim full home loan interest under Section 24",
      section: "24(b)",
      description: `You can claim up to ₹${remaining.toLocaleString("en-IN")} more in home loan interest deduction.`,
      maxBenefit: 200000,
      currentUsed: deductions.section24,
      remainingLimit: remaining,
      potentialSaving: Math.round(remaining * taxRate),
      riskLevel: "low",
      lockInPeriod: "Loan tenure",
      investmentOptions: ["Home Loan EMI Interest Component"],
    });
  }

  // Section 80TTA — Savings Interest
  if (deductions.section80TTA < 10000) {
    const remaining = 10000 - deductions.section80TTA;
    suggestions.push({
      title: "Claim savings account interest under Section 80TTA",
      section: "80TTA",
      description: `Deduction up to ₹10,000 on savings account interest earned during the year.`,
      maxBenefit: 10000,
      currentUsed: deductions.section80TTA,
      remainingLimit: remaining,
      potentialSaving: Math.round(remaining * taxRate),
      riskLevel: "low",
      lockInPeriod: "None",
      investmentOptions: ["Savings Account Interest"],
    });
  }

  return suggestions.sort((a, b) => b.potentialSaving - a.potentialSaving);
}

// Investment recommendations
export interface InvestmentOption {
  name: string;
  category: string;
  riskLevel: "low" | "medium" | "high";
  expectedReturns: string;
  lockInPeriod: string;
  taxBenefit: string;
  section: string;
  minInvestment: number;
  maxDeduction: number;
  description: string;
}

export const investmentOptions: InvestmentOption[] = [
  {
    name: "Public Provident Fund (PPF)",
    category: "Debt",
    riskLevel: "low",
    expectedReturns: "7.1% p.a.",
    lockInPeriod: "15 years",
    taxBenefit: "EEE (Exempt-Exempt-Exempt)",
    section: "80C",
    minInvestment: 500,
    maxDeduction: 150000,
    description: "Government-backed, risk-free investment with tax-free returns.",
  },
  {
    name: "Employee Provident Fund (EPF)",
    category: "Debt",
    riskLevel: "low",
    expectedReturns: "8.25% p.a.",
    lockInPeriod: "Till retirement",
    taxBenefit: "EEE",
    section: "80C",
    minInvestment: 0,
    maxDeduction: 150000,
    description: "Employer-matched retirement savings with guaranteed returns.",
  },
  {
    name: "Tax Saver Fixed Deposit",
    category: "Debt",
    riskLevel: "low",
    expectedReturns: "6.5-7.5% p.a.",
    lockInPeriod: "5 years",
    taxBenefit: "Deduction on investment",
    section: "80C",
    minInvestment: 1000,
    maxDeduction: 150000,
    description: "Bank FD with 5-year lock-in providing guaranteed returns.",
  },
  {
    name: "Sukanya Samriddhi Yojana",
    category: "Debt",
    riskLevel: "low",
    expectedReturns: "8.2% p.a.",
    lockInPeriod: "21 years",
    taxBenefit: "EEE",
    section: "80C",
    minInvestment: 250,
    maxDeduction: 150000,
    description: "Girl child savings scheme with highest small savings rate.",
  },
  {
    name: "ELSS Mutual Funds",
    category: "Equity",
    riskLevel: "medium",
    expectedReturns: "12-15% p.a. (historical)",
    lockInPeriod: "3 years",
    taxBenefit: "Deduction + LTCG exemption up to ₹1.25L",
    section: "80C",
    minInvestment: 500,
    maxDeduction: 150000,
    description: "Equity-linked savings with shortest lock-in among 80C instruments.",
  },
  {
    name: "National Pension System (NPS)",
    category: "Hybrid",
    riskLevel: "medium",
    expectedReturns: "9-12% p.a.",
    lockInPeriod: "Till 60 years",
    taxBenefit: "Additional ₹50,000 deduction",
    section: "80CCD(1B)",
    minInvestment: 500,
    maxDeduction: 50000,
    description: "Retirement-focused scheme with extra ₹50K tax benefit over 80C.",
  },
  {
    name: "Health Insurance",
    category: "Insurance",
    riskLevel: "low",
    expectedReturns: "N/A (Protection)",
    lockInPeriod: "Annual",
    taxBenefit: "Up to ₹1,00,000 deduction",
    section: "80D",
    minInvestment: 5000,
    maxDeduction: 100000,
    description: "Medical coverage with tax deduction for self, family, and parents.",
  },
  {
    name: "Tax-efficient Equity Funds",
    category: "Equity",
    riskLevel: "high",
    expectedReturns: "12-18% p.a. (historical)",
    lockInPeriod: "None (but 1yr+ for LTCG)",
    taxBenefit: "LTCG up to ₹1.25L tax-free",
    section: "N/A",
    minInvestment: 100,
    maxDeduction: 0,
    description: "Direct equity mutual funds with tax-efficient long-term returns.",
  },
];
