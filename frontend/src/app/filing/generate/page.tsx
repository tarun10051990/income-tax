"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

export default function GeneratePage() {
  const router = useRouter();
  const { isAuthenticated, isReady, user } = useAuth();
  const { form16Data, taxResult, setCurrentStep, onboardingData } = useFiling();
  const [itrType, setItrType] = useState<string>(() => {
    if (onboardingData?.employmentType === "business") return "ITR-3";
    if (onboardingData?.employmentType === "freelancer") return "ITR-4";
    return "ITR-1";
  });
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountNumber: "",
    ifsc: "",
    accountType: "savings",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("generate");
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    setGenerated(true);
    setIsGenerating(false);
  };

  if (!form16Data || !taxResult) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate ITR Form</h1>
        <p className="text-muted mt-1">Review details and generate your Income Tax Return</p>
      </div>

      {/* ITR Type Selection */}
      <Card variant="bordered">
        <CardTitle>Select ITR Form Type</CardTitle>
        <CardDescription>Based on your income sources, we recommend the appropriate form</CardDescription>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { type: "ITR-1", name: "Sahaj", desc: "Salary + 1 house + other sources", for: "Salaried (up to Rs. 50L)" },
            { type: "ITR-2", name: "", desc: "Salary + capital gains + multiple houses", for: "Salaried with CG" },
            { type: "ITR-3", name: "", desc: "Business/professional income", for: "Business owners" },
            { type: "ITR-4", name: "Sugam", desc: "Presumptive business income", for: "Freelancers/Small biz" },
          ].map((form) => (
            <button
              key={form.type}
              onClick={() => setItrType(form.type)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                itrType === form.type
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="font-bold text-sm">{form.type}</div>
              {form.name && <div className="text-xs text-primary">{form.name}</div>}
              <div className="text-xs text-muted mt-1">{form.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Personal Details Verification */}
      <Card variant="bordered">
        <CardTitle>Personal Details</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted">Name</p>
            <p className="text-sm font-medium">{form16Data.employee.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted">PAN</p>
            <p className="text-sm font-medium">{form16Data.employee.pan}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Assessment Year</p>
            <p className="text-sm font-medium">AY 2025-26</p>
          </div>
          <div>
            <p className="text-xs text-muted">Email</p>
            <p className="text-sm font-medium">{user?.email || "demo@taxfiler.in"}</p>
          </div>
        </div>
      </Card>

      {/* Bank Details */}
      <Card variant="bordered">
        <CardTitle>Bank Account Details</CardTitle>
        <CardDescription>Required for refund credit (if applicable)</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Bank Name"
            placeholder="State Bank of India"
            value={bankDetails.bankName}
            onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
          />
          <Input
            label="Account Number"
            placeholder="Enter account number"
            value={bankDetails.accountNumber}
            onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
          />
          <Input
            label="IFSC Code"
            placeholder="SBIN0001234"
            value={bankDetails.ifsc}
            onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Account Type</label>
            <select
              value={bankDetails.accountType}
              onChange={(e) => setBankDetails({ ...bankDetails, accountType: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
            >
              <option value="savings">Savings Account</option>
              <option value="current">Current Account</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tax Summary */}
      <Card variant="bordered">
        <CardTitle>Tax Summary ({taxResult.recommendedRegime === "new" ? "New" : "Old"} Regime)</CardTitle>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Total Income</span>
            <span className="font-mono font-medium">{formatCurrency(taxResult.totalIncome)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Total Deductions</span>
            <span className="font-mono font-medium text-secondary">
              -{formatCurrency(taxResult.recommendedRegime === "new" ? taxResult.deductionsNew : taxResult.deductionsOld)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Taxable Income</span>
            <span className="font-mono font-medium">
              {formatCurrency(taxResult.recommendedRegime === "new" ? taxResult.taxableIncomeNew : taxResult.taxableIncomeOld)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
            <span>Total Tax</span>
            <span className="font-mono">
              {formatCurrency(taxResult.recommendedRegime === "new" ? taxResult.totalTaxNew : taxResult.totalTaxOld)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">TDS Paid</span>
            <span className="font-mono font-medium text-secondary">-{formatCurrency(form16Data.tax.tdsDeducted)}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
            <span>{(taxResult.recommendedRegime === "new" ? taxResult.refundNew : taxResult.refundOld) >= 0 ? "Refund" : "Tax Due"}</span>
            <span className={(taxResult.recommendedRegime === "new" ? taxResult.refundNew : taxResult.refundOld) >= 0 ? "text-secondary" : "text-danger"}>
              {formatCurrency(Math.abs(taxResult.recommendedRegime === "new" ? taxResult.refundNew : taxResult.refundOld))}
            </span>
          </div>
        </div>
      </Card>

      {!generated ? (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => { setCurrentStep("suggestions"); router.push("/filing/suggestions"); }}>
            Back
          </Button>
          <Button onClick={handleGenerate} loading={isGenerating}>
            {isGenerating ? "Generating ITR..." : `Generate ${itrType}`}
          </Button>
        </div>
      ) : (
        <>
          {/* Download Options */}
          <Card variant="bordered" className="bg-emerald-50/50 border-emerald-200">
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-secondary">{itrType} Generated Successfully!</h3>
                <p className="text-sm text-muted mt-1">Download your return in the preferred format</p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  JSON
                </Button>
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Excel
                </Button>
                <Button size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  PDF Summary
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setGenerated(false)}>
              Re-generate
            </Button>
            <Button onClick={() => { setCurrentStep("summary"); router.push("/filing/summary"); }}>
              View Summary
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
