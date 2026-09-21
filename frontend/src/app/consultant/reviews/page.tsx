"use client";

import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import { useApiData } from "@/hooks/useApiData";
import { consultantApi } from "@/lib/marketplace-api";
import { formatDateTime } from "@/lib/marketplace-types";

export default function ConsultantReviewsPage() {
  const reviews = useApiData(() => consultantApi.reviews());
  const dashboard = useApiData(() => consultantApi.dashboard());
  const rows = reviews.data?.content ?? [];
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: rows.filter((r) => r.rating === star).length }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted">Clients can review a consultation once it is marked complete. Reviews are moderated by TaxFilr.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Card variant="bordered" className="min-w-48">
          <p className="text-xs uppercase tracking-wide text-muted">Average rating</p>
          <p className="text-4xl font-semibold mt-1">
            {dashboard.data?.averageRating != null ? Number(dashboard.data.averageRating).toFixed(1) : "—"}
            <span className="text-amber-500 text-2xl"> ★</span>
          </p>
          <p className="text-xs text-muted">{dashboard.data?.reviewCount ?? 0} published reviews</p>
        </Card>
        <Card variant="bordered">
          <CardTitle>Distribution</CardTitle>
          <div className="mt-2 space-y-1 text-sm">
            {distribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8">{star} ★</span>
                <div className="flex-1 h-2 rounded bg-gray-100">
                  <div className="h-2 rounded bg-amber-400" style={{ width: rows.length ? `${(count / rows.length) * 100}%` : 0 }} />
                </div>
                <span className="w-6 text-right text-muted">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card variant="bordered">
        <CardTitle>All reviews</CardTitle>
        <CardDescription>Reviews awaiting moderation are shown here but not yet on your public profile.</CardDescription>
        {reviews.error && <p className="mt-2 text-sm text-danger">{reviews.error}</p>}
        <div className="mt-4 space-y-3">
          {rows.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
          {rows.map((review) => (
            <div key={review.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{review.clientName}</span>
                <span className="text-amber-500">{"★".repeat(review.rating)}<span className="text-gray-300">{"★".repeat(5 - review.rating)}</span></span>
              </div>
              {review.comment && <p className="mt-1 text-muted">{review.comment}</p>}
              <p className="mt-1 text-xs text-muted">{formatDateTime(review.createdAt)} · {review.moderation.toLowerCase()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
