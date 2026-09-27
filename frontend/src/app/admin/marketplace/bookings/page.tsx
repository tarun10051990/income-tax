"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import BookingTable, { MarketplaceStatus } from "@/components/marketplace/BookingTable";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminMarketplaceApi } from "@/lib/marketplace-api";
import { BookingView, formatDateTime, modeLabel } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

const STATUSES = ["", "REQUESTED", "PAYMENT_PENDING", "CONFIRMED", "RESCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW", "REFUND_REQUESTED", "REFUNDED"];

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={null}>
      <Bookings />
    </Suspense>
  );
}

function Bookings() {
  const searchParams = useSearchParams();
  const consultantId = searchParams.get("consultantId") ?? undefined;
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(searchParams.get("focus"));
  const bookings = useApiData(
    () => adminMarketplaceApi.bookings({ status: status || undefined, consultantId, page }),
    [status, consultantId, page],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Consultations</h1>
        <p className="text-sm text-muted">Every marketplace booking, with payment state, refunds and the message thread for dispute handling.</p>
      </div>

      <Card variant="bordered">
        <div className="flex flex-wrap items-center gap-3">
          <select className="rounded-lg border border-border px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            {STATUSES.map((item) => <option key={item} value={item}>{item === "" ? "All statuses" : item.replaceAll("_", " ")}</option>)}
          </select>
          {consultantId && <span className="text-xs text-muted">Filtered to one consultant</span>}
          <span className="ml-auto text-sm text-muted">{bookings.data?.totalElements ?? 0} bookings</span>
        </div>
        {bookings.error && <p className="mt-2 text-sm text-danger">{bookings.error}</p>}
        <div className="mt-4">
          <BookingTable rows={bookings.data?.content ?? []} perspective="admin" onRowClick={(row) => setFocusId(row.id)} emptyMessage={bookings.isLoading ? "Loading…" : "No bookings match."} />
        </div>
        {(bookings.data?.totalPages ?? 0) > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button type="button" className="underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-muted">Page {page + 1} of {bookings.data?.totalPages}</span>
            <button type="button" className="underline disabled:opacity-40" disabled={page + 1 >= (bookings.data?.totalPages ?? 0)} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </Card>

      {focusId && <BookingDetail id={focusId} onClose={() => setFocusId(null)} onChanged={bookings.reload} />}
    </div>
  );
}

function BookingDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const booking = useApiData(() => adminMarketplaceApi.booking(id), [id]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [seenId, setSeenId] = useState(id);
  if (seenId !== id) {
    setSeenId(id);
    setReason("");
    setFeedback(null);
  }

  const act = async (fn: (id: string, reason: string) => Promise<BookingView>, done: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await fn(id, reason.trim());
      setFeedback(done);
      booking.reload();
      onChanged();
    } catch (cause) {
      setFeedback(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const b = booking.data;
  const cancellable = b ? ["REQUESTED", "PAYMENT_PENDING", "CONFIRMED", "RESCHEDULED"].includes(b.status) : false;
  const refundable = b ? b.paymentStatus === "PAID" && !["REFUNDED", "COMPLETED"].includes(b.status) : false;

  return (
    <Card variant="elevated">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{b ? `Booking ${b.reference}` : "Loading booking…"}</CardTitle>
          {b && <CardDescription>{b.clientName} with {b.consultantName} ({b.consultantType}) · {modeLabel(b.mode)} · {formatDateTime(b.scheduledStart)}</CardDescription>}
        </div>
        <button type="button" className="text-sm text-muted hover:text-foreground" onClick={onClose}>Close</button>
      </div>
      {booking.error && <p className="mt-2 text-sm text-danger">{booking.error}</p>}
      {b && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <MarketplaceStatus status={b.status} />
              <MarketplaceStatus status={b.paymentStatus} />
              {b.urgent && <MarketplaceStatus status="URGENT" />}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-muted">Service</dt><dd>{b.serviceTitle ?? "General consultation"}{b.categoryName ? ` · ${b.categoryName}` : ""}</dd>
              <dt className="text-muted">Fee</dt><dd>{formatCurrency(Number(b.consultationFee))}</dd>
              <dt className="text-muted">Platform fee</dt><dd>{formatCurrency(Number(b.platformFee))}</dd>
              <dt className="text-muted">Tax</dt><dd>{formatCurrency(Number(b.taxAmount))}</dd>
              <dt className="text-muted">Discount</dt><dd>-{formatCurrency(Number(b.discount))}</dd>
              <dt className="text-muted font-medium">Total paid</dt><dd className="font-medium">{formatCurrency(Number(b.totalAmount))}</dd>
              <dt className="text-muted">Consultant earning</dt><dd>{b.consultantEarning != null ? formatCurrency(Number(b.consultantEarning)) : "—"}</dd>
              <dt className="text-muted">Invoice</dt><dd>{b.invoiceNumber ?? "—"}</dd>
              <dt className="text-muted">Payment ref.</dt><dd>{b.paymentReference ?? "—"}{b.paidAt ? ` · ${formatDateTime(b.paidAt)}` : ""}</dd>
              {b.cancellationReason && <><dt className="text-muted">Cancellation</dt><dd>{b.cancellationReason}</dd></>}
              {b.clientNotes && <><dt className="text-muted">Client notes</dt><dd className="whitespace-pre-wrap">{b.clientNotes}</dd></>}
            </dl>
            {(cancellable || refundable) && (
              <div className="border-t border-border pt-3 space-y-2">
                <textarea className="w-full rounded-lg border border-border px-3 py-2 text-sm" rows={2} placeholder="Reason (recorded on the booking and sent to both parties)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  {cancellable && <Button size="sm" variant="outline" loading={busy} disabled={reason.trim().length < 3} onClick={() => void act(adminMarketplaceApi.cancelBooking, "Booking cancelled.")}>Cancel booking</Button>}
                  {refundable && <Button size="sm" variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={() => void act(adminMarketplaceApi.refundBooking, "Refund recorded.")}>Refund client</Button>}
                </div>
                {feedback && <p className="text-xs">{feedback}</p>}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-2">Conversation (read-only for staff)</p>
            <ReadOnlyThread id={id} />
          </div>
        </div>
      )}
    </Card>
  );
}

function ReadOnlyThread({ id }: { id: string }) {
  const messages = useApiData(() => adminMarketplaceApi.bookingMessages(id), [id]);
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto rounded-lg border border-border p-3">
      {messages.error && <p className="text-sm text-danger">{messages.error}</p>}
      {(messages.data ?? []).length === 0 && !messages.error && <p className="text-sm text-muted">No messages exchanged.</p>}
      {(messages.data ?? []).map((m) => (
        <div key={m.id} className="rounded-xl bg-gray-100 px-3 py-2 text-sm">
          <p className="whitespace-pre-wrap">{m.body}</p>
          <p className="mt-1 text-[10px] text-muted">{m.senderName} · {formatDateTime(m.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}
