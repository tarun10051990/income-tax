"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import BookingTable from "@/components/marketplace/BookingTable";
import { useApiData } from "@/hooks/useApiData";
import { adminMarketplaceApi } from "@/lib/marketplace-api";
import { formatCurrency } from "@/lib/utils";

export default function AdminMarketplaceOverviewPage() {
  const router = useRouter();
  const stats = useApiData(() => adminMarketplaceApi.stats());
  const pending = useApiData(() => adminMarketplaceApi.consultants({ status: "PENDING_VERIFICATION", size: 5 }));
  const recent = useApiData(() => adminMarketplaceApi.bookings({ size: 8 }));
  const s = stats.data;
  const c = (key: string) => s?.consultants[key] ?? 0;
  const b = (key: string) => s?.bookings[key] ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketplace overview</h1>
        <p className="text-sm text-muted">Consultant supply, consultation demand and platform revenue, computed from the database.</p>
      </div>
      {stats.error && <p className="text-sm text-danger">{stats.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross consultation revenue" value={formatCurrency(Number(s?.grossRevenue ?? 0))} hint="Paid bookings" />
        <Stat label="Platform revenue" value={formatCurrency(Number(s?.platformRevenue ?? 0))} hint="Commission + platform fees" />
        <Stat label="Consultant earnings" value={formatCurrency(Number(s?.consultantEarnings ?? 0))} />
        <Stat label="Payouts settled" value={formatCurrency(Number(s?.payoutsPaid ?? 0))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="bordered">
          <CardTitle>Consultants</CardTitle>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Item label="Active (live)" value={c("ACTIVE")} />
            <Item label="Verified" value={c("VERIFIED")} />
            <Item label="Pending verification" value={c("PENDING_VERIFICATION")} />
            <Item label="Under review" value={c("UNDER_REVIEW")} />
            <Item label="Approved (not yet live)" value={c("APPROVED")} />
            <Item label="Suspended" value={c("SUSPENDED")} />
            <Item label="Rejected" value={c("REJECTED")} />
          </dl>
          <Link href="/admin/marketplace/consultants" className="mt-3 inline-block text-sm text-primary underline">Manage consultants</Link>
        </Card>
        <Card variant="bordered">
          <CardTitle>Consultations</CardTitle>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Item label="Awaiting payment" value={b("REQUESTED") + b("PAYMENT_PENDING")} />
            <Item label="Confirmed" value={b("CONFIRMED") + b("RESCHEDULED")} />
            <Item label="In progress" value={b("IN_PROGRESS")} />
            <Item label="Completed" value={b("COMPLETED")} />
            <Item label="Cancelled / no-show" value={b("CANCELLED") + b("NO_SHOW")} />
            <Item label="Refund requested" value={b("REFUND_REQUESTED")} />
            <Item label="Refunded" value={b("REFUNDED")} />
          </dl>
          <Link href="/admin/marketplace/bookings" className="mt-3 inline-block text-sm text-primary underline">All consultations</Link>
        </Card>
      </div>

      <Card variant="bordered">
        <CardTitle>Verification queue</CardTitle>
        <CardDescription>Newest applications awaiting a first look.</CardDescription>
        <ul className="mt-3 divide-y divide-border text-sm">
          {(pending.data?.content ?? []).map((item) => (
            <li key={item.profile.id} className="flex items-center justify-between py-2">
              <span>{item.profile.name} · {item.profile.professionalType} · {item.profile.city ?? "—"}</span>
              <Link href={`/admin/marketplace/consultants/${item.profile.id}`} className="text-primary underline">Review</Link>
            </li>
          ))}
          {(pending.data?.content ?? []).length === 0 && <li className="py-2 text-muted">Queue is empty.</li>}
        </ul>
      </Card>

      <Card variant="bordered">
        <CardTitle>Recent consultations</CardTitle>
        <div className="mt-4">
          <BookingTable rows={recent.data?.content ?? []} perspective="admin" onRowClick={(row) => router.push(`/admin/marketplace/bookings?focus=${row.id}`)} />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card variant="bordered">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function Item({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}
