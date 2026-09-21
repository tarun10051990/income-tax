"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import { Avatar, Rating } from "@/components/marketplace/ConsultantCard";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { bookingApi, marketplaceApi } from "@/lib/marketplace-api";
import { ConsultationMode, QuoteView, SlotView, formatDateTime, modeLabel } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function ConsultantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();

  const consultant = useApiData(() => marketplaceApi.consultant(id), [id]);
  const reviews = useApiData(() => marketplaceApi.reviews(id, { size: 5 }), [id]);
  const pricing = useApiData(() => marketplaceApi.pricing());

  const [serviceId, setServiceId] = useState<string>("");
  const [mode, setMode] = useState<ConsultationMode | "">("");
  const [urgent, setUrgent] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [weekStart, setWeekStart] = useState(() => isoDate(new Date()));
  const [slot, setSlot] = useState<SlotView | null>(null);
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(
    () => consultant.data?.services.find((item) => item.id === serviceId) ?? null,
    [consultant.data, serviceId],
  );
  const modes = useMemo(
    () => (service ? service.modes : consultant.data?.consultationModes ?? []),
    [service, consultant.data],
  );
  const duration = service?.durationMinutes ?? consultant.data?.slotDurationMinutes;
  if (mode !== "" && !modes.includes(mode)) {
    setMode("");
  }

  const slots = useApiData(
    () => marketplaceApi.slots(id, { from: weekStart, days: 7, duration }),
    [id, weekStart, duration],
  );

  const quoteActive = consultant.data !== null && mode !== "";
  useEffect(() => {
    if (!quoteActive) {
      return;
    }
    let cancelled = false;
    marketplaceApi
      .quote({ consultantId: id, serviceId: serviceId || undefined, mode, urgent, couponCode: couponCode || undefined })
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
          setQuoteError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(errorMessage(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [quoteActive, id, serviceId, mode, urgent, couponCode]);

  const book = async () => {
    if (!slot || mode === "") {
      return;
    }
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(`/consultants/${id}`)}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const booking = await bookingApi("customer").create({
        consultantId: id,
        serviceId: serviceId || undefined,
        mode,
        scheduledStart: slot.start,
        urgent,
        couponCode: couponCode || undefined,
        notes: notes || undefined,
      });
      router.push(`/consultations/${booking.id}?pay=1`);
    } catch (cause) {
      setError(errorMessage(cause));
      slots.reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (consultant.error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-danger">{consultant.error}</p>
        <Link href="/consultants" className="mt-4 inline-block text-sm text-primary underline">Back to all consultants</Link>
      </div>
    );
  }
  if (!consultant.data) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-sm text-muted">Loading profile…</div>;
  }
  const c = consultant.data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <Card variant="bordered">
          <div className="flex flex-col sm:flex-row gap-5">
            <Avatar name={c.name} photoUrl={c.photoUrl} size="lg" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{c.designation ? `${c.designation} ` : ""}{c.name}</h1>
                {c.verified && <Badge variant="success">Verified professional</Badge>}
              </div>
              <p className="text-muted">
                {c.professionalType}
                {c.qualification ? ` · ${c.qualification}` : ""} · {c.experienceYears} years experience
              </p>
              <p className="text-sm text-muted">
                {[c.city, c.state].filter(Boolean).join(", ")}
                {c.languages.length > 0 ? ` · Speaks ${c.languages.join(", ")}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <Rating value={c.averageRating} count={c.reviewCount} />
                <span className="text-muted">{c.completedConsultations} consultations completed</span>
              </div>
              {c.registrationNumber && (
                <p className="mt-1 text-xs text-muted">Registration no. {c.registrationNumber}</p>
              )}
            </div>
          </div>
          {c.bio && <p className="mt-5 text-sm leading-relaxed whitespace-pre-wrap">{c.bio}</p>}
          {c.specializations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.specializations.map((item) => (
                <span key={item} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">{item}</span>
              ))}
            </div>
          )}
        </Card>

        <Card variant="bordered">
          <CardTitle>Services and fees</CardTitle>
          <CardDescription>Choose a service to see its duration and fee, or book a general consultation.</CardDescription>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => setServiceId("")}
              className={`w-full text-left rounded-xl border px-4 py-3 ${serviceId === "" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="flex justify-between text-sm">
                <span className="font-medium">General consultation</span>
                <span>{formatCurrency(Number(c.startingFee))} · {c.slotDurationMinutes} min</span>
              </div>
            </button>
            {c.services.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setServiceId(item.id)}
                className={`w-full text-left rounded-xl border px-4 py-3 ${serviceId === item.id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.title}</span>
                  <span>{formatCurrency(Number(item.fee))} · {item.durationMinutes} min</span>
                </div>
                {item.description && <p className="mt-1 text-xs text-muted">{item.description}</p>}
                {item.categoryName && <p className="mt-1 text-xs text-primary">{item.categoryName}</p>}
              </button>
            ))}
          </div>
        </Card>

        <Card variant="bordered">
          <CardTitle>Reviews</CardTitle>
          <div className="mt-4 space-y-3">
            {(reviews.data?.content ?? []).length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
            {(reviews.data?.content ?? []).map((review) => (
              <div key={review.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{review.clientName}</span>
                  <span className="text-amber-500">{"★".repeat(review.rating)}</span>
                </div>
                {review.comment && <p className="mt-1 text-muted">{review.comment}</p>}
                <p className="mt-1 text-xs text-muted">{formatDateTime(review.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 self-start space-y-4">
        <Card variant="elevated">
          <CardTitle>Book a consultation</CardTitle>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted mb-1">Consultation mode</p>
              <div className="flex flex-wrap gap-2">
                {modes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    className={`rounded-full border px-3 py-1 text-xs ${mode === option ? "border-primary bg-primary text-white" : "border-border"}`}
                  >
                    {modeLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted">Pick a date and time</p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={weekStart <= isoDate(new Date())}
                    onClick={() => setWeekStart(isoDate(new Date(new Date(weekStart).getTime() - 7 * 86400000)))}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekStart(isoDate(new Date(new Date(weekStart).getTime() + 7 * 86400000)))}
                  >
                    ›
                  </Button>
                </div>
              </div>
              {slots.isLoading && <p className="text-xs text-muted">Loading slots…</p>}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(slots.data ?? []).map((day) => (
                  <div key={day.date}>
                    <p className="text-xs text-muted">
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                    </p>
                    {day.slots.length === 0 ? (
                      <p className="text-xs text-muted/70">No slots</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {day.slots.map((item) => (
                          <button
                            key={item.start}
                            type="button"
                            onClick={() => setSlot(item)}
                            className={`rounded-md border px-2 py-1 text-xs ${slot?.start === item.start ? "border-primary bg-primary text-white" : "border-border"}`}
                          >
                            {new Date(item.start).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} />
              Mark as urgent (priority handling, surcharge applies)
            </label>
            <input
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Coupon code (optional)"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
            />
            <textarea
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              rows={3}
              placeholder="Briefly describe what you need help with"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
            />

            {quoteError && <p className="text-xs text-danger">{quoteError}</p>}
            {quoteActive && quote && (
              <div className="rounded-xl bg-gray-50 p-3 text-sm space-y-1">
                <Row label="Consultation fee" value={quote.consultationFee} />
                {Number(quote.urgentSurcharge) > 0 && <Row label="Urgent surcharge" value={quote.urgentSurcharge} />}
                {Number(quote.modeSurcharge) > 0 && <Row label={`${modeLabel(mode)} surcharge`} value={quote.modeSurcharge} />}
                {Number(quote.platformFee) > 0 && <Row label="Platform fee" value={quote.platformFee} />}
                {Number(quote.discount) > 0 && <Row label={`Discount${quote.couponCode ? ` (${quote.couponCode})` : ""}`} value={-Number(quote.discount)} />}
                <Row label="GST on fees" value={quote.taxAmount} />
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Total payable</span>
                  <span>{formatCurrency(Number(quote.total))}</span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              className="w-full"
              size="lg"
              disabled={!slot || mode === "" || !isReady}
              loading={submitting}
              onClick={() => void book()}
            >
              {isAuthenticated ? "Continue to payment" : "Sign in to book"}
            </Button>
            <p className="text-xs text-muted">
              Your slot is held while you pay.
              {pricing.data?.fullRefundHours !== undefined
                ? ` Full refund if you cancel ${Number(pricing.data.fullRefundHours)} hours before the appointment.`
                : ""}
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span>{formatCurrency(Number(value))}</span>
    </div>
  );
}
