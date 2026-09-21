"use client";

import Link from "next/link";
import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import DataTable from "@/components/platform/DataTable";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { QueryView } from "@/lib/platform-types";

const STATUSES = ["RESPONDED", "OPEN", "ACCEPTED", "REJECTED", "CLOSED"] as const;

export default function AdminQueriesPage() {
  const [status, setStatus] = useState("RESPONDED");
  const queries = useApiData(() => adminApi.queriesByStatus({ status }), [status]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const decide = async (queryId: string, accept: boolean) => {
    setFeedback(null);
    try {
      await adminApi.reviewQuery(queryId, {
        accept,
        note: accept ? undefined : "The answer does not address the question; please add more detail",
      });
      queries.reload();
    } catch (cause) {
      setFeedback(errorMessage(cause));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Queries</h1>
        <p className="text-sm text-muted">Questions raised with taxpayers and the answers waiting on review.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((option) => (
          <button
            key={option}
            className={`rounded-full border px-3 py-1 text-sm ${
              option === status ? "border-primary text-primary bg-primary/5" : "border-border text-muted hover:bg-gray-50"
            }`}
            onClick={() => setStatus(option)}
          >
            {humanise(option)}
          </button>
        ))}
      </div>

      {feedback !== null && <p className="text-sm text-danger">{feedback}</p>}
      {queries.error !== null && <p className="text-sm text-danger">{queries.error}</p>}

      <Card variant="bordered">
        <CardTitle>Worklist</CardTitle>
        <CardDescription>Accepting a query closes it; sending it back asks the taxpayer for more.</CardDescription>
        <div className="mt-4">
          <DataTable<QueryView>
            rows={queries.data?.content ?? []}
            rowKey={(row) => row.id}
            emptyMessage={queries.isLoading ? "Loading…" : "Nothing in this state."}
            columns={[
              { header: "Number", cell: (row) => row.queryNumber },
              {
                header: "Case",
                cell: (row) => (
                  <Link className="text-primary hover:underline" href={`/admin/cases/${row.caseId}`}>
                    {row.caseNumber}
                  </Link>
                ),
              },
              { header: "Category", cell: (row) => humanise(row.category) },
              { header: "Question", cell: (row) => row.question },
              {
                header: "Latest answer",
                cell: (row) => row.responses[row.responses.length - 1]?.message ?? "No answer yet",
              },
              { header: "Priority", cell: (row) => <StatusBadge status={row.priority} /> },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: "",
                align: "right",
                cell: (row) => (row.status !== "RESPONDED" ? null : (
                  <span className="flex gap-2 justify-end">
                    <button className="text-primary hover:underline" onClick={() => decide(row.id, true)}>Accept</button>
                    <button className="text-danger hover:underline" onClick={() => decide(row.id, false)}>Send back</button>
                  </span>
                )),
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
