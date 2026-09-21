"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import GuidedField, { usePortalText } from "@/components/filing/GuidedField";

export default function AdditionalIncomePage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, additionalIncome, setAdditionalIncome, setCurrentStep,
    metroCity, setMetroCity, rentPaid, setRentPaid,
    extraDeductions, setExtraDeductions, taxPaid, setTaxPaid } = useFiling();
  const t = usePortalText();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("additional_income");
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep]);

  if (!form16Data) return null;

  const hasSalary = form16Data.salary.basicSalary > 0;

  const updateIncome = (field: keyof typeof additionalIncome, value: string) => {
    setAdditionalIncome({ ...additionalIncome, [field]: Number(value) || 0 });
  };

  const updateDeduction = (field: string, value: string) => {
    setExtraDeductions({ ...extraDeductions, [field]: Number(value) || 0 });
  };

  const updateTaxPaid = (field: keyof typeof taxPaid, value: string) => {
    setTaxPaid({ ...taxPaid, [field]: Number(value) || 0 });
  };

  const amount = (value: number) => (value ? String(value) : "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("itr.income.title")}</h1>
        <p className="text-muted mt-1">{t("itr.income.subtitle")}</p>
      </div>

      <Card variant="bordered">
        <CardTitle>{t("itr.income.business.title")}</CardTitle>
        <CardDescription>{t("itr.income.business.body")}</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GuidedField guide="itr.business.turnover" type="number" min={0} placeholder="0" rupee
            value={amount(taxPaid.businessTurnover)} onChange={(e) => updateTaxPaid("businessTurnover", e.target.value)} />
          <GuidedField guide="itr.business.profit" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.businessIncome)} onChange={(e) => updateIncome("businessIncome", e.target.value)} />
          <GuidedField guide="itr.profession.receipts" type="number" min={0} placeholder="0" rupee
            value={amount(taxPaid.professionalReceipts)} onChange={(e) => updateTaxPaid("professionalReceipts", e.target.value)} />
          <GuidedField guide="itr.profession.profit" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.professionalIncome)} onChange={(e) => updateIncome("professionalIncome", e.target.value)} />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>{t("itr.income.interest.title")}</CardTitle>
        <CardDescription>{t("itr.income.interest.body")}</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GuidedField guide="itr.interest.savings" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.savingsInterest)} onChange={(e) => updateIncome("savingsInterest", e.target.value)} />
          <GuidedField guide="itr.interest.fd" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.fdInterest)} onChange={(e) => updateIncome("fdInterest", e.target.value)} />
          <GuidedField guide="itr.interest.rd" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.rdInterest)} onChange={(e) => updateIncome("rdInterest", e.target.value)} />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>{t("itr.income.gains.title")}</CardTitle>
        <CardDescription>{t("itr.income.gains.body")}</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GuidedField guide="itr.gains.short" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.capitalGainsSTCG)} onChange={(e) => updateIncome("capitalGainsSTCG", e.target.value)} />
          <GuidedField guide="itr.gains.long" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.capitalGainsLTCG)} onChange={(e) => updateIncome("capitalGainsLTCG", e.target.value)} />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>{t("itr.income.other.title")}</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GuidedField guide="itr.other.rent" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.rentalIncome)} onChange={(e) => updateIncome("rentalIncome", e.target.value)} />
          <GuidedField guide="itr.other.misc" type="number" min={0} placeholder="0" rupee
            value={amount(additionalIncome.otherIncome)} onChange={(e) => updateIncome("otherIncome", e.target.value)} />
        </div>
      </Card>

      {hasSalary && (
        <Card variant="bordered">
          <CardTitle>{t("itr.income.hra.title")}</CardTitle>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={metroCity} onChange={() => setMetroCity(true)} className="text-primary" />
                <span className="text-sm">{t("itr.income.hra.metro")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={!metroCity} onChange={() => setMetroCity(false)} className="text-primary" />
                <span className="text-sm">{t("itr.income.hra.nonMetro")}</span>
              </label>
            </div>
            <GuidedField guide="itr.hra.rentPaid" type="number" min={0} placeholder="0" rupee
              value={amount(rentPaid)} onChange={(e) => setRentPaid(Number(e.target.value) || 0)} />
          </div>
        </Card>
      )}

      <Card variant="bordered">
        <CardTitle>{t("itr.income.taxPaid.title")}</CardTitle>
        <CardDescription>{t("itr.income.taxPaid.body")}</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GuidedField guide="itr.tax.advanceTax" type="number" min={0} placeholder="0" rupee
            value={amount(taxPaid.advanceTax)} onChange={(e) => updateTaxPaid("advanceTax", e.target.value)} />
          <GuidedField guide="itr.tax.tdsOther" type="number" min={0} placeholder="0" rupee
            value={amount(taxPaid.otherTds)} onChange={(e) => updateTaxPaid("otherTds", e.target.value)} />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>{t("itr.income.deductions.title")}</CardTitle>
        <CardDescription>{t("itr.income.deductions.body")}</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GuidedField guide="itr.ded.80c" type="number" min={0} placeholder="0" rupee
            value={amount(extraDeductions.section80C || 0)} onChange={(e) => updateDeduction("section80C", e.target.value)} />
          <GuidedField guide="itr.ded.nps" type="number" min={0} placeholder="0" rupee
            value={amount(extraDeductions.section80CCD1B || 0)} onChange={(e) => updateDeduction("section80CCD1B", e.target.value)} />
          <GuidedField guide="itr.ded.80d" type="number" min={0} placeholder="0" rupee
            value={amount(extraDeductions.section80D || 0)} onChange={(e) => updateDeduction("section80D", e.target.value)} />
          <GuidedField guide="itr.ded.80tta" type="number" min={0} placeholder="0" rupee
            value={amount(extraDeductions.section80TTA || 0)} onChange={(e) => updateDeduction("section80TTA", e.target.value)} />
          <GuidedField guide="itr.ded.homeLoanInterest" type="number" min={0} placeholder="0" rupee
            value={amount(extraDeductions.section24 || 0)} onChange={(e) => updateDeduction("section24", e.target.value)} />
          <GuidedField guide="itr.ded.other" type="number" min={0} placeholder="0" rupee
            value={amount(extraDeductions.otherDeductions || 0)} onChange={(e) => updateDeduction("otherDeductions", e.target.value)} />
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => {
          if (hasSalary) { setCurrentStep("review"); router.push("/filing/review"); }
          else { setCurrentStep("upload"); router.push("/filing/upload"); }
        }}>
          {t("itr.income.back")}
        </Button>
        <Button onClick={() => { setCurrentStep("compute"); router.push("/filing/compute"); }}>
          {t("itr.income.next")}
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
