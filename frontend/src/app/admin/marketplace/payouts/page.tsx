"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import DataTable from "@/components/platform/DataTable";
import { MarketplaceStatus } from "@/components/marketplace/BookingTable";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminMarketplaceApi } from "@/lib/marketplace-api";
import { PayoutView, formatDateTime } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

export default function AdminPayoutsPage() {
  return (
    <Suspense fallback={null}>
      <Payouts />
    </Suspense>
  );
}

function Payouts() {
  const consultantId = useSearchParams().get("consultantId") ?? undefined;
  const payouts = useApiData(() => adminMarketplaceApi.payouts({ consultantId }), [consultantId]);
  const [settling, setSettling] = useState<PayoutView | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = payouts.data?.content ?? [];
  const pending = rows.filter((p) => p.status !== "PAID").reduce((sum, p) => sum + Number(p.netAmount), 0);
  const paid = rows.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.netAmount), 0);

  const settle = async () => {
    if (!settling) return;
    setBusy(true);
    setError(null);
    try {
      await adminMarketplaceApi.settlePayout(settling.id, reference.trim());
      setSettling(null);
      setReference("");
      payouts.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Consultant payouts</h1>
        <p className="text-sm text-muted">
          Payouts are generated per consultant from completed, unsettled consultations (net of platform commission). Generate one from a consultant&apos;s{" "}
          <Link href="/admin/marketplace/consultants" className="underline">profile page</Link>, then mark it paid with the bank/UPI reference.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="bordered"><p className="text-xs uppercase tracking-wide text-muted">Awaiting settlement</p><p className="text-2xl font-semibold">{formatCurrency(pending)}</p></Card>
        <Card variant="bordered"><p className="text-xs uppercase tracking-wide text-muted">Settled (listed)</p><p className="text-2xl font-semibold">{formatCurrency(paid)}</p></Card>
      </div>

      {settling && (
        <Card variant="elevated">
          <CardTitle>Settle {settling.reference}</CardTitle>
          <CardDescription>{settling.consultantName} · {formatCurrency(Number(settling.netAmount))} net for {settling.bookingCount} consultation(s).</CardDescription>
          <div className="mt-3 flex flex-wrap gap-2 items-end">
            <Input label="Bank / UPI transaction reference" value={reference} onChange={(e) => setReference(e.target.value)} className="min-w-72" />
            <Button loading={busy} disabled={reference.trim().length < 4} onClick={() => void settle()}>Mark as paid</Button>
            <Button variant="ghost" onClick={() => setSettling(null)}>Cancel</Button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </Card>
      )}

      <Card variant="bordered">
        {payouts.error && <p className="text-sm text-danger">{payouts.error}</p>}
        <DataTable<PayoutView>
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage={payouts.isLoading ? "Loading…" : "No payouts yet."}
          columns={[
            { header: "Reference", cell: (row) => row.reference },
            { header: "Consultant", cell: (row) => <Link className="underline" href={`/admin/marketplace/consultants/${row.consultantId}`}>{row.consultantName}</Link> },
            { header: "Bookings", cell: (row) => row.bookingCount },
            { header: "Gross", cell: (row) => formatCurrency(Number(row.grossAmount)) },
            { header: "Commission", cell: (row) => formatCurrency(Number(row.commissionAmount)) },
            { header: "Net payable", cell: (row) => <span className="font-medium">{formatCurrency(Number(row.netAmount))}</span> },
            { header: "Created", cell: (row) => formatDateTime(row.createdAt) },
            { header: "Status", cell: (row) => <MarketplaceStatus status={row.status} /> },
            {
              header: "",
              cell: (row) => row.status === "PAID"
                ? <span className="text-xs text-muted">{row.paymentReference}{row.paidAt ? ` · ${formatDateTime(row.paidAt)}` : ""}</span>
                : <Button size="sm" variant="outline" onClick={() => { setSettling(row); setReference(""); }}>Settle</Button>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
