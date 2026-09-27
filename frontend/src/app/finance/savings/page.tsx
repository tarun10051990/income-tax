"use client";

import Link from "next/link";
import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import FySelect from "@/components/finance/FySelect";
import Kpi from "@/components/finance/Kpi";
import { useApiData } from "@/hooks/useApiData";
import { financeApi } from "@/lib/finance-api";
import { formatCurrency } from "@/lib/utils";

export default function TaxSavingsPage() {
  const [fy, setFy] = useState("");
  const years = useApiData(() => financeApi.financialYears());
  const savings = useApiData(() => financeApi.savings(fy || undefined), [fy]);
  const s = savings.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FySelect years={years.data ?? []} value={fy} onChange={setFy} allowAll={false} />
        {s && <p className="text-xs text-muted">FY {s.financialYear}</p>}
      </div>
      {savings.error && <p className="text-sm text-danger">{savings.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Tax-saving investment" value={s?.taxSavingInvested} hint={`of ${formatCurrency(s?.totalInvested ?? 0)} invested`} />
        <Kpi label="Eligible deduction" value={s?.eligibleDeduction} hint={`${formatCurrency(s?.verifiedEligibleDeduction ?? 0)} verified`} />
        <Kpi label="Estimated tax benefit" value={s?.estimatedTaxBenefit} estimate tone="success" hint={s ? `${Math.round(s.marginalRate * 100)}% + ${Math.round(s.cessRate * 100)}% cess · ${s.rateBasis}` : undefined} />
        <Kpi label="Actual tax saved" value={s?.actualTaxSaved} hint={s?.actualBasis} />
      </div>

      <Card variant="bordered">
        <CardTitle>Deductions by section</CardTitle>
        <CardDescription>Limits are the configured rules for this financial year; eligible amounts are capped at the limit.</CardDescription>
        <div className="mt-4 space-y-4">
          {(s?.sections ?? []).length === 0 && (
            <p className="text-sm text-muted">
              No tax-saving investments this year. <Link href="/finance/investments" className="text-primary">Add one</Link> with a deduction section.
            </p>
          )}
          {s?.sections.map((sec) => {
            const pct = sec.limit ? Math.min(100, Math.round((sec.eligible / sec.limit) * 100)) : 100;
            return (
              <div key={sec.section}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">Section {sec.section} <span className="text-xs text-muted">{sec.regimes.join(", ")} regime</span></span>
                  <span>
                    {formatCurrency(sec.eligible)}{sec.limit !== null && <span className="text-muted"> / {formatCurrency(sec.limit)}</span>}
                  </span>
                </div>
                <ProgressBar value={pct} className="mt-1" />
                <p className="mt-1 text-xs text-muted">
                  Invested {formatCurrency(sec.invested)} · verified {formatCurrency(sec.verifiedInvested)} · verified eligible {formatCurrency(sec.verifiedEligible)}
                  {sec.limit !== null && sec.eligible < sec.limit && ` · ${formatCurrency(sec.limit - sec.eligible)} headroom`}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {s && <p className="text-xs text-muted">{s.disclaimer}</p>}
    </div>
  );
}
