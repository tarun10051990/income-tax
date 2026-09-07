"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import { MarketplaceStatus } from "@/components/marketplace/BookingTable";
import { MessageThread, SharedDocuments } from "@/components/marketplace/ConsultationThread";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { bookingApi, consultantApi } from "@/lib/marketplace-api";
import { formatDateTime, modeLabel } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

const api = bookingApi("consultant");

export default function ConsultantBookingPage() {
  const { id } = useParams<{ id: string }>();
  const booking = useApiData(() => api.detail(id), [id]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  const [seededFrom, setSeededFrom] = useState<typeof booking.data>(null);
  if (booking.data && booking.data !== seededFrom) {
    setSeededFrom(booking.data);
    setNotes(booking.data.consultantNotes ?? "");
  }

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
    return <div className="px-6 py-16 text-sm text-danger">{booking.error}</div>;
  }
  if (!booking.data) {
    return <div className="px-6 py-16 text-sm text-muted">Loading consultation…</div>;
  }
  const b = booking.data;
  const live = b.status === "CONFIRMED" || b.status === "RESCHEDULED";
  const inProgress = b.status === "IN_PROGRESS";
  const threadOpen = live || inProgress || b.status === "COMPLETED";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/consultant/bookings" className="text-xs text-muted hover:text-foreground">← All consultations</Link>
          <h1 className="text-2xl font-semibold mt-1">{b.serviceTitle ?? b.categoryName ?? "Consultation"} · {b.clientName}</h1>
          <p className="text-sm text-muted">
            {formatDateTime(b.scheduledStart)} – {new Date(b.scheduledEnd).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {modeLabel(b.mode)} · Ref {b.reference}
            {b.urgent ? " · Urgent" : ""}
          </p>
        </div>
        <MarketplaceStatus status={b.status} />
      </div>

      {feedback && <p className={`text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {(live || inProgress) && (
            <Card variant="bordered">
              <CardTitle>Session</CardTitle>
              <CardDescription>
                {b.meetingLink ? <>Room link: <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">{b.meetingLink}</code></> : "Contact details are in the client card."}
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-2">
                {live && <Button loading={busy} onClick={() => void run(() => consultantApi.start(id), "Consultation started.")}>Start consultation</Button>}
                {inProgress && <Button loading={busy} onClick={() => void run(() => consultantApi.complete(id), "Marked complete. Earnings move to pending payout.")}>Mark complete</Button>}
                {live && <Button variant="outline" loading={busy} onClick={() => void run(() => consultantApi.noShow(id), "Marked as no-show.")}>Client no-show</Button>}
              </div>
            </Card>
          )}

          {b.clientNotes && (
            <Card variant="bordered">
              <CardTitle>What the client needs</CardTitle>
              <p className="mt-2 text-sm whitespace-pre-wrap">{b.clientNotes}</p>
            </Card>
          )}

          {threadOpen && <MessageThread bookingId={id} scope="consultant" />}
          {threadOpen && <SharedDocuments bookingId={id} scope="consultant" canShare={false} />}

          <Card variant="bordered">
            <CardTitle>Private notes</CardTitle>
            <CardDescription>Visible only to you. Use for advice given, follow-ups and documents requested.</CardDescription>
            <textarea className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm" rows={5} maxLength={8000} value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button size="sm" className="mt-2" loading={busy} onClick={() => void run(() => consultantApi.notes(id, notes), "Notes saved.")}>Save notes</Button>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card variant="bordered">
            <CardTitle>Client</CardTitle>
            <p className="mt-2 text-sm font-medium">{b.clientName}</p>
            <p className="text-xs text-muted">Contact details are shared through the consultation chat; the client&apos;s wider tax records stay private unless they share a document.</p>
          </Card>
          <Card variant="bordered">
            <CardTitle>Earnings for this consultation</CardTitle>
            <div className="mt-3 text-sm space-y-1">
              <Row label="Client paid" value={b.totalAmount} />
              {b.consultantEarning != null && (
                <Row label="Platform commission and taxes" value={-(Number(b.totalAmount) - Number(b.consultantEarning))} />
              )}
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span>Your earning</span>
                <span>{b.consultantEarning != null ? formatCurrency(Number(b.consultantEarning)) : "—"}</span>
              </div>
              <p className="text-xs text-muted pt-1">Payment {b.paymentStatus.toLowerCase()}</p>
            </div>
          </Card>
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
