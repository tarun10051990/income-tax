"use client";

import { useState } from "react";
import FySelect from "@/components/finance/FySelect";
import Kpi from "@/components/finance/Kpi";
import TrackingTable from "@/components/finance/TrackingTable";
import { useApiData } from "@/hooks/useApiData";
import { financeApi } from "@/lib/finance-api";

export default function TaxTrackingPage() {
  const [fy, setFy] = useState("");
  const years = useApiData(() => financeApi.financialYears());
  const tracking = useApiData(() => financeApi.tracking(fy || undefined), [fy]);
  const rows = tracking.data ?? [];
  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + pick(r), 0);

  return (
    <div className="space-y-6">
      <FySelect years={years.data ?? []} value={fy} onChange={setFy} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total liability" value={sum((r) => r.liability)} />
        <Kpi label="Paid (verified)" value={sum((r) => r.verifiedPaid)} tone="success" />
        <Kpi label="Outstanding" value={sum((r) => r.outstanding)} tone={sum((r) => r.outstanding) ? "warning" : "default"} />
        <Kpi label="Overdue" value={rows.filter((r) => r.paymentStatus === "OVERDUE").reduce((s, r) => s + r.outstanding, 0)} tone="danger" />
      </div>
      <TrackingTable rows={rows} error={tracking.error} />
    </div>
  );
}
