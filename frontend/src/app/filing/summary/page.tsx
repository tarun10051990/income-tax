"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function SummaryPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, taxResult, taxSuggestions, onboardingData, setCurrentStep } = useFiling();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data || !taxResult) { router.push("/filing/upload"); return; }
    setCurrentStep("summary");
  }, [isAuthenticated, isReady, form16Data, taxResult, router, setCurrentStep]);

  if (!form16Data || !taxResult) return null;

  const regime = taxResult.recommendedRegime;
  const totalTax = regime === "new" ? taxResult.totalTaxNew : taxResult.totalTaxOld;
  const refund = regime === "new" ? taxResult.refundNew : taxResult.refundOld;
  const taxableIncome = regime === "new" ? taxResult.taxableIncomeNew : taxResult.taxableIncomeOld;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Filing Summary</h1>
          <p className="text-muted mt-1">Your tax return is ready for e-filing</p>
        </div>
        <Badge variant="success">Ready to File</Badge>
      </div>

      {/* Success Banner */}
      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Your ITR-1 is Ready!</h2>
            <p className="text-blue-100">FY {onboardingData?.financialYear || "2024-25"} | AY 2025-26 | {regime === "new" ? "New" : "Old"} Regime</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-200 text-xs">Total Income</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(taxResult.totalIncome)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-200 text-xs">Taxable Income</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(taxableIncome)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-200 text-xs">Total Tax</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalTax)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-200 text-xs">{refund >= 0 ? "Expected Refund" : "Tax Due"}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(Math.abs(refund))}</p>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="bordered">
          <CardTitle>Income Summary</CardTitle>
          <div className="mt-4 space-y-3">
            <SummaryRow label="Gross Salary" value={formatCurrency(taxResult.grossSalary)} />
            <SummaryRow label="Other Income" value={formatCurrency(taxResult.totalIncome - taxResult.grossSalary)} />
            <SummaryRow label="Total Income" value={formatCurrency(taxResult.totalIncome)} bold />
          </div>
        </Card>

        <Card variant="bordered">
          <CardTitle>Tax Breakdown</CardTitle>
          <div className="mt-4 space-y-3">
            <SummaryRow label="Income Tax" value={formatCurrency(regime === "new" ? taxResult.taxNewRegime : taxResult.taxOldRegime)} />
            <SummaryRow label="Cess (4%)" value={formatCurrency(regime === "new" ? taxResult.cessNew : taxResult.cessOld)} />
            <SummaryRow label="Total Tax" value={formatCurrency(totalTax)} bold />
            <SummaryRow label="TDS Paid" value={`-${formatCurrency(form16Data.tax.tdsDeducted)}`} green />
            <div className="pt-2 border-t border-border">
              <SummaryRow
                label={refund >= 0 ? "Refund" : "Tax Due"}
                value={formatCurrency(Math.abs(refund))}
                bold
                green={refund >= 0}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Refund Predictor */}
      {refund > 0 && (
        <Card variant="bordered" className="bg-emerald-50/50 border-emerald-200">
          <CardTitle>Tax Refund Predictor</CardTitle>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted">Expected Refund</p>
              <p className="text-2xl font-bold text-secondary">{formatCurrency(refund)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted">Processing Time</p>
              <p className="text-2xl font-bold">30-45 days</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted">Credit To</p>
              <p className="text-lg font-bold">Bank Account</p>
              <p className="text-xs text-muted">via ECS</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tax Saving Opportunities */}
      {taxSuggestions.length > 0 && (
        <Card variant="bordered">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Remaining Tax Saving Opportunities</CardTitle>
            <Link href="/filing/suggestions">
              <Button variant="ghost" size="sm">View Details</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {taxSuggestions.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted">Section {s.section}</p>
                </div>
                <span className="text-sm font-bold text-secondary">Save {formatCurrency(s.potentialSaving)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card variant="bordered">
        <CardTitle>Next Steps</CardTitle>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div className="flex-1">
              <p className="text-sm font-medium">Download your ITR form</p>
              <p className="text-xs text-muted">JSON format for uploading to Income Tax Portal</p>
            </div>
            <Button size="sm">Download JSON</Button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-muted text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div className="flex-1">
              <p className="text-sm font-medium">Upload to Income Tax Portal</p>
              <p className="text-xs text-muted">Visit incometax.gov.in and upload the JSON file</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open("https://www.incometax.gov.in", "_blank")}>
              Visit Portal
            </Button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-muted text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div className="flex-1">
              <p className="text-sm font-medium">e-Verify your return</p>
              <p className="text-xs text-muted">Using Aadhaar OTP, Net Banking, or DSC</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => { setCurrentStep("generate"); router.push("/filing/generate"); }}>
          Back
        </Button>
        <Link href="/dashboard">
          <Button>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${bold ? "font-semibold" : ""}`}>
      <span className={`text-sm ${bold ? "" : "text-muted"}`}>{label}</span>
      <span className={`text-sm font-mono ${green ? "text-secondary" : ""} ${bold ? "text-base" : ""}`}>{value}</span>
    </div>
  );
}
