"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import { MarketplaceStatus } from "@/components/marketplace/BookingTable";
import { MessageThread, SharedDocuments } from "@/components/marketplace/ConsultationThread";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";
import { bookingApi, marketplaceApi } from "@/lib/marketplace-api";
import { BookingView, ConsultationInvoice, formatDateTime, modeLabel } from "@/lib/marketplace-types";
import { DocumentView } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

const api = bookingApi("customer");

export default function ClientConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const booking = useApiData(() => api.detail(id), [id]);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/consultations/${id}`)}`);
    }
  }, [id, isAuthenticated, isReady, router]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: "ok", message: success });
      booking.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  };

  if (booking.error) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-sm text-danger">{booking.error}</div>;
  }
  if (!booking.data) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-sm text-muted">Loading consultation…</div>;
  }
  const b = booking.data;
  const awaitingPayment = b.status === "REQUESTED" || b.status === "PAYMENT_PENDING";
  const live = b.status === "CONFIRMED" || b.status === "RESCHEDULED" || b.status === "IN_PROGRESS";
  const canReview = b.status === "COMPLETED" && !b.reviewed;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/consultations" className="text-xs text-muted hover:text-foreground">← All consultations</Link>
          <h1 className="text-2xl font-semibold mt-1">
            {b.serviceTitle ?? b.categoryName ?? "Consultation"} with {b.consultantName}
          </h1>
          <p className="text-sm text-muted">
            {b.consultantType} · {formatDateTime(b.scheduledStart)} · {modeLabel(b.mode)} · Ref {b.reference}
          </p>
        </div>
        <MarketplaceStatus status={b.status} />
      </div>

      {feedback && (
        <p className={`text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>
      )}

      {awaitingPayment && <PaymentPanel booking={b} busy={busy} onPay={(ref) => run(() => api.confirmPayment(id, ref), "Payment received. Your consultation is confirmed.")} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {live && (
            <Card variant="bordered">
              <CardTitle>Join your consultation</CardTitle>
              <CardDescription>
                {b.mode === "VIDEO" || b.mode === "CHAT"
                  ? "The secure room opens 10 minutes before the scheduled time and is only accessible to you and your consultant."
                  : b.mode === "PHONE"
                    ? "Your consultant will call the mobile number on your profile at the scheduled time."
                    : "Meet your consultant in person at the scheduled time; the address is in your messages."}
              </CardDescription>
              {b.meetingLink && (b.mode === "VIDEO" || b.mode === "CHAT") && (
                <p className="mt-3 text-sm">
                  Room link: <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">{b.meetingLink}</code>
                </p>
              )}
            </Card>
          )}

          {(live || b.status === "COMPLETED" || b.status === "IN_PROGRESS") && <MessageThread bookingId={id} scope="customer" />}
          {(live || b.status === "COMPLETED") && <ClientDocuments bookingId={id} />}

          {canReview && <ReviewForm onSubmit={(rating, comment) => run(() => api.review(id, rating, comment), "Thanks for your review.")} busy={busy} />}
        </div>

        <aside className="space-y-6">
          <Card variant="bordered">
            <CardTitle>Price breakdown</CardTitle>
            <div className="mt-3 text-sm space-y-1">
              <Row label="Consultation fee" value={b.consultationFee} />
              {Number(b.platformFee) > 0 && <Row label="Platform fee" value={b.platformFee} />}
              {Number(b.discount) > 0 && <Row label="Discount" value={-Number(b.discount)} />}
              <Row label="GST on fees" value={b.taxAmount} />
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(Number(b.totalAmount))}</span>
              </div>
              <p className="text-xs text-muted pt-1">Payment: {b.paymentStatus.toLowerCase()}{b.paidAt ? ` on ${formatDateTime(b.paidAt)}` : ""}</p>
            </div>
            {b.invoiceNumber && <InvoiceLink bookingId={id} />}
          </Card>

          {b.clientNotes && (
            <Card variant="bordered">
              <CardTitle>Your notes</CardTitle>
              <p className="mt-2 text-sm whitespace-pre-wrap">{b.clientNotes}</p>
            </Card>
          )}

          {(live || awaitingPayment) && (
            <Card variant="bordered">
              <CardTitle>Manage booking</CardTitle>
              <ManageBooking booking={b} busy={busy} run={run} />
            </Card>
          )}

          {b.cancellationReason && (
            <Card variant="bordered">
              <CardTitle>Cancellation</CardTitle>
              <p className="mt-2 text-sm text-muted">{b.cancellationReason}</p>
            </Card>
          )}
        </aside>
      </div>
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

/**
 * Payment gateway boundary. The platform records the gateway's reference once the customer has
 * paid; wiring a live gateway (Razorpay, PayU, …) replaces the reference input with its checkout.
 */
function PaymentPanel({ booking, busy, onPay }: { booking: BookingView; busy: boolean; onPay: (reference: string) => void }) {
  const [reference, setReference] = useState("");
  return (
    <Card variant="elevated" className="border border-primary/30">
      <CardTitle>Complete payment to confirm your slot</CardTitle>
      <CardDescription>
        Pay {formatCurrency(Number(booking.totalAmount))} to confirm {formatDateTime(booking.scheduledStart)} with {booking.consultantName}.
        The slot is released if payment is not completed.
      </CardDescription>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Payment gateway reference (UTR / transaction id)"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
        <Button size="lg" loading={busy} disabled={reference.trim().length < 4} onClick={() => onPay(reference.trim())}>
          Record payment
        </Button>
      </div>
    </Card>
  );
}

function ManageBooking({
  booking,
  busy,
  run,
}: {
  booking: BookingView;
  busy: boolean;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState("");
  const slots = useApiData(() => marketplaceApi.slots(booking.consultantId, { days: 14 }), [booking.consultantId]);
  return (
    <div className="mt-3 space-y-4 text-sm">
      <div>
        <p className="text-xs font-medium text-muted mb-1">Reschedule</p>
        <select
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={newStart}
          onChange={(event) => setNewStart(event.target.value)}
        >
          <option value="">Pick a new slot</option>
          {(slots.data ?? []).flatMap((day) =>
            day.slots.map((slot) => (
              <option key={slot.start} value={slot.start}>{formatDateTime(slot.start)}</option>
            )),
          )}
        </select>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={newStart.length === 0}
          loading={busy}
          onClick={() => void run(() => api.reschedule(booking.id, newStart), "Consultation rescheduled.")}
        >
          Reschedule
        </Button>
      </div>
      <div>
        <p className="text-xs font-medium text-muted mb-1">Cancel</p>
        <input
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button
          size="sm"
          variant="danger"
          className="mt-2"
          loading={busy}
          onClick={() => void run(() => api.cancel(booking.id, reason), "Consultation cancelled.")}
        >
          Cancel booking
        </Button>
      </div>
    </div>
  );
}

function ClientDocuments({ bookingId }: { bookingId: string }) {
  const cases = useApiData(() => customerApi.cases({ size: 50 }));
  const [documents, setDocuments] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    const list = cases.data?.content ?? [];
    if (list.length === 0) {
      return;
    }
    let cancelled = false;
    Promise.all(list.map((item) => customerApi.documents(item.id).then((docs) => docs.map((doc: DocumentView) => ({
      id: doc.id,
      label: `${doc.fileName} (${item.caseNumber})`,
    }))))).then((groups) => {
      if (!cancelled) {
        setDocuments(groups.flat());
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cases.data]);

  return <SharedDocuments bookingId={bookingId} scope="customer" canShare documentOptions={documents} />;
}

function ReviewForm({ onSubmit, busy }: { onSubmit: (rating: number, comment: string) => void; busy: boolean }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <Card variant="bordered">
      <CardTitle>Rate your consultation</CardTitle>
      <CardDescription>Your review is published on the consultant&apos;s profile after moderation checks.</CardDescription>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} star`}
            onClick={() => setRating(star)}
            className={`text-2xl ${star <= rating ? "text-amber-500" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm"
        rows={3}
        placeholder="What went well? What could be better?"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={2000}
      />
      <Button className="mt-3" loading={busy} onClick={() => onSubmit(rating, comment)}>Submit review</Button>
    </Card>
  );
}

function InvoiceLink({ bookingId }: { bookingId: string }) {
  const [invoice, setInvoice] = useState<ConsultationInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (invoice) {
    return (
      <div className="mt-4 rounded-xl border border-border p-3 text-xs space-y-1">
        <p className="font-semibold text-sm">Invoice {invoice.invoiceNumber}</p>
        <p>Issued {formatDateTime(invoice.issuedAt)} to {invoice.clientName}</p>
        <p>{invoice.consultantName} ({invoice.consultantType}) · {invoice.serviceTitle ?? "Consultation"}</p>
        <p>Payment ref {invoice.paymentReference ?? "—"}</p>
        <p className="font-medium">Total {formatCurrency(Number(invoice.totalAmount))}</p>
        <Button size="sm" variant="outline" onClick={() => window.print()}>Print / save PDF</Button>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <Button size="sm" variant="outline" onClick={() => api.invoice(bookingId).then(setInvoice).catch((cause: unknown) => setError(errorMessage(cause)))}>
        View invoice
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
