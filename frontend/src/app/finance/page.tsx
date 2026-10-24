"use client";

import Link from "next/link";
import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import DataTable from "@/components/platform/DataTable";
import StatusBadge from "@/components/platform/StatusBadge";
import Kpi from "@/components/finance/Kpi";
import PeriodFilter, { periodReady } from "@/components/finance/PeriodFilter";
import { BreakdownChart, PairedBarChart, SeriesChart, findSeries } from "@/components/finance/TrendChart";
import { useApiData } from "@/hooks/useApiData";
import { financeApi } from "@/lib/finance-api";
import { PeriodQuery, TrackingRow, labelize } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";

export default function FinanceOverviewPage() {
  const [query, setQuery] = useState<PeriodQuery>({ period: "FY" });
  const years = useApiData(() => financeApi.financialYears());
  const dashboard = useApiData(
    () => (periodReady(query) ? financeApi.dashboard(query) : Promise.resolve(null)),
    [JSON.stringify(query)],
  );
  const d = dashboard.data;
  const amounts = d?.amounts ?? {};
  const counts = d?.counts ?? {};

  return (
    <div className="space-y-6">
      <Card variant="bordered" className="p-4">
        <PeriodFilter years={years.data ?? []} value={query} onChange={setQuery} />
        {d && <p className="mt-2 text-xs text-muted">Showing {d.period.label} ({d.period.from} to {d.period.to})</p>}
      </Card>

      {dashboard.error && <p className="text-sm text-danger">{dashboard.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total investment" value={amounts.totalInvestment} hint={`${counts.investments ?? 0} records · ${counts.pendingInvestments ?? 0} awaiting verification`} />
        <Kpi label="Tax paid (verified)" value={amounts.totalTaxPaid} tone="success" hint={amounts.unverifiedTaxPaid ? `${formatCurrency(amounts.unverifiedTaxPaid)} unverified` : "All entries verified"} />
        <Kpi label="Tax liability" value={amounts.totalTaxLiability} hint="From filed computations and staff entries" />
        <Kpi label="Tax payable" value={amounts.taxPayable} tone={amounts.taxPayable ? "warning" : "default"} hint={`Pending ${formatCurrency(amounts.pendingTax ?? 0)} past due`} />
        <Kpi label="Tax filed" value={amounts.totalTaxFiled} hint={`${counts.itrFiled ?? 0} ITR · ${counts.gstFiled ?? 0} GST filed`} />
        <Kpi label="Estimated tax benefit" value={amounts.estimatedTaxSaved} estimate tone="success" hint="Based on configured deduction limits" />
        <Kpi label="Actual tax saved" value={amounts.actualTaxSaved} hint="From your filed computation, if any" />
        <Kpi label="Refunds received" value={amounts.totalTaxRefund} hint={`${formatCurrency(amounts.refundClaimed ?? 0)} claimed`} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="bordered" className="p-4">
          <CardTitle className="text-sm">ITR status</CardTitle>
          <div className="mt-2"><StatusBadge status={d?.itrStatus ?? "NOT_FILED"} /></div>
          <CardDescription><Link href="/filing/upload" className="text-primary">Go to filing</Link></CardDescription>
        </Card>
        <Card variant="bordered" className="p-4">
          <CardTitle className="text-sm">GST status</CardTitle>
          <div className="mt-2"><StatusBadge status={d?.gstStatus ?? "NOT_FILED"} /></div>
          <CardDescription><Link href="/gst" className="text-primary">Go to GST</Link></CardDescription>
        </Card>
        <Card variant="bordered" className="p-4">
          <CardTitle className="text-sm">Pending documents</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{counts.pendingDocuments ?? 0}</p>
          <CardDescription>Uploaded documents awaiting review</CardDescription>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SeriesChart title="Investment trend" series={[findSeries(d?.series, "investment"), findSeries(d?.series, "taxSavingInvestment")]} />
        <SeriesChart title="Tax paid trend" description="Verified payments only" series={[findSeries(d?.series, "taxPaid")]} kind="bar" />
        <SeriesChart title="Estimated tax saved" description="Estimate from eligible deductions in the period" series={[findSeries(d?.series, "taxSaved")]} />
        <PairedBarChart title="Tax liability vs payment" series={findSeries(d?.series, "liabilityVsPaid")} suffixes={["liability", "paid"]} />
        <PairedBarChart title="ITR filing progress" series={findSeries(d?.series, "itrFiling")} suffixes={["started", "filed"]} values="count" />
        <PairedBarChart title="GST filing progress" series={findSeries(d?.series, "gstFiling")} suffixes={["started", "filed"]} values="count" />
        <BreakdownChart title="Tax paid by type" series={findSeries(d?.series, "taxPaidByType")} labelize={labelize} />
        <BreakdownChart title="Refunds by status" series={findSeries(d?.series, "refunds")} labelize={labelize} />
      </div>

      <Card variant="bordered">
        <CardTitle>Position by financial year</CardTitle>
        <CardDescription>Outstanding = liability − verified payments. <Link href="/finance/tracking" className="text-primary">Full tracking</Link></CardDescription>
        <DataTable<TrackingRow>
          rows={d?.tracking ?? []}
          rowKey={(r) => `${r.financialYear}-${r.taxType}`}
          emptyMessage="No liabilities or payments recorded in this period."
          columns={[
            { header: "FY", cell: (r) => r.financialYear },
            { header: "Tax", cell: (r) => labelize(r.taxType) },
            { header: "Liability", align: "right", cell: (r) => formatCurrency(r.liability) },
            { header: "Paid", align: "right", cell: (r) => formatCurrency(r.verifiedPaid) },
            { header: "Outstanding", align: "right", cell: (r) => formatCurrency(r.outstanding) },
            { header: "Status", cell: (r) => <StatusBadge status={r.paymentStatus} /> },
          ]}
        />
      </Card>
    </div>
  );
}
