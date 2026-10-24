"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { MarketplaceStatus } from "@/components/marketplace/BookingTable";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminMarketplaceApi } from "@/lib/marketplace-api";
import { ReviewView, formatDateTime } from "@/lib/marketplace-types";

export default function AdminReviewsPage() {
  const reviews = useApiData(() => adminMarketplaceApi.reviews());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const moderate = async (review: ReviewView, hidden: boolean) => {
    const note = hidden ? window.prompt("Reason for hiding this review (kept in the audit log):") : undefined;
    if (hidden && (note == null || note.trim().length === 0)) return;
    setBusyId(review.id);
    setError(null);
    try {
      await adminMarketplaceApi.moderate(review.id, hidden, note?.trim());
      reviews.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  };

  const rows = reviews.data?.content ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews and complaints</h1>
        <p className="text-sm text-muted">Every rating left after a completed consultation. Hidden reviews stay out of public profiles and rating averages.</p>
      </div>
      {(error || reviews.error) && <p className="text-sm text-danger">{error ?? reviews.error}</p>}
      <div className="space-y-3">
        {rows.length === 0 && <Card variant="bordered"><p className="text-sm text-muted">{reviews.isLoading ? "Loading…" : "No reviews yet."}</p></Card>}
        {rows.map((review) => (
          <Card key={review.id} variant="bordered">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>{" "}
                  <span className="text-muted">by {review.clientName} · {formatDateTime(review.createdAt)}</span>
                </p>
                {review.comment && <p className="mt-1 text-sm whitespace-pre-wrap">{review.comment}</p>}
                <p className="mt-2 text-xs text-muted">
                  <Link className="underline" href={`/admin/marketplace/consultants/${review.consultantId}`}>Consultant profile</Link> ·{" "}
                  <Link className="underline" href={`/admin/marketplace/bookings?focus=${review.bookingId}`}>Booking</Link>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MarketplaceStatus status={review.moderation} />
                {review.moderation === "HIDDEN"
                  ? <Button size="sm" variant="outline" loading={busyId === review.id} onClick={() => void moderate(review, false)}>Publish</Button>
                  : <Button size="sm" variant="danger" loading={busyId === review.id} onClick={() => void moderate(review, true)}>Hide</Button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
