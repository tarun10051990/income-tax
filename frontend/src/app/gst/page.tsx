"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import DataTable from "@/components/platform/DataTable";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";
import { CaseSummary } from "@/lib/platform-types";

export default function GstOverviewPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const profiles = useApiData(() => customerApi.gstProfiles());
  const filings = useApiData(() => customerApi.cases({ taxType: "GST" }));

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">GST</h1>
          <p className="text-sm text-muted">
            Registrations, invoice books, reconciliation against the portal, and monthly returns.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/gst/profile"><Button variant="outline">Registrations</Button></Link>
          <Link href="/gst/returns"><Button>Prepare a return</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="bordered">
          <CardTitle>Registrations</CardTitle>
          <p className="text-3xl font-semibold mt-2">{profiles.data?.length ?? 0}</p>
          <CardDescription>GSTINs available for filing</CardDescription>
        </Card>
        <Card variant="bordered">
          <CardTitle>Returns in progress</CardTitle>
          <p className="text-3xl font-semibold mt-2">
            {filings.data?.content.filter((filing) => filing.status !== "COMPLETED").length ?? 0}
          </p>
          <CardDescription>Not yet completed</CardDescription>
        </Card>
        <Card variant="bordered">
          <CardTitle>Returns filed</CardTitle>
          <p className="text-3xl font-semibold mt-2">
            {filings.data?.content.filter((filing) => filing.status === "COMPLETED"
              || filing.status === "FILED"
              || filing.status === "ACKNOWLEDGEMENT_RECEIVED").length ?? 0}
          </p>
          <CardDescription>Filed or acknowledged</CardDescription>
        </Card>
      </div>

      <Card variant="bordered">
        <CardTitle>Your GST returns</CardTitle>
        {filings.error !== null && <p className="text-sm text-danger mt-2">{filings.error}</p>}
        {filings.isLoading ? (
          <p className="text-sm text-muted py-6">Loading…</p>
        ) : (
          <DataTable<CaseSummary>
            rows={filings.data?.content ?? []}
            rowKey={(row) => row.id}
            emptyMessage="No GST returns yet. Start one from the returns page."
            columns={[
              { header: "Case", cell: (row) => <span className="font-medium">{row.caseNumber}</span> },
              { header: "Return", cell: (row) => humanise(row.returnType ?? "-") },
              { header: "Period", cell: (row) => row.period ?? "-" },
              { header: "Due", cell: (row) => row.dueDate ?? "-" },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: "",
                align: "right",
                cell: (row) => (
                  <Link className="text-primary hover:underline" href={`/gst/invoices?case=${row.id}`}>
                    Open
                  </Link>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
