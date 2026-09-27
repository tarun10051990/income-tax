"use client";

import Link from "next/link";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Kpi from "@/components/finance/Kpi";
import PeriodFilter, { periodReady } from "@/components/finance/PeriodFilter";
import { BreakdownChart, PairedBarChart, SeriesChart, findSeries } from "@/components/finance/TrendChart";
import { useApiData } from "@/hooks/useApiData";
import { adminFinanceApi } from "@/lib/finance-api";
import { PeriodQuery, labelize } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";

export default function AdminFinanceAnalyticsPage() {
  const [query, setQuery] = useState<PeriodQuery>({ period: "FY" });
  const years = useApiData(() => adminFinanceApi.financialYears());
  const analytics = useApiData(
    () => (periodReady(query) ? adminFinanceApi.analytics(query) : Promise.resolve(null)),
    [JSON.stringify(query)],
  );
  const a = analytics.data;
  const counts = a?.counts ?? {};
  const amounts = a?.amounts ?? {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financial analytics</h1>
        <p className="text-sm text-muted">Platform-wide figures computed from client records, filings and marketplace bookings.</p>
      </div>

      <Card variant="bordered" className="p-4">
        <PeriodFilter years={years.data ?? []} value={query} onChange={setQuery} allowAll />
        {a && <p className="mt-2 text-xs text-muted">Showing {a.period.label} ({a.period.from} to {a.period.to})</p>}
      </Card>
      {analytics.error && <p className="text-sm text-danger">{analytics.error}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Clients and filings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Total clients" value={counts.totalClients} kind="count" hint={`${counts.activeClients ?? 0} active · ${counts.newClients ?? 0} new in period`} />
          <Kpi label="ITRs" value={counts.totalItrs} kind="count" hint={`${counts.pendingItrs ?? 0} pending`} />
          <Kpi label="GST returns" value={counts.totalGstReturns} kind="count" hint={`${counts.pendingGstReturns ?? 0} pending`} />
          <Kpi label="Pending documents" value={counts.pendingDocuments} kind="count" hint="Uploaded, awaiting review" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Tax and investments</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Tax paid (verified)" value={amounts.totalTaxPaid} tone="success" hint={`${formatCurrency(amounts.unverifiedTaxPaid ?? 0)} unverified`} />
          <Kpi label="Tax liability" value={amounts.totalTaxLiability} hint={`Outstanding ${formatCurrency(amounts.totalOutstanding ?? Math.max(0, (amounts.totalTaxLiability ?? 0) - (amounts.totalTaxPaid ?? 0)))}`} />
          <Kpi label="Investments" value={amounts.totalInvestments} hint={`${counts.investments ?? 0} records`} />
          <Kpi label="Estimated tax saved" value={amounts.estimatedTaxSaved} estimate hint="Configured marginal rate on eligible deductions" />
          <Kpi label="Refunds received" value={amounts.totalRefunds} hint={`${formatCurrency(amounts.refundsClaimed ?? 0)} claimed`} />
          <Link href="/admin/finance/verification">
            <Kpi label="Verification queue" value={(counts.pendingInvestmentVerification ?? 0) + (counts.pendingPaymentVerification ?? 0)} kind="count" tone="warning" hint={`${counts.pendingInvestmentVerification ?? 0} investments · ${counts.pendingPaymentVerification ?? 0} payments`} />
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Marketplace</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Consultants" value={counts.totalConsultants} kind="count" hint={`${counts.verifiedConsultants ?? 0} verified · ${counts.pendingConsultantVerification ?? 0} pending`} />
          <Kpi label="Consultations" value={counts.totalConsultations} kind="count" />
          <Kpi label="Marketplace revenue" value={amounts.marketplaceRevenue} hint="Paid bookings (gross)" />
          <Kpi label="Platform commission" value={amounts.platformRevenue} tone="success" hint={`Consultant earnings ${formatCurrency(amounts.consultantEarnings ?? 0)}`} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SeriesChart title="Client growth" series={[findSeries(a?.series, "clientGrowth")]} kind="bar" values="count" />
        <SeriesChart title="Tax paid and saved" series={[findSeries(a?.series, "taxPaid"), findSeries(a?.series, "taxSaved")]} />
        <SeriesChart title="Investments" series={[findSeries(a?.series, "investment")]} />
        <SeriesChart title="Liability vs payment" series={[findSeries(a?.series, "liabilityVsPaid")]} kind="bar" />
        <PairedBarChart title="ITR trend" series={findSeries(a?.series, "itrFiling")} suffixes={["started", "filed"]} values="count" />
        <PairedBarChart title="GST trend" series={findSeries(a?.series, "gstFiling")} suffixes={["started", "filed"]} values="count" />
        <SeriesChart title="Marketplace revenue" series={[findSeries(a?.series, "marketplaceRevenue"), findSeries(a?.series, "platformRevenue"), findSeries(a?.series, "consultantEarnings")]} />
        <SeriesChart title="Consultations" series={[findSeries(a?.series, "consultations")]} kind="bar" values="count" />
        <BreakdownChart title="Consultants by type" data={a?.consultantTypes} values="count" labelize={labelize} />
      </div>
    </div>
  );
}
