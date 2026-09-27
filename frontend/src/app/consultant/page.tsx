"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import BookingTable from "@/components/marketplace/BookingTable";
import { useApiData } from "@/hooks/useApiData";
import { consultantApi } from "@/lib/marketplace-api";
import { formatCurrency } from "@/lib/utils";

const STATUS_COPY: Record<string, { label: string; tone: "default" | "success" | "warning" | "danger" | "info"; hint: string }> = {
  PENDING_VERIFICATION: { label: "Pending verification", tone: "warning", hint: "Complete your profile; our team will review your registration details." },
  UNDER_REVIEW: { label: "Under review", tone: "info", hint: "Verification is in progress. You can set up services and availability meanwhile." },
  APPROVED: { label: "Approved", tone: "success", hint: "Approved. Your profile will be activated shortly." },
  ACTIVE: { label: "Active", tone: "success", hint: "Your profile is live on the marketplace." },
  SUSPENDED: { label: "Suspended", tone: "danger", hint: "Your profile is hidden. Contact support for details." },
  REJECTED: { label: "Rejected", tone: "danger", hint: "Your application was not approved. See the note from our team on your profile page." },
};

export default function ConsultantDashboardPage() {
  const router = useRouter();
  const dashboard = useApiData(() => consultantApi.dashboard());
  const d = dashboard.data;
  const status = d ? STATUS_COPY[d.profileStatus] ?? { label: d.profileStatus, tone: "default" as const, hint: "" } : null;
  const count = (key: string) => d?.counts[key] ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">Your practice on the TaxFilr marketplace.</p>
        </div>
        {status && <Badge variant={status.tone}>{status.label}</Badge>}
      </div>

      {dashboard.error && <p className="text-sm text-danger">{dashboard.error}</p>}

      {status && d && d.profileStatus !== "ACTIVE" && (
        <Card variant="bordered" className="border-amber-200 bg-amber-50/60">
          <p className="text-sm">{status.hint}</p>
          <Link href="/consultant/profile" className="text-sm text-primary underline">Go to profile and verification</Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total consultations" value={count("total")} />
        <Stat label="New requests" value={count("newRequests")} hint="Awaiting client payment" />
        <Stat label="Upcoming" value={count("upcoming")} />
        <Stat label="Completed" value={count("completed")} />
        <Stat label="Cancelled" value={count("cancelled")} />
        <Stat label="Total earnings" value={formatCurrency(Number(d?.totalEarnings ?? 0))} hint="After platform commission" />
        <Stat label="Pending payout" value={formatCurrency(Number(d?.pendingEarnings ?? 0))} />
        <Stat label="Average rating" value={d?.averageRating != null ? `${Number(d.averageRating).toFixed(1)} ★` : "—"} hint={`${d?.reviewCount ?? 0} reviews`} />
      </div>

      <Card variant="bordered">
        <CardTitle>Upcoming appointments</CardTitle>
        <CardDescription>Confirmed consultations, soonest first.</CardDescription>
        <div className="mt-4">
          <BookingTable rows={d?.upcoming ?? []} perspective="consultant" emptyMessage="Nothing scheduled yet." onRowClick={(b) => router.push(`/consultant/bookings/${b.id}`)} />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>New requests</CardTitle>
        <CardDescription>Slots held by clients who have not completed payment yet.</CardDescription>
        <div className="mt-4">
          <BookingTable rows={d?.newRequests ?? []} perspective="consultant" emptyMessage="No pending requests." onRowClick={(b) => router.push(`/consultant/bookings/${b.id}`)} />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card variant="bordered">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}
