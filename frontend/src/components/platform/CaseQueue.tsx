"use client";

import Link from "next/link";
import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import DataTable from "@/components/platform/DataTable";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { CaseSummary, TaxType } from "@/lib/platform-types";

/** Named buckets keep the queue URLs readable: /admin/gst/review rather than a status list. */
export const BUCKETS: Record<string, { label: string; statuses: string[] }> = {
  queue: {
    label: "All work in progress",
    statuses: [
      "DRAFT", "DATA_PENDING", "DOCUMENTS_PENDING", "DATA_IMPORTED", "RECONCILIATION_PENDING",
      "RECONCILIATION_COMPLETED", "UNDER_REVIEW", "QUERY_RAISED", "USER_ACTION_REQUIRED", "APPROVED",
      "READY_FOR_FILING",
    ],
  },
  review: { label: "Awaiting review", statuses: ["UNDER_REVIEW", "APPROVED"] },
  queries: { label: "Waiting on the taxpayer", statuses: ["QUERY_RAISED", "USER_ACTION_REQUIRED"] },
  "ready-for-filing": { label: "Ready for filing", statuses: ["READY_FOR_FILING"] },
  filed: { label: "Filed and verification", statuses: ["FILED", "VERIFICATION_PENDING", "VERIFIED", "ACKNOWLEDGEMENT_RECEIVED"] },
  completed: { label: "Completed", statuses: ["COMPLETED"] },
  rejected: { label: "Rejected", statuses: ["REJECTED"] },
};

interface CaseQueueProps {
  taxType: TaxType;
  bucket: string;
  basePath: string;
}

export default function CaseQueue({ taxType, bucket, basePath }: CaseQueueProps) {
  const definition = BUCKETS[bucket] ?? BUCKETS.queue;
  const [search, setSearch] = useState("");
  const cases = useApiData(
    () => adminApi.cases({ taxType, status: definition.statuses.join(","), query: search, size: 50 }),
    [taxType, bucket, search],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {taxType === "GST" ? "GST" : "Income tax"} · {definition.label}
        </h1>
        <p className="text-sm text-muted">
          Only cases within your assignment scope are listed; professionals see their own tax type.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(BUCKETS).map(([key, value]) => (
          <Link
            key={key}
            href={`${basePath}/${key}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              key === bucket ? "border-primary text-primary bg-primary/5" : "border-border text-muted hover:bg-gray-50"
            }`}
          >
            {value.label}
          </Link>
        ))}
      </div>

      <Card variant="bordered">
        <CardTitle>Cases</CardTitle>
        <CardDescription>Search by case number, taxpayer name or period.</CardDescription>
        <div className="max-w-sm mt-3">
          <Input
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {cases.error !== null && <p className="text-sm text-danger mt-3">{cases.error}</p>}
        <div className="mt-4">
          <DataTable<CaseSummary>
            rows={cases.data?.content ?? []}
            rowKey={(row) => row.id}
            emptyMessage={cases.isLoading ? "Loading…" : "Nothing in this bucket."}
            columns={[
              {
                header: "Case",
                cell: (row) => (
                  <Link className="text-primary hover:underline" href={`/admin/cases/${row.id}`}>
                    {row.caseNumber}
                  </Link>
                ),
              },
              { header: "Taxpayer", cell: (row) => row.customer?.name ?? "-" },
              { header: "Return", cell: (row) => humanise(row.returnType ?? "-") },
              { header: "Period", cell: (row) => row.period ?? row.financialYear ?? "-" },
              { header: "Due", cell: (row) => row.dueDate ?? "-" },
              { header: "Priority", cell: (row) => <StatusBadge status={row.priority} /> },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              { header: "Assignee", cell: (row) => row.assignedTo?.name ?? "Unassigned" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
