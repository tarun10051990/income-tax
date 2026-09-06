"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

export default function ComputePage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, taxResult, computeTaxResult, setCurrentStep } = useFiling();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("compute");
    computeTaxResult();
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep, computeTaxResult]);

  if (!taxResult) return null;

  const better = taxResult.recommendedRegime;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Computation</h1>
        <p className="text-muted mt-1">Side-by-side comparison of Old vs New tax regime</p>
      </div>

      {/* Recommendation Banner */}
      <Card variant="bordered" className={`${better === "new" ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${better === "new" ? "bg-secondary/20" : "bg-primary/20"}`}>
            <svg className={`w-6 h-6 ${better === "new" ? "text-secondary" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {better === "new" ? "New" : "Old"} Tax Regime is Better for You
            </h3>
            <p className="text-sm text-muted">
              You save {formatCurrency(taxResult.savings)} by choosing the {better} regime
            </p>
          </div>
        </div>
      </Card>

      {/* Side-by-side Comparison Table */}
      <Card variant="bordered">
        <CardTitle>Detailed Comparison</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">Particulars</th>
                <th className="text-right py-3 px-4 font-semibold">
                  <div className="flex items-center justify-end gap-2">
                    Old Regime
                    {better === "old" && <Badge variant="success">Recommended</Badge>}
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-semibold">
                  <div className="flex items-center justify-end gap-2">
                    New Regime
                    {better === "new" && <Badge variant="success">Recommended</Badge>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <ComparisonRow label="Gross Salary" oldVal={taxResult.grossSalary} newVal={taxResult.grossSalary} />
              <ComparisonRow label="Total Income" oldVal={taxResult.totalIncome} newVal={taxResult.totalIncome} />
              <ComparisonRow label="Total Deductions" oldVal={taxResult.deductionsOld} newVal={taxResult.deductionsNew} isDeduction />
              <ComparisonRow label="Taxable Income" oldVal={taxResult.taxableIncomeOld} newVal={taxResult.taxableIncomeNew} highlight />
              <ComparisonRow label="Income Tax" oldVal={taxResult.taxOldRegime} newVal={taxResult.taxNewRegime} />
              <ComparisonRow label="Health & Education Cess (4%)" oldVal={taxResult.cessOld} newVal={taxResult.cessNew} />
              <ComparisonRow label="Total Tax Payable" oldVal={taxResult.totalTaxOld} newVal={taxResult.totalTaxNew} highlight bold />
              <ComparisonRow label="TDS Already Paid" oldVal={form16Data?.tax.tdsDeducted || 0} newVal={form16Data?.tax.tdsDeducted || 0} isDeduction />
              <tr className={`font-bold text-base ${taxResult.refundOld > 0 || taxResult.refundNew > 0 ? "text-secondary" : "text-danger"}`}>
                <td className="py-3 px-4">
                  {taxResult.refundOld > 0 || taxResult.refundNew > 0 ? "Refund" : "Tax Due"}
                </td>
                <td className={`py-3 px-4 text-right font-mono ${better === "old" ? "bg-emerald-50" : ""}`}>
                  {taxResult.refundOld >= 0 ? formatCurrency(taxResult.refundOld) : formatCurrency(Math.abs(taxResult.refundOld))}
                </td>
                <td className={`py-3 px-4 text-right font-mono ${better === "new" ? "bg-emerald-50" : ""}`}>
                  {taxResult.refundNew >= 0 ? formatCurrency(taxResult.refundNew) : formatCurrency(Math.abs(taxResult.refundNew))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tax Slabs Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="bordered">
          <CardTitle>Old Regime Tax Slabs</CardTitle>
          <div className="mt-4 space-y-2">
            {[
              { range: "Up to Rs. 2,50,000", rate: "Nil" },
              { range: "Rs. 2,50,001 - 5,00,000", rate: "5%" },
              { range: "Rs. 5,00,001 - 10,00,000", rate: "20%" },
              { range: "Above Rs. 10,00,000", rate: "30%" },
            ].map((slab) => (
              <div key={slab.range} className="flex justify-between items-center text-sm py-1">
                <span className="text-muted">{slab.range}</span>
                <span className="font-medium">{slab.rate}</span>
              </div>
            ))}
            <p className="text-xs text-muted pt-2">Rebate u/s 87A if taxable income ≤ Rs. 5,00,000</p>
          </div>
        </Card>

        <Card variant="bordered">
          <CardTitle>New Regime Tax Slabs (FY 2024-25)</CardTitle>
          <div className="mt-4 space-y-2">
            {[
              { range: "Up to Rs. 3,00,000", rate: "Nil" },
              { range: "Rs. 3,00,001 - 7,00,000", rate: "5%" },
              { range: "Rs. 7,00,001 - 10,00,000", rate: "10%" },
              { range: "Rs. 10,00,001 - 12,00,000", rate: "15%" },
              { range: "Rs. 12,00,001 - 15,00,000", rate: "20%" },
              { range: "Above Rs. 15,00,000", rate: "30%" },
            ].map((slab) => (
              <div key={slab.range} className="flex justify-between items-center text-sm py-1">
                <span className="text-muted">{slab.range}</span>
                <span className="font-medium">{slab.rate}</span>
              </div>
            ))}
            <p className="text-xs text-muted pt-2">Rebate u/s 87A if taxable income ≤ Rs. 7,00,000</p>
          </div>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => { setCurrentStep("additional_income"); router.push("/filing/income"); }}>
          Back
        </Button>
        <Button onClick={() => { setCurrentStep("suggestions"); router.push("/filing/suggestions"); }}>
          View Tax-Saving Tips
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

function ComparisonRow({
  label, oldVal, newVal, isDeduction, highlight, bold,
}: {
  label: string; oldVal: number; newVal: number;
  isDeduction?: boolean; highlight?: boolean; bold?: boolean;
}) {
  return (
    <tr className={`${highlight ? "bg-gray-50" : ""} ${bold ? "font-semibold" : ""}`}>
      <td className="py-3 px-4">{label}</td>
      <td className={`py-3 px-4 text-right font-mono ${isDeduction ? "text-secondary" : ""}`}>
        {isDeduction && "-"}{formatCurrency(oldVal)}
      </td>
      <td className={`py-3 px-4 text-right font-mono ${isDeduction ? "text-secondary" : ""}`}>
        {isDeduction && "-"}{formatCurrency(newVal)}
      </td>
    </tr>
  );
}
