"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import DataTable from "@/components/platform/DataTable";
import StatusBadge from "@/components/platform/StatusBadge";
import FySelect from "@/components/finance/FySelect";
import Kpi from "@/components/finance/Kpi";
import { useApiData } from "@/hooks/useApiData";
import { financeApi } from "@/lib/finance-api";
import { RefundView, labelize } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";

export default function RefundsPage() {
  const [fy, setFy] = useState("");
  const years = useApiData(() => financeApi.financialYears());
  const refunds = useApiData(() => financeApi.refunds(fy || undefined), [fy]);
  const rows = refunds.data ?? [];
  const claimed = rows.reduce((s, r) => s + r.amountClaimed, 0);
  const received = rows.reduce((s, r) => s + r.amountReceived, 0);
  const inProgress = rows.filter((r) => r.status === "CLAIMED" || r.status === "PROCESSING").length;

  return (
    <div className="space-y-6">
      <FySelect years={years.data ?? []} value={fy} onChange={setFy} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Refund claimed" value={claimed} />
        <Kpi label="Refund received" value={received} tone="success" />
        <Kpi label="In progress" value={inProgress} kind="count" hint="Claimed or processing with the department" />
      </div>
      <Card variant="bordered">
        <CardTitle>Refunds</CardTitle>
        <CardDescription>Created automatically when a filed return shows tax paid above liability; status is updated by our team.</CardDescription>
        {refunds.error && <p className="text-sm text-danger mt-2">{refunds.error}</p>}
        <DataTable<RefundView>
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No refunds due or claimed."
          columns={[
            { header: "FY / AY", cell: (r) => `${r.financialYear} / ${r.assessmentYear}` },
            { header: "Tax", cell: (r) => labelize(r.taxType) },
            { header: "Claimed", align: "right", cell: (r) => formatCurrency(r.amountClaimed) },
            { header: "Received", align: "right", cell: (r) => formatCurrency(r.amountReceived) },
            { header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.referenceNumber ?? "-"}</span> },
            { header: "Claimed on", cell: (r) => r.claimedOn ?? "-" },
            { header: "Received on", cell: (r) => r.receivedOn ?? "-" },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            { header: "Notes", cell: (r) => <span className="text-xs text-muted">{r.notes ?? ""}</span> },
          ]}
        />
      </Card>
    </div>
  );
}
