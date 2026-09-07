"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import BookingTable from "@/components/marketplace/BookingTable";
import { useApiData } from "@/hooks/useApiData";
import { consultantApi } from "@/lib/marketplace-api";

const FILTERS = [
  { key: "requests", label: "Requests", hint: "Held slots awaiting client payment" },
  { key: "upcoming", label: "Upcoming", hint: "Confirmed and in-progress consultations" },
  { key: "past", label: "Past", hint: "Completed, cancelled, refunded and no-shows" },
  { key: "all", label: "All", hint: "Every consultation booked with you" },
];

export default function ConsultantBookingsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState("upcoming");
  const bookings = useApiData(() => consultantApi.bookings(filter), [filter]);
  const current = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Requests and appointments</h1>
        <p className="text-sm text-muted">Open a consultation to start it, share notes, message the client or mark it complete.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === item.key ? "border-primary bg-primary text-white" : "border-border"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Card variant="bordered">
        <CardTitle>{current.label}</CardTitle>
        <CardDescription>{current.hint}</CardDescription>
        {bookings.error && <p className="mt-2 text-sm text-danger">{bookings.error}</p>}
        <div className="mt-4">
          <BookingTable
            rows={bookings.data?.content ?? []}
            perspective="consultant"
            emptyMessage={bookings.isLoading ? "Loading…" : "No consultations in this view."}
            onRowClick={(b) => router.push(`/consultant/bookings/${b.id}`)}
          />
        </div>
      </Card>
    </div>
  );
}
