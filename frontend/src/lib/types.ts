export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  pan: string;
  aadhaar?: string;
  role: "user" | "admin";
  onboardingComplete: boolean;
}

export interface OnboardingData {
  financialYear: string;
  employmentType: "salaried" | "business" | "freelancer" | "pensioner";
  taxRegimePreference: "old" | "new" | "compare";
}

export interface Form16Data {
  employer: {
    name: string;
    tan: string;
    pan: string;
    address: string;
  };
  employee: {
    name: string;
    pan: string;
    aadhaar?: string;
    designation: string;
  };
  salary: {
    basicSalary: number;
    hra: number;
    specialAllowance: number;
    bonus: number;
    leaveEncashment: number;
    otherAllowances: number;
  };
  deductions: {
    pfContribution: number;
    professionalTax: number;
    standardDeduction: number;
    otherDeductions: number;
  };
  tax: {
    tdsDeducted: number;
    taxDeposited: number;
    taxableIncome: number;
  };
}

export interface TaxReturn {
  id: string;
  userId: string;
  financialYear: string;
  assessmentYear: string;
  status: "draft" | "review" | "filed" | "processed" | "refund_issued";
  itrType: "ITR-1" | "ITR-2" | "ITR-3" | "ITR-4";
  form16Data?: Form16Data;
  additionalIncome?: {
    savingsInterest: number;
    fdInterest: number;
    rdInterest: number;
    capitalGainsSTCG: number;
    capitalGainsLTCG: number;
    rentalIncome: number;
    otherIncome: number;
  };
  taxResult?: {
    taxableIncomeOld: number;
    taxableIncomeNew: number;
    totalTaxOld: number;
    totalTaxNew: number;
    refundOld: number;
    refundNew: number;
    recommendedRegime: "old" | "new";
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type FilingStep =
  | "onboarding"
  | "upload"
  | "review"
  | "additional_income"
  | "deductions"
  | "compute"
  | "suggestions"
  | "generate"
  | "summary";
