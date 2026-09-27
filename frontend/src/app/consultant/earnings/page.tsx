"use client";

import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import DataTable from "@/components/platform/DataTable";
import BookingTable from "@/components/marketplace/BookingTable";
import { useApiData } from "@/hooks/useApiData";
import { consultantApi } from "@/lib/marketplace-api";
import { PayoutView, formatDateTime } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

export default function ConsultantEarningsPage() {
  const router = useRouter();
  const dashboard = useApiData(() => consultantApi.dashboard());
  const payouts = useApiData(() => consultantApi.payouts());
  const past = useApiData(() => consultantApi.bookings("past"));
  const completed = (past.data?.content ?? []).filter((b) => b.status === "COMPLETED");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Earnings and payouts</h1>
        <p className="text-sm text-muted">Your earning on each consultation is the client&apos;s payment less the platform commission and taxes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card variant="bordered">
          <p className="text-xs uppercase tracking-wide text-muted">Total earned</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(Number(dashboard.data?.totalEarnings ?? 0))}</p>
        </Card>
        <Card variant="bordered">
          <p className="text-xs uppercase tracking-wide text-muted">Pending payout</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(Number(dashboard.data?.pendingEarnings ?? 0))}</p>
          <p className="text-xs text-muted">Completed consultations not yet settled</p>
        </Card>
        <Card variant="bordered">
          <p className="text-xs uppercase tracking-wide text-muted">Paid out</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(Number(dashboard.data?.paidOut ?? 0))}</p>
        </Card>
      </div>

      <Card variant="bordered">
        <CardTitle>Payouts</CardTitle>
        <CardDescription>Settlements to your bank account or UPI. Update details under Bank and settings.</CardDescription>
        <div className="mt-4">
          <DataTable<PayoutView>
            rows={payouts.data?.content ?? []}
            rowKey={(row) => row.id}
            emptyMessage="No payouts yet."
            columns={[
              { header: "Reference", cell: (row) => row.reference },
              { header: "Created", cell: (row) => formatDateTime(row.createdAt) },
              { header: "Consultations", cell: (row) => row.bookingCount },
              { header: "Gross", cell: (row) => formatCurrency(Number(row.grossAmount)) },
              { header: "Commission", cell: (row) => formatCurrency(Number(row.commissionAmount)) },
              { header: "Net paid", cell: (row) => <span className="font-medium">{formatCurrency(Number(row.netAmount))}</span> },
              {
                header: "Status",
                cell: (row) => (
                  <Badge variant={row.status === "PAID" ? "success" : row.status === "FAILED" ? "danger" : "warning"}>
                    {row.status}{row.paidAt ? ` · ${formatDateTime(row.paidAt)}` : ""}
                  </Badge>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>Completed consultations</CardTitle>
        <div className="mt-4">
          <BookingTable rows={completed} perspective="consultant" emptyMessage="No completed consultations yet." onRowClick={(b) => router.push(`/consultant/bookings/${b.id}`)} />
        </div>
      </Card>
    </div>
  );
}
