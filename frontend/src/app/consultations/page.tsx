"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import BookingTable from "@/components/marketplace/BookingTable";
import { useAuth } from "@/contexts/AuthContext";
import { useApiData } from "@/hooks/useApiData";
import { bookingApi } from "@/lib/marketplace-api";

export default function ClientConsultationsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const bookings = useApiData(() => bookingApi("customer").mine(), [isAuthenticated]);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login?next=/consultations");
    }
  }, [isAuthenticated, isReady, router]);

  const rows = bookings.data?.content ?? [];
  const upcoming = rows.filter((b) => ["CONFIRMED", "RESCHEDULED", "IN_PROGRESS"].includes(b.status));
  const pending = rows.filter((b) => ["REQUESTED", "PAYMENT_PENDING"].includes(b.status));
  const past = rows.filter((b) => !upcoming.includes(b) && !pending.includes(b));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My consultations</h1>
          <p className="text-sm text-muted">Bookings with CAs, tax consultants and lawyers from the marketplace.</p>
        </div>
        <Link href="/consultants"><Button>Book a consultation</Button></Link>
      </div>

      {bookings.error && <p className="text-sm text-danger">{bookings.error}</p>}

      {pending.length > 0 && (
        <Card variant="bordered">
          <CardTitle>Awaiting payment</CardTitle>
          <CardDescription>Your slot is held only until you complete the payment.</CardDescription>
          <div className="mt-4">
            <BookingTable rows={pending} perspective="client" onRowClick={(b) => router.push(`/consultations/${b.id}?pay=1`)} />
          </div>
        </Card>
      )}

      <Card variant="bordered">
        <CardTitle>Upcoming</CardTitle>
        <div className="mt-4">
          <BookingTable
            rows={upcoming}
            perspective="client"
            emptyMessage="No upcoming consultations."
            onRowClick={(b) => router.push(`/consultations/${b.id}`)}
          />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>Past</CardTitle>
        <div className="mt-4">
          <BookingTable
            rows={past}
            perspective="client"
            emptyMessage="No past consultations yet."
            onRowClick={(b) => router.push(`/consultations/${b.id}`)}
          />
        </div>
      </Card>
    </div>
  );
}
