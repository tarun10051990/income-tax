"use client";

import Link from "next/link";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/platform/DataTable";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { CaseSummary } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

const HIGHLIGHTED_KEYS = ["total", "UNDER_REVIEW", "QUERY_RAISED", "READY_FOR_FILING", "FILED", "COMPLETED"];

function KpiGrid({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = HIGHLIGHTED_KEYS
    .filter((key) => counts[key] !== undefined)
    .map((key) => [key, counts[key]] as const);
  const extra = Object.entries(counts).filter(([key]) => !HIGHLIGHTED_KEYS.includes(key));

  return (
    <Card variant="bordered">
      <CardTitle>{title}</CardTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        {[...entries, ...extra].map(([key, value]) => (
          <div key={key}>
            <p className="text-xs uppercase tracking-wide text-muted">{humanise(`${key}`)}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const dashboard = useApiData(() => adminApi.dashboard());
  const integration = useApiData(() => adminApi.integrationStatus());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Operations overview</h1>
        <p className="text-sm text-muted">Income tax and GST workload, deadlines and fee collection.</p>
      </div>

      {dashboard.error !== null && <p className="text-sm text-danger">{dashboard.error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <KpiGrid title="Income tax" counts={dashboard.data?.incomeTaxKpis ?? {}} />
        <KpiGrid title="GST" counts={dashboard.data?.gstKpis ?? {}} />
      </div>

      <Card variant="bordered">
        <CardTitle>Professional fees</CardTitle>
        <CardDescription>Service fees invoiced by the practice; government tax payable is tracked per case.</CardDescription>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {Object.entries(dashboard.data?.revenue ?? {}).map(([key, value]) => (
            <div key={key}>
              <p className="text-xs uppercase tracking-wide text-muted">{humanise(key)}</p>
              <p className="text-xl font-semibold">{formatCurrency(value)}</p>
            </div>
          ))}
          {Object.keys(dashboard.data?.revenue ?? {}).length === 0 && (
            <p className="text-sm text-muted">No fees invoiced yet.</p>
          )}
        </div>
      </Card>

      <Card variant="bordered">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Government filing integration</CardTitle>
            <CardDescription>
              Where no adapter is configured, cases stop at ready for filing and an operator records the
              acknowledgement returned by the portal.
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          {Object.entries(integration.data ?? {}).map(([taxType, configured]) => (
            <Badge key={taxType} variant={configured ? "success" : "warning"}>
              {humanise(taxType)}: {configured ? "adapter configured" : "manual filing"}
            </Badge>
          ))}
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>Upcoming deadlines</CardTitle>
        <DataTable<CaseSummary>
          rows={dashboard.data?.upcomingDeadlines ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No deadlines in the next 30 days."
          columns={[
            {
              header: "Case",
              cell: (row) => (
                <Link className="text-primary hover:underline" href={`/admin/cases/${row.id}`}>{row.caseNumber}</Link>
              ),
            },
            { header: "Taxpayer", cell: (row) => row.customer?.name ?? "-" },
            { header: "Type", cell: (row) => humanise(row.taxType) },
            { header: "Return", cell: (row) => humanise(row.returnType ?? "-") },
            { header: "Due", cell: (row) => row.dueDate ?? "-" },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </Card>
    </div>
  );
}
