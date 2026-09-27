"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Form16Data, OnboardingData, FilingStep } from "@/lib/types";
import { TaxInput, TaxResult, TaxSuggestion, computeTax, generateTaxSuggestions } from "@/lib/tax-engine";
import { PlainSavings, explainSavings } from "@/lib/plain-savings";
import { ReadDocument, totalsByField } from "@/lib/document-reader";

interface FilingContextType {
  currentStep: FilingStep;
  setCurrentStep: (step: FilingStep) => void;
  onboardingData: OnboardingData | null;
  setOnboardingData: (data: OnboardingData) => void;
  form16Data: Form16Data | null;
  setForm16Data: (data: Form16Data) => void;
  additionalIncome: TaxInput["additionalIncome"];
  setAdditionalIncome: (data: TaxInput["additionalIncome"]) => void;
  extraDeductions: Partial<TaxInput["deductions"]>;
  setExtraDeductions: (data: Partial<TaxInput["deductions"]>) => void;
  taxResult: TaxResult | null;
  taxSuggestions: TaxSuggestion[];
  plainSavings: PlainSavings | null;
  /** Statements / receipts the user uploaded and what we read from them. */
  documents: ReadDocument[];
  setDocuments: (docs: ReadDocument[]) => void;
  /** Copies the included amounts of every document into the income / deduction fields. */
  applyDocuments: (docs: ReadDocument[]) => void;
  computeTaxResult: () => void;
  metroCity: boolean;
  setMetroCity: (v: boolean) => void;
  rentPaid: number;
  setRentPaid: (v: number) => void;
  taxPaid: TaxPaid;
  setTaxPaid: (v: TaxPaid) => void;
  /** Starts a return with no Form 16 (business / professional filer). */
  startWithoutForm16: (name: string) => void;
  resetFiling: () => void;
}

const FilingContext = createContext<FilingContextType | undefined>(undefined);

export interface TaxPaid {
  advanceTax: number;
  otherTds: number;
  /** Gross turnover / receipts, kept for the ITR form; tax uses the profit fields. */
  businessTurnover: number;
  professionalReceipts: number;
}

const defaultTaxPaid: TaxPaid = { advanceTax: 0, otherTds: 0, businessTurnover: 0, professionalReceipts: 0 };

/** Empty Form 16 used when the taxpayer has no salary income. */
export function blankForm16(name: string): Form16Data {
  return {
    employer: { name: "", tan: "", pan: "", address: "" },
    employee: { name, pan: "", designation: "Self-employed / business" },
    salary: { basicSalary: 0, hra: 0, specialAllowance: 0, bonus: 0, leaveEncashment: 0, otherAllowances: 0 },
    deductions: { pfContribution: 0, professionalTax: 0, standardDeduction: 0, otherDeductions: 0 },
    tax: { tdsDeducted: 0, taxDeposited: 0, taxableIncome: 0 },
  };
}

const defaultAdditionalIncome: TaxInput["additionalIncome"] = {
  businessIncome: 0,
  professionalIncome: 0,
  savingsInterest: 0,
  fdInterest: 0,
  rdInterest: 0,
  capitalGainsSTCG: 0,
  capitalGainsLTCG: 0,
  rentalIncome: 0,
  otherIncome: 0,
};

