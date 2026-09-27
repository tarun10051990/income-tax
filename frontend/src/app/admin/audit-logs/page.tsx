"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import DataTable from "@/components/platform/DataTable";
import { useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { AuditView } from "@/lib/platform-types";

export default function AdminAuditLogsPage() {
  const [filters, setFilters] = useState({ action: "", entityType: "", entityId: "" });
  const logs = useApiData(
    () => adminApi.auditLogs({ ...filters, size: 100 }),
    [filters.action, filters.entityType, filters.entityId],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit trail</h1>
        <p className="text-sm text-muted">
          Append only record of who did what, with the before and after values. Entries cannot be edited or deleted
          through the application.
        </p>
      </div>

      <Card variant="bordered">
        <CardTitle>Filter</CardTitle>
        <CardDescription>Newest first.</CardDescription>
        <div className="grid gap-4 md:grid-cols-3 mt-3">
          <Input
            label="Action"
            placeholder="CASE_TRANSITIONED"
            value={filters.action}
            onChange={(event) => setFilters({ ...filters, action: event.target.value })}
          />
          <Input
            label="Entity type"
            placeholder="FilingCase"
            value={filters.entityType}
            onChange={(event) => setFilters({ ...filters, entityType: event.target.value })}
          />
          <Input
            label="Entity id"
            value={filters.entityId}
            onChange={(event) => setFilters({ ...filters, entityId: event.target.value })}
          />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>Entries</CardTitle>
        {logs.error !== null && <p className="text-sm text-danger mt-2">{logs.error}</p>}
        <DataTable<AuditView>
          rows={logs.data?.content ?? []}
          rowKey={(row) => row.id}
          emptyMessage={logs.isLoading ? "Loading…" : "No entries matched."}
          columns={[
            { header: "When", cell: (row) => new Date(row.createdAt).toLocaleString("en-IN") },
            { header: "Actor", cell: (row) => row.actorEmail ?? "System" },
            { header: "Role", cell: (row) => row.actorRole ?? "-" },
            { header: "Action", cell: (row) => <span className="font-mono text-xs">{row.action}</span> },
            { header: "Entity", cell: (row) => `${row.entityType ?? "-"} ${row.entityId ?? ""}`.trim() },
            { header: "Before", cell: (row) => <span className="text-xs">{row.oldValue ?? "-"}</span> },
            { header: "After", cell: (row) => <span className="text-xs">{row.newValue ?? "-"}</span> },
            { header: "IP", cell: (row) => row.ipAddress ?? "-" },
          ]}
        />
      </Card>
    </div>
  );
}
