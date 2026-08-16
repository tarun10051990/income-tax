"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/platform/DataTable";
import { useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { UserSummary } from "@/lib/platform-types";

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const customers = useApiData(() => adminApi.customers({ query: search, size: 50 }), [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Taxpayers</h1>
        <p className="text-sm text-muted">
          Contact details and PAN are masked in this list; full values are only shown where the case requires them.
        </p>
      </div>

      <Card variant="bordered">
        <CardTitle>Search</CardTitle>
        <CardDescription>By name, email or PAN.</CardDescription>
        <div className="max-w-sm mt-3">
          <Input placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {customers.error !== null && <p className="text-sm text-danger mt-3">{customers.error}</p>}
        <div className="mt-4">
          <DataTable<UserSummary>
            rows={customers.data?.content ?? []}
            rowKey={(row) => row.id}
            emptyMessage={customers.isLoading ? "Loading…" : "No taxpayers matched."}
            columns={[
              { header: "Name", cell: (row) => row.name },
              { header: "Email", cell: (row) => row.email },
              { header: "Phone", cell: (row) => row.phone ?? "-" },
              { header: "PAN", cell: (row) => <span className="font-mono">{row.pan ?? "-"}</span> },
              {
                header: "Account",
                cell: (row) => (
                  <Badge variant={row.active ? "success" : "danger"}>{row.active ? "Active" : "Disabled"}</Badge>
                ),
              },
              {
                header: "Last sign in",
                cell: (row) => (row.lastLoginAt === null ? "Never" : new Date(row.lastLoginAt).toLocaleString("en-IN")),
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
