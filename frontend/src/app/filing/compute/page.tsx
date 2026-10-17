"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { usePortalText } from "@/components/filing/GuidedField";
import { RateBook, Regime, TaxLine, slabsFor } from "@/lib/tax-rates";

export default function ComputePage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, taxResult, plainSavings, computeTaxResult, setCurrentStep,
    serverResult, rateBook, ageGroup, computing, computeError } = useFiling();
  const t = usePortalText();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("compute");
    computeTaxResult();
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep, computeTaxResult]);

  if (computeError) {
    return (
      <Card variant="bordered" className="bg-red-50 border-red-200">
        <p className="text-sm text-red-700">{computeError}</p>
        <Button className="mt-3" size="sm" onClick={() => computeTaxResult()}>Try again</Button>
      </Card>
    );
  }
  if (!taxResult || !serverResult) {
    return computing ? <p className="text-muted">{t("itr.compute.loading")}</p> : null;
  }

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

      {plainSavings && (
        <Card variant="bordered" className="bg-amber-50 border-amber-200">
          <CardTitle>{t("itr.saved.title")}</CardTitle>
          <p className="mt-2 text-lg font-semibold">{plainSavings.headline}</p>
          <p className="mt-1 text-sm text-muted">{plainSavings.explain}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-white/70 p-3">
              <p className="text-xs text-muted">{t("itr.saved.without")}</p>
              <p className="font-mono font-semibold text-base">{formatCurrency(plainSavings.taxWithoutSavings)}</p>
            </div>
            <div className="rounded-lg bg-white/70 p-3">
              <p className="text-xs text-muted">{t("itr.saved.pay")}</p>
              <p className="font-mono font-semibold text-base">{formatCurrency(plainSavings.taxYouPay)}</p>
            </div>
            <div className="rounded-lg bg-emerald-100 p-3">
              <p className="text-xs text-emerald-800">{t("itr.saved.saved")}</p>
              <p className="font-mono font-semibold text-base text-emerald-800">{formatCurrency(plainSavings.taxSaved)}</p>
            </div>
          </div>
          {plainSavings.items.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("itr.saved.items")}</p>
              <ul className="mt-2 divide-y divide-amber-200 text-sm">
                {plainSavings.items.map((item) => (
                  <li key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2">
                    <span>{item.what}</span>
                    <span className="font-mono whitespace-nowrap">
                      {formatCurrency(item.amount)} <span className="text-muted">→ about {formatCurrency(item.taxCut)} less tax</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

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
              {taxResult.grossSalary > 0 && <ComparisonRow label="Gross Salary" oldVal={taxResult.grossSalary} newVal={taxResult.grossSalary} />}
              {taxResult.businessIncome > 0 && <ComparisonRow label="Business / professional profit" oldVal={taxResult.businessIncome} newVal={taxResult.businessIncome} />}
              <ComparisonRow label="Total Income" oldVal={taxResult.totalIncome} newVal={taxResult.totalIncome} />
              <ComparisonRow label="Total Deductions" oldVal={taxResult.deductionsOld} newVal={taxResult.deductionsNew} isDeduction />
              <ComparisonRow label="Taxable Income" oldVal={taxResult.taxableIncomeOld} newVal={taxResult.taxableIncomeNew} highlight />
              <ComparisonRow label="Tax at slab rates" oldVal={serverResult.oldRegime.slabTax} newVal={serverResult.newRegime.slabTax} />
              <ComparisonRow label="Tax at flat rates (shares, gains, crypto)" oldVal={serverResult.oldRegime.specialRateTax} newVal={serverResult.newRegime.specialRateTax} />
              <ComparisonRow label="Rebate u/s 87A" oldVal={serverResult.oldRegime.rebate87A} newVal={serverResult.newRegime.rebate87A} isDeduction />
              <ComparisonRow label="Surcharge" oldVal={serverResult.oldRegime.surcharge} newVal={serverResult.newRegime.surcharge} />
              <ComparisonRow label="Health & Education Cess (4%)" oldVal={taxResult.cessOld} newVal={taxResult.cessNew} />
              <ComparisonRow label="Total Tax Payable" oldVal={taxResult.totalTaxOld} newVal={taxResult.totalTaxNew} highlight bold />
              <ComparisonRow label="Tax already paid (TDS / advance tax)" oldVal={taxResult.taxPaid} newVal={taxResult.taxPaid} isDeduction />
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

      <Card variant="bordered">
        <CardTitle>{t("itr.compute.lines.title")}</CardTitle>
        <p className="text-sm text-muted mt-1">{t("itr.compute.lines.body")}</p>
        <LinesTable lines={(better === "old" ? serverResult.oldRegime : serverResult.newRegime).incomeLines} />
      </Card>

      {rateBook && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SlabCard title={`Old Regime Tax Slabs (FY ${rateBook.financialYear})`} book={rateBook} regime="OLD" age={ageGroup} />
          <SlabCard title={`New Regime Tax Slabs (FY ${rateBook.financialYear})`} book={rateBook} regime="NEW" age={ageGroup} />
        </div>
      )}

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

function LinesTable({ lines }: { lines: TaxLine[] }) {
  if (!lines.length) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 px-3 font-semibold">Income</th>
            <th className="py-2 px-3 font-semibold text-right">Amount</th>
            <th className="py-2 px-3 font-semibold text-right">Tax-free</th>
            <th className="py-2 px-3 font-semibold text-right">Tax</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((l) => (
            <tr key={l.code}>
              <td className="py-2 px-3">
                <p className="font-medium">{l.name}{l.section ? <span className="text-muted font-normal"> · sec {l.section}</span> : null}</p>
                {l.note && <p className="text-xs text-muted">{l.note}</p>}
              </td>
              <td className="py-2 px-3 text-right font-mono">{formatCurrency(l.amount)}</td>
              <td className="py-2 px-3 text-right font-mono text-secondary">{l.exemptAmount ? formatCurrency(l.exemptAmount) : "-"}</td>
              <td className="py-2 px-3 text-right font-mono">{formatCurrency(l.tax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted mt-2">Slab-rate tax is shared across those incomes in proportion; rebate, surcharge and 4% cess are applied on the total.</p>
    </div>
  );
}

function SlabCard({ title, book, regime, age }: { title: string; book: RateBook; regime: Regime; age: "BELOW_60" | "SENIOR" | "SUPER_SENIOR" }) {
  const setting = book.settings.find((s) => s.regime === regime);
  const rupees = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;
  return (
    <Card variant="bordered">
      <CardTitle>{title}</CardTitle>
      <div className="mt-4 space-y-2">
        {slabsFor(book, regime, age).map((s) => (
          <div key={s.id} className="flex justify-between items-center text-sm py-1">
            <span className="text-muted">{s.incomeTo === null ? `Above ${rupees(s.incomeFrom)}` : `${rupees(s.incomeFrom)} - ${rupees(s.incomeTo)}`}</span>
            <span className="font-medium">{s.rate === 0 ? "Nil" : `${+(s.rate * 100).toFixed(2)}%`}</span>
          </div>
        ))}
        {setting && (
          <p className="text-xs text-muted pt-2">
            Standard deduction {rupees(setting.standardDeduction)} · no tax (rebate u/s 87A) if income ≤ {rupees(setting.rebateIncomeLimit)}
          </p>
        )}
      </div>
    </Card>
  );
}
