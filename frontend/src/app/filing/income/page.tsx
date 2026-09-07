"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AdditionalIncomePage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, additionalIncome, setAdditionalIncome, setCurrentStep,
    metroCity, setMetroCity, rentPaid, setRentPaid,
    extraDeductions, setExtraDeductions } = useFiling();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("additional_income");
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep]);

  if (!form16Data) return null;

  const updateIncome = (field: keyof typeof additionalIncome, value: string) => {
    setAdditionalIncome({ ...additionalIncome, [field]: Number(value) || 0 });
  };

  const updateDeduction = (field: string, value: string) => {
    setExtraDeductions({ ...extraDeductions, [field]: Number(value) || 0 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Additional Income & Deductions</h1>
        <p className="text-muted mt-1">Add any other sources of income and claim additional deductions</p>
      </div>

      {/* Interest Income */}
      <Card variant="bordered">
        <CardTitle>Interest Income</CardTitle>
        <CardDescription>Income from bank accounts and deposits</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Savings Account Interest"
            type="number"
            placeholder="0"
            value={additionalIncome.savingsInterest || ""}
            onChange={(e) => updateIncome("savingsInterest", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
          />
          <Input
            label="Fixed Deposit Interest"
            type="number"
            placeholder="0"
            value={additionalIncome.fdInterest || ""}
            onChange={(e) => updateIncome("fdInterest", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
          />
          <Input
            label="RD Interest"
            type="number"
            placeholder="0"
            value={additionalIncome.rdInterest || ""}
            onChange={(e) => updateIncome("rdInterest", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
          />
        </div>
      </Card>

      {/* Capital Gains */}
      <Card variant="bordered">
        <CardTitle>Capital Gains</CardTitle>
        <CardDescription>Gains from stocks, mutual funds, property</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Short-Term Capital Gains (STCG)"
            type="number"
            placeholder="0"
            value={additionalIncome.capitalGainsSTCG || ""}
            onChange={(e) => updateIncome("capitalGainsSTCG", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
            helperText="Stocks/MF held < 1 year"
          />
          <Input
            label="Long-Term Capital Gains (LTCG)"
            type="number"
            placeholder="0"
            value={additionalIncome.capitalGainsLTCG || ""}
            onChange={(e) => updateIncome("capitalGainsLTCG", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
            helperText="Stocks/MF held > 1 year"
          />
        </div>
      </Card>

      {/* Other Income */}
      <Card variant="bordered">
        <CardTitle>Other Income</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Rental Income (Annual)"
            type="number"
            placeholder="0"
            value={additionalIncome.rentalIncome || ""}
            onChange={(e) => updateIncome("rentalIncome", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
          />
          <Input
            label="Other Income"
            type="number"
            placeholder="0"
            value={additionalIncome.otherIncome || ""}
            onChange={(e) => updateIncome("otherIncome", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
            helperText="Freelance, gifts, etc."
          />
        </div>
      </Card>

      {/* HRA Details */}
      <Card variant="bordered">
        <CardTitle>HRA Details (for Old Regime)</CardTitle>
        <CardDescription>Required to calculate HRA exemption</CardDescription>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">City Type:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={metroCity}
                  onChange={() => setMetroCity(true)}
                  className="text-primary"
                />
                <span className="text-sm">Metro (Delhi, Mumbai, Chennai, Kolkata)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!metroCity}
                  onChange={() => setMetroCity(false)}
                  className="text-primary"
                />
                <span className="text-sm">Non-Metro</span>
              </label>
            </div>
          </div>
          <Input
            label="Annual Rent Paid"
            type="number"
            placeholder="0"
            value={rentPaid || ""}
            onChange={(e) => setRentPaid(Number(e.target.value) || 0)}
            leftIcon={<span className="text-xs">Rs.</span>}
          />
        </div>
      </Card>

      {/* Additional Deductions */}
      <Card variant="bordered">
        <CardTitle>Additional Deductions (Old Regime)</CardTitle>
        <CardDescription>Claim deductions to reduce your taxable income</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Section 80C (ELSS, PPF, LIC, etc.)"
            type="number"
            placeholder="0"
            value={extraDeductions.section80C || ""}
            onChange={(e) => updateDeduction("section80C", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
            helperText="Max Rs. 1,50,000 (incl. PF)"
          />
          <Input
            label="Section 80CCD(1B) — NPS"
            type="number"
            placeholder="0"
            value={extraDeductions.section80CCD1B || ""}
            onChange={(e) => updateDeduction("section80CCD1B", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
            helperText="Max Rs. 50,000 (additional)"
          />
          <Input
            label="Section 80D — Health Insurance"
            type="number"
            placeholder="0"
            value={extraDeductions.section80D || ""}
            onChange={(e) => updateDeduction("section80D", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
            helperText="Self: 25K, Parents: 50K (Senior)"
          />
          <Input
            label="Section 80TTA — Savings Interest"
            type="number"
            placeholder="0"
            value={extraDeductions.section80TTA || ""}
            onChange={(e) => updateDeduction("section80TTA", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
            helperText="Max Rs. 10,000"
          />
          <Input
            label="Section 24 — Home Loan Interest"
            type="number"
            placeholder="0"
            value={extraDeductions.section24 || ""}
            onChange={(e) => updateDeduction("section24", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
            helperText="Max Rs. 2,00,000"
          />
          <Input
            label="Other Deductions"
            type="number"
            placeholder="0"
            value={extraDeductions.otherDeductions || ""}
            onChange={(e) => updateDeduction("otherDeductions", e.target.value)}
            leftIcon={<span className="text-xs">Rs.</span>}
          />
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => { setCurrentStep("review"); router.push("/filing/review"); }}>
          Back
        </Button>
        <Button onClick={() => { setCurrentStep("compute"); router.push("/filing/compute"); }}>
          Compute Tax
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
