"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import { Form16Data, OnboardingData, FilingStep } from "@/lib/types";
import { TaxInput, TaxResult, TaxSuggestion, generateTaxSuggestions } from "@/lib/tax-engine";
import { AgeGroup, RateBook, ServerTaxResult, ComputeRequest, taxRatesApi } from "@/lib/tax-rates";
import { PlainSavings, explainSavings } from "@/lib/plain-savings";
import { ReadDocument, totalsByField } from "@/lib/document-reader";

interface FilingContextType {
  currentStep: FilingStep;
  setCurrentStep: (step: FilingStep) => void;
  onboardingData: OnboardingData | null;
  setOnboardingData: (data: OnboardingData) => void;
  form16Data: Form16Data | null;
  setForm16Data: (data: Form16Data) => void;
  /** Amount per tax category code (income and deductions), e.g. { EQUITY_LTCG_112A: 150000 }. */
  amounts: Record<string, number>;
  setAmount: (code: string, value: number) => void;
  ageGroup: AgeGroup;
  setAgeGroup: (v: AgeGroup) => void;
  /** Tax rates for the chosen financial year, loaded from the database. */
  rateBook: RateBook | null;
  rateBookError: string | null;
  /** Derived views kept for the tax-saving tips. */
  additionalIncome: TaxInput["additionalIncome"];
  extraDeductions: Partial<TaxInput["deductions"]>;
  taxResult: TaxResult | null;
  /** Full per-category result from the server. */
  serverResult: ServerTaxResult | null;
  computing: boolean;
  computeError: string | null;
  taxSuggestions: TaxSuggestion[];
  plainSavings: PlainSavings | null;
  /** Statements / receipts the user uploaded and what we read from them. */
  documents: ReadDocument[];
  setDocuments: (docs: ReadDocument[]) => void;
  /** Copies the included amounts of every document into the income / deduction fields. */
  applyDocuments: (docs: ReadDocument[]) => void;
  computeTaxResult: () => Promise<void>;
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

/** Maps the amounts read from uploaded documents to tax category codes. */
const DOCUMENT_FIELD_CODES: Record<string, string> = {
  savingsInterest: "INTEREST_SAVINGS",
  capitalGainsSTCG: "EQUITY_STCG_111A",
  capitalGainsLTCG: "EQUITY_LTCG_112A",
  rentalIncome: "RENT_RECEIVED",
  section80C: "DED_80C",
  section80CCD1B: "DED_80CCD1B",
  section80D: "DED_80D_SELF",
  section24: "DED_24B_SELF",
  otherDeductions: "DED_OTHER",
};

const sumOf = (amounts: Record<string, number>, ...codes: string[]) => codes.reduce((n, c) => n + (amounts[c] || 0), 0);

export function grossSalaryOf(form16: Form16Data | null): number {
  if (!form16) return 0;
  const s = form16.salary;
  return s.basicSalary + s.hra + s.specialAllowance + s.bonus + s.leaveEncashment + s.otherAllowances;
}

/** Converts the server result into the shape used by the summary, ITR and advisor pages. */
function toTaxResult(r: ServerTaxResult, amounts: Record<string, number>, grossSalary: number, rateBook: RateBook | null): TaxResult {
  const exempt = new Set((rateBook?.categories ?? []).filter((c) => c.treatment === "EXEMPT" || c.kind === "DEDUCTION").map((c) => c.code));
  const business = new Set((rateBook?.categories ?? []).filter((c) => c.groupCode === "TRADING_BUSINESS").map((c) => c.code));
  const totalIncome = Object.entries(amounts).filter(([code]) => !exempt.has(code)).reduce((n, [, v]) => n + v, 0);
  const o = r.oldRegime;
  const n = r.newRegime;
  return {
    grossSalary,
    businessIncome: Object.entries(amounts).filter(([code]) => business.has(code)).reduce((s, [, v]) => s + v, 0),
    taxPaid: n.taxesPaid,
    totalIncome,
    taxableIncomeOld: o.taxableIncome,
    taxableIncomeNew: n.taxableIncome,
    taxOldRegime: o.totalTax - o.cess,
    taxNewRegime: n.totalTax - n.cess,
    cessOld: o.cess,
    cessNew: n.cess,
    totalTaxOld: o.totalTax,
    totalTaxNew: n.totalTax,
    refundOld: o.refund - o.netPayable,
    refundNew: n.refund - n.netPayable,
    recommendedRegime: r.recommendedRegime === "OLD" ? "old" : "new",
    deductionsOld: Math.max(0, totalIncome - o.taxableIncome),
    deductionsNew: Math.max(0, totalIncome - n.taxableIncome),
    savings: r.savings,
  };
}

export function FilingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<FilingStep>("onboarding");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [form16Data, setForm16Data] = useState<Form16Data | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("BELOW_60");
  const [rateBook, setRateBook] = useState<RateBook | null>(null);
  const [rateBookError, setRateBookError] = useState<string | null>(null);
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const [serverResult, setServerResult] = useState<ServerTaxResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);
  const [taxSuggestions, setTaxSuggestions] = useState<TaxSuggestion[]>([]);
  const [plainSavings, setPlainSavings] = useState<PlainSavings | null>(null);
  const [documents, setDocuments] = useState<ReadDocument[]>([]);
  const [metroCity, setMetroCity] = useState(true);
  const [rentPaid, setRentPaid] = useState(0);
  const [taxPaid, setTaxPaid] = useState<TaxPaid>(defaultTaxPaid);

  const financialYear = onboardingData?.financialYear;

  useEffect(() => {
    let cancelled = false;
    taxRatesApi.rates(financialYear)
      .then((book) => { if (!cancelled) { setRateBook(book); setRateBookError(null); } })
      .catch((e: Error) => { if (!cancelled) setRateBookError(e.message || "Could not load tax rates"); });
    return () => { cancelled = true; };
  }, [financialYear]);

  const setAmount = useCallback((code: string, value: number) => {
    setAmounts((prev) => {
      const next = { ...prev };
      if (value > 0) next[code] = value; else delete next[code];
      return next;
    });
  }, []);

  /** Everything the tax is worked out from: form 16 salary and tax plus the category amounts. */
  const formAmounts = useMemo(() => {
    const all: Record<string, number> = { ...amounts };
    const salary = grossSalaryOf(form16Data);
    if (salary > 0) all.SALARY = salary;
    if (form16Data?.deductions.professionalTax) all.DED_PROF_TAX = form16Data.deductions.professionalTax;
    if (form16Data?.deductions.pfContribution) all.DED_80C = (all.DED_80C || 0) + form16Data.deductions.pfContribution;
    return all;
  }, [amounts, form16Data]);

  const additionalIncome = useMemo<TaxInput["additionalIncome"]>(() => ({
    businessIncome: sumOf(amounts, "BUSINESS_PROFIT", "INTRADAY_SPECULATIVE", "FNO_TRADING"),
    professionalIncome: sumOf(amounts, "PROFESSIONAL_INCOME"),
    savingsInterest: sumOf(amounts, "INTEREST_SAVINGS"),
    fdInterest: sumOf(amounts, "INTEREST_DEPOSITS"),
    rdInterest: 0,
    capitalGainsSTCG: sumOf(amounts, "EQUITY_STCG_111A", "EQUITY_STCG_111A_PRE", "DEBT_MF_50AA", "OTHER_STCG"),
    capitalGainsLTCG: sumOf(amounts, "EQUITY_LTCG_112A", "EQUITY_LTCG_112A_PRE", "LTCG_OTHER_112", "PROPERTY_LTCG_INDEXED"),
    rentalIncome: sumOf(amounts, "RENT_RECEIVED"),
    otherIncome: sumOf(amounts, "DIVIDEND", "OTHER_INCOME", "CRYPTO_VDA", "LOTTERY_GAMES"),
  }), [amounts]);

  const extraDeductions = useMemo<Partial<TaxInput["deductions"]>>(() => ({
    section80C: sumOf(amounts, "DED_80C"),
    section80CCD1B: sumOf(amounts, "DED_80CCD1B"),
    section80D: sumOf(amounts, "DED_80D_SELF", "DED_80D_PARENTS", "DED_80D_PARENTS_SENIOR"),
    section80TTA: Math.min(sumOf(amounts, "INTEREST_SAVINGS"), 10000),
    section24: sumOf(amounts, "DED_24B_SELF"),
    otherDeductions: sumOf(amounts, "DED_80CCD2", "DED_80E", "DED_80G", "DED_OTHER"),
  }), [amounts]);

  const computeTaxResult = useCallback(async () => {
    if (!form16Data) return;
    const fy = financialYear || rateBook?.financialYear;
    if (!fy) return;
    const request: ComputeRequest = {
      financialYear: fy,
      ageGroup,
      metroCity,
      basicSalary: form16Data.salary.basicSalary,
      hraReceived: form16Data.salary.hra,
      rentPaid,
      amounts: formAmounts,
      tdsOnSalary: form16Data.tax.tdsDeducted,
      otherTds: taxPaid.otherTds,
      advanceTax: taxPaid.advanceTax,
    };
    setComputing(true);
    setComputeError(null);
    try {
      const saved = await taxRatesApi.saveComputation(request);
      const result = toTaxResult(saved.result, formAmounts, grossSalaryOf(form16Data), rateBook);
      setServerResult(saved.result);
      setTaxResult(result);

      const input: TaxInput = {
        financialYear: fy,
        salary: form16Data.salary,
        deductions: {
          pfContribution: form16Data.deductions.pfContribution,
          professionalTax: form16Data.deductions.professionalTax,
          standardDeduction: saved.result.oldRegime.standardDeduction,
          section80C: extraDeductions.section80C || 0,
          section80CCD1B: extraDeductions.section80CCD1B || 0,
          section80D: extraDeductions.section80D || 0,
          section80TTA: extraDeductions.section80TTA || 0,
          section24: extraDeductions.section24 || 0,
          hraExemption: saved.result.oldRegime.hraExemption,
          otherDeductions: form16Data.deductions.otherDeductions + (extraDeductions.otherDeductions || 0),
        },
        additionalIncome,
        tdsDeducted: form16Data.tax.tdsDeducted,
        advanceTax: taxPaid.advanceTax,
        otherTds: taxPaid.otherTds,
        metroCity,
        rentPaid,
      };
      setTaxSuggestions(generateTaxSuggestions(input));
      setPlainSavings(explainSavings(input, result));
    } catch (e) {
      setComputeError(e instanceof Error ? e.message : "Could not work out your tax. Please try again.");
    } finally {
      setComputing(false);
    }
  }, [form16Data, financialYear, rateBook, ageGroup, metroCity, rentPaid, formAmounts, taxPaid, extraDeductions, additionalIncome]);

  const startWithoutForm16 = useCallback((name: string) => {
    setForm16Data(blankForm16(name));
    setCurrentStep("documents");
  }, []);

  const applyDocuments = useCallback((docs: ReadDocument[]) => {
    setDocuments(docs);
    const totals = totalsByField(docs);
    const form16 = docs.find((d) => d.form16 && (d.form16.salary.basicSalary > 0 || d.form16.tax.tdsDeducted > 0))?.form16;
    if (form16) setForm16Data(form16);
    setAmounts((prev) => {
      const next = { ...prev };
      for (const [field, code] of Object.entries(DOCUMENT_FIELD_CODES)) {
        const value = totals[field as keyof typeof totals];
        if (value !== undefined) next[code] = value;
      }
      if (totals.fdInterest !== undefined || totals.rdInterest !== undefined) {
        next.INTEREST_DEPOSITS = (totals.fdInterest || 0) + (totals.rdInterest || 0);
      }
      return next;
    });
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
    setAmounts({});
    setAgeGroup("BELOW_60");
    setTaxResult(null);
    setServerResult(null);
    setComputeError(null);
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
        amounts,
        setAmount,
        ageGroup,
        setAgeGroup,
        rateBook,
        rateBookError,
        additionalIncome,
        extraDeductions,
        taxResult,
        serverResult,
        computing,
        computeError,
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
