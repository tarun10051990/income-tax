"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Form16Data, OnboardingData, FilingStep } from "@/lib/types";
import { TaxInput, TaxResult, TaxSuggestion, computeTax, generateTaxSuggestions } from "@/lib/tax-engine";

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
  computeTaxResult: () => void;
  metroCity: boolean;
  setMetroCity: (v: boolean) => void;
  rentPaid: number;
  setRentPaid: (v: number) => void;
  resetFiling: () => void;
}

const FilingContext = createContext<FilingContextType | undefined>(undefined);

const defaultAdditionalIncome: TaxInput["additionalIncome"] = {
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
  const [metroCity, setMetroCity] = useState(true);
  const [rentPaid, setRentPaid] = useState(0);

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
      metroCity,
      rentPaid,
    };

    const result = computeTax(input);
    setTaxResult(result);

    const suggestions = generateTaxSuggestions(input);
    setTaxSuggestions(suggestions);
  }, [form16Data, onboardingData, additionalIncome, extraDeductions, metroCity, rentPaid]);

  const resetFiling = useCallback(() => {
    setCurrentStep("onboarding");
    setOnboardingData(null);
    setForm16Data(null);
    setAdditionalIncome(defaultAdditionalIncome);
    setExtraDeductions({});
    setTaxResult(null);
    setTaxSuggestions([]);
    setMetroCity(true);
    setRentPaid(0);
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
        computeTaxResult,
        metroCity,
        setMetroCity,
        rentPaid,
        setRentPaid,
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