export function FilingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<FilingStep>("onboarding");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [form16Data, setForm16Data] = useState<Form16Data | null>(null);
  const [additionalIncome, setAdditionalIncome] = useState(defaultAdditionalIncome);
  const [extraDeductions, setExtraDeductions] = useState<Partial<TaxInput["deductions"]>>({});
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const [taxSuggestions, setTaxSuggestions] = useState<TaxSuggestion[]>([]);
  const [plainSavings, setPlainSavings] = useState<PlainSavings | null>(null);
  const [documents, setDocuments] = useState<ReadDocument[]>([]);
  const [metroCity, setMetroCity] = useState(true);
  const [rentPaid, setRentPaid] = useState(0);
  const [taxPaid, setTaxPaid] = useState<TaxPaid>(defaultTaxPaid);

  const computeTaxResult = useCallback(() => {
    if (!form16Data) return;

    const input: TaxInput = {
      financialYear: onboardingData?.financialYear || "2024-25",
      salary: form16Data.salary,
      deductions: {
        pfContribution: form16Data.deductions.pfContribution,
        professionalTax: form16Data.deductions.professionalTax,
        standardDeduction: form16Data.deductions.standardDeduction || 50000,
        section80C: extraDeductions.section80C || 0,
        section80CCD1B: extraDeductions.section80CCD1B || 0,
        section80D: extraDeductions.section80D || 0,
        section80TTA: extraDeductions.section80TTA || 0,
        section24: extraDeductions.section24 || 0,
        hraExemption: 0,
        otherDeductions: form16Data.deductions.otherDeductions + (extraDeductions.otherDeductions || 0),
      },
      additionalIncome,
      tdsDeducted: form16Data.tax.tdsDeducted,
      advanceTax: taxPaid.advanceTax,
      otherTds: taxPaid.otherTds,
      metroCity,
      rentPaid,
    };

    const result = computeTax(input);
    setTaxResult(result);

    const suggestions = generateTaxSuggestions(input);
    setTaxSuggestions(suggestions);
    setPlainSavings(explainSavings(input, result));
  }, [form16Data, onboardingData, additionalIncome, extraDeductions, metroCity, rentPaid, taxPaid]);

  const startWithoutForm16 = useCallback((name: string) => {
    setForm16Data(blankForm16(name));
    setCurrentStep("documents");
  }, []);

  const applyDocuments = useCallback((docs: ReadDocument[]) => {
    setDocuments(docs);
    const totals = totalsByField(docs);
    const form16 = docs.find((d) => d.form16 && (d.form16.salary.basicSalary > 0 || d.form16.tax.tdsDeducted > 0))?.form16;
    if (form16) setForm16Data(form16);
    setExtraDeductions((prev) => ({
      ...prev,
      ...(totals.section80C !== undefined && { section80C: totals.section80C }),
      ...(totals.section80CCD1B !== undefined && { section80CCD1B: totals.section80CCD1B }),
      ...(totals.section80D !== undefined && { section80D: totals.section80D }),
      ...(totals.section80TTA !== undefined && { section80TTA: totals.section80TTA }),
      ...(totals.section24 !== undefined && { section24: totals.section24 }),
      ...(totals.otherDeductions !== undefined && { otherDeductions: totals.otherDeductions }),
    }));
    setAdditionalIncome((prev) => ({
      ...prev,
      ...(totals.savingsInterest !== undefined && { savingsInterest: totals.savingsInterest }),
      ...(totals.fdInterest !== undefined && { fdInterest: totals.fdInterest }),
      ...(totals.rdInterest !== undefined && { rdInterest: totals.rdInterest }),
      ...(totals.capitalGainsSTCG !== undefined && { capitalGainsSTCG: totals.capitalGainsSTCG }),
      ...(totals.capitalGainsLTCG !== undefined && { capitalGainsLTCG: totals.capitalGainsLTCG }),
      ...(totals.rentalIncome !== undefined && { rentalIncome: totals.rentalIncome }),
    }));
    setTaxPaid((prev) => ({
      ...prev,
      ...(totals.otherTds !== undefined && { otherTds: totals.otherTds }),
      ...(totals.advanceTax !== undefined && { advanceTax: totals.advanceTax }),
    }));
  }, []);

  const resetFiling = useCallback(() => {
    setCurrentStep("onboarding");
    setOnboardingData(null);
    setForm16Data(null);
    setAdditionalIncome(defaultAdditionalIncome);
    setExtraDeductions({});
    setTaxResult(null);
    setTaxSuggestions([]);
    setPlainSavings(null);
    setDocuments([]);
    setMetroCity(true);
    setRentPaid(0);
    setTaxPaid(defaultTaxPaid);
  }, []);

  return (
    <FilingContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        onboardingData,
        setOnboardingData,
        form16Data,
        setForm16Data,
        additionalIncome,
        setAdditionalIncome,
        extraDeductions,
        setExtraDeductions,
        taxResult,
        taxSuggestions,
        plainSavings,
        documents,
        setDocuments,
        applyDocuments,
        computeTaxResult,
        metroCity,
        setMetroCity,
        rentPaid,
        setRentPaid,
        taxPaid,
        setTaxPaid,
        startWithoutForm16,
        resetFiling,
      }}
    >
      {children}
    </FilingContext.Provider>
  );
}

export function useFiling() {
  const context = useContext(FilingContext);
  if (context === undefined) {
    throw new Error("useFiling must be used within a FilingProvider");
  }
  return context;
}
