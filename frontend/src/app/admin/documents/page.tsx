"use client";

import Link from "next/link";
import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/platform/DataTable";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { DocumentView } from "@/lib/platform-types";

const STATUSES = ["UPLOADED", "VERIFIED", "REJECTED", "EXPIRED", "SUPERSEDED"];

export default function AdminDocumentsPage() {
  const [status, setStatus] = useState("UPLOADED");
  const documents = useApiData(() => adminApi.documentsByStatus({ status }), [status]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const decide = async (documentId: string, approve: boolean) => {
    setFeedback(null);
    try {
      await adminApi.verifyDocument(documentId, {
        approve,
        reason: approve ? undefined : "Document is not legible or does not match the case",
      });
      documents.reload();
    } catch (cause) {
      setFeedback(errorMessage(cause));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Document verification</h1>
        <p className="text-sm text-muted">
          Uploads are only served to the taxpayer and staff who may read the case. Files flagged by the scanner are
          never released.
        </p>
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
      {documents.error !== null && <p className="text-sm text-danger">{documents.error}</p>}

      <Card variant="bordered">
        <CardTitle>Documents</CardTitle>
        <CardDescription>Verify or reject; the taxpayer is notified either way.</CardDescription>
        <div className="mt-4">
          <DataTable<DocumentView>
            rows={documents.data?.content ?? []}
            rowKey={(row) => row.id}
            emptyMessage={documents.isLoading ? "Loading…" : "Nothing here."}
            columns={[
              { header: "File", cell: (row) => row.fileName },
              { header: "Taxpayer", cell: (row) => row.ownerName ?? "-" },
              {
                header: "Case",
                cell: (row) => (row.caseId === null ? "-" : (
                  <Link className="text-primary hover:underline" href={`/admin/cases/${row.caseId}`}>
                    {row.caseNumber}
                  </Link>
                )),
              },
              { header: "Category", cell: (row) => humanise(row.category) },
              { header: "Version", cell: (row) => `v${row.versionNumber}` },
              {
                header: "Scan",
                cell: (row) => (
                  <Badge variant={row.scanStatus === "CLEAN" ? "success" : row.scanStatus === "INFECTED" ? "danger" : "warning"}>
                    {humanise(row.scanStatus)}
                  </Badge>
                ),
              },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: "",
                align: "right",
                cell: (row) => (row.status !== "UPLOADED" ? null : (
                  <span className="flex gap-2 justify-end">
                    <button className="text-primary hover:underline" onClick={() => decide(row.id, true)}>Verify</button>
                    <button className="text-danger hover:underline" onClick={() => decide(row.id, false)}>Reject</button>
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
