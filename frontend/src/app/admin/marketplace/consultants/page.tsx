"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { MarketplaceStatus } from "@/components/marketplace/BookingTable";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import DataTable from "@/components/platform/DataTable";
import { useApiData } from "@/hooks/useApiData";
import { adminMarketplaceApi } from "@/lib/marketplace-api";
import { ConsultantPrivateView, formatDateTime } from "@/lib/marketplace-types";

const STATUSES = ["", "PENDING_VERIFICATION", "UNDER_REVIEW", "APPROVED", "ACTIVE", "SUSPENDED", "REJECTED"];

export default function AdminConsultantsPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const consultants = useApiData(
    () => adminMarketplaceApi.consultants({ status: status || undefined, q: q || undefined, page }),
    [status, q, page],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Consultants</h1>
        <p className="text-sm text-muted">Verify, approve, suspend and edit marketplace professionals.</p>
      </div>

      <Card variant="bordered">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input placeholder="Search by name, email, registration number or city" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          <select className="rounded-lg border border-border px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            {STATUSES.map((item) => <option key={item} value={item}>{item === "" ? "All statuses" : item.replaceAll("_", " ")}</option>)}
          </select>
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>{consultants.data?.totalElements ?? 0} consultants</CardTitle>
        <CardDescription>Click a row to open the profile and take a decision.</CardDescription>
        {consultants.error && <p className="mt-2 text-sm text-danger">{consultants.error}</p>}
        <div className="mt-4">
          <DataTable<ConsultantPrivateView>
            rows={consultants.data?.content ?? []}
            rowKey={(row) => row.profile.id}
            onRowClick={(row) => router.push(`/admin/marketplace/consultants/${row.profile.id}`)}
            emptyMessage={consultants.isLoading ? "Loading…" : "No consultants match."}
            columns={[
              { header: "Name", cell: (row) => <div><p className="font-medium">{row.profile.name}</p><p className="text-xs text-muted">{row.email}</p></div> },
              { header: "Type", cell: (row) => row.profile.professionalType },
              { header: "Registration", cell: (row) => row.profile.registrationNumber ?? "—" },
              { header: "Location", cell: (row) => [row.profile.city, row.profile.state].filter(Boolean).join(", ") || "—" },
              { header: "Experience", cell: (row) => `${row.profile.experienceYears} yrs` },
              { header: "Rating", cell: (row) => row.profile.averageRating != null ? `${Number(row.profile.averageRating).toFixed(1)} (${row.profile.reviewCount})` : "—" },
              { header: "Applied", cell: (row) => formatDateTime(row.createdAt) },
              {
                header: "Status",
                cell: (row) => (
                  <div className="flex flex-wrap gap-1">
                    <MarketplaceStatus status={row.status} />
                    {row.profile.verified && <Badge variant="success">Verified</Badge>}
                    {!row.accountActive && <Badge variant="danger">Login disabled</Badge>}
                  </div>
                ),
              },
            ]}
          />
        </div>
        {(consultants.data?.totalPages ?? 0) > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button type="button" className="underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-muted">Page {page + 1} of {consultants.data?.totalPages}</span>
            <button type="button" className="underline disabled:opacity-40" disabled={page + 1 >= (consultants.data?.totalPages ?? 0)} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </Card>
    </div>
  );
}
