"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { MarketplaceStatus } from "@/components/marketplace/BookingTable";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminMarketplaceApi } from "@/lib/marketplace-api";
import { formatDateTime, modeLabel } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

type Decision = "review" | "approve" | "reject" | "suspend" | "reactivate";

const DECISIONS: Record<string, { action: Decision; label: string; variant: "primary" | "outline" | "danger" }[]> = {
  PENDING_VERIFICATION: [
    { action: "review", label: "Start review", variant: "outline" },
    { action: "approve", label: "Verify and approve", variant: "primary" },
    { action: "reject", label: "Reject", variant: "danger" },
  ],
  UNDER_REVIEW: [
    { action: "approve", label: "Verify and approve", variant: "primary" },
    { action: "reject", label: "Reject", variant: "danger" },
  ],
  APPROVED: [
    { action: "reactivate", label: "Activate listing", variant: "primary" },
    { action: "suspend", label: "Suspend", variant: "danger" },
  ],
  ACTIVE: [{ action: "suspend", label: "Suspend", variant: "danger" }],
  SUSPENDED: [
    { action: "reactivate", label: "Reactivate", variant: "primary" },
    { action: "reject", label: "Reject permanently", variant: "danger" },
  ],
  REJECTED: [
    { action: "review", label: "Re-open review", variant: "outline" },
    { action: "approve", label: "Verify and approve", variant: "primary" },
  ],
};

export default function AdminConsultantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const consultant = useApiData(() => adminMarketplaceApi.consultant(id), [id]);
  const services = useApiData(() => adminMarketplaceApi.consultantServices(id), [id]);
  const availability = useApiData(() => adminMarketplaceApi.consultantAvailability(id), [id]);
  const [notes, setNotes] = useState("");
  const [edit, setEdit] = useState({ baseFee: "", slotDurationMinutes: "", experienceYears: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  const [seededFrom, setSeededFrom] = useState<typeof consultant.data>(null);
  if (consultant.data && consultant.data !== seededFrom) {
    const p = consultant.data.profile;
    setSeededFrom(consultant.data);
    setEdit({ baseFee: String(p.startingFee), slotDurationMinutes: String(p.slotDurationMinutes), experienceYears: String(p.experienceYears) });
  }

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: "ok", message: success });
      setNotes("");
      consultant.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  };

  if (consultant.error) {
    return <div className="px-6 py-16 text-sm text-danger">{consultant.error}</div>;
  }
  if (!consultant.data) {
    return <div className="px-6 py-16 text-sm text-muted">Loading…</div>;
  }
  const c = consultant.data;
  const p = c.profile;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/marketplace/consultants" className="text-xs text-muted hover:text-foreground">← All consultants</Link>
          <h1 className="text-2xl font-semibold mt-1">{p.designation ? `${p.designation} ` : ""}{p.name}</h1>
          <p className="text-sm text-muted">{p.professionalType} · {c.email}{c.phone ? ` · ${c.phone}` : ""} · applied {formatDateTime(c.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <MarketplaceStatus status={c.status} />
          {p.verified && <Badge variant="success">Verified{c.verifiedAt ? ` ${formatDateTime(c.verifiedAt)}` : ""}</Badge>}
          {!c.accountActive && <Badge variant="danger">Login disabled</Badge>}
        </div>
      </div>

      {feedback && <p className={`text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card variant="bordered">
            <CardTitle>Credentials to verify</CardTitle>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Registration no.</dt><dd className="font-medium">{p.registrationNumber ?? "Not provided"}</dd>
              <dt className="text-muted">Qualification</dt><dd>{p.qualification ?? "—"}</dd>
              <dt className="text-muted">Experience</dt><dd>{p.experienceYears} years</dd>
              <dt className="text-muted">Location</dt><dd>{[p.city, p.state].filter(Boolean).join(", ") || "—"}</dd>
              <dt className="text-muted">Languages</dt><dd>{p.languages.join(", ") || "—"}</dd>
              <dt className="text-muted">Specializations</dt><dd>{p.specializations.join(", ") || "—"}</dd>
              <dt className="text-muted">Categories</dt><dd>{p.categorySlugs.join(", ") || "—"}</dd>
              <dt className="text-muted">Modes</dt><dd>{p.consultationModes.map(modeLabel).join(", ")}</dd>
              <dt className="text-muted">Base fee</dt><dd>{formatCurrency(Number(p.startingFee))} / {p.slotDurationMinutes} min</dd>
            </dl>
            {p.bio && <p className="mt-3 text-sm whitespace-pre-wrap border-t border-border pt-3">{p.bio}</p>}
          </Card>

          <Card variant="bordered">
            <CardTitle>Services ({services.data?.length ?? 0})</CardTitle>
            <ul className="mt-2 divide-y divide-border text-sm">
              {(services.data ?? []).map((s) => (
                <li key={s.id} className="py-2 flex justify-between gap-2">
                  <span>{s.title}{s.categoryName ? ` · ${s.categoryName}` : ""}{s.active ? "" : " (hidden)"}</span>
                  <span>{formatCurrency(Number(s.fee))} · {s.durationMinutes} min</span>
                </li>
              ))}
              {(services.data ?? []).length === 0 && <li className="py-2 text-muted">No packaged services.</li>}
            </ul>
          </Card>

          <Card variant="bordered">
            <CardTitle>Weekly availability</CardTitle>
            <ul className="mt-2 text-sm space-y-1">
              {(availability.data ?? []).map((r) => (
                <li key={r.id}>{r.dayOfWeek.charAt(0) + r.dayOfWeek.slice(1).toLowerCase()} {r.startTime.slice(0, 5)}–{r.endTime.slice(0, 5)}</li>
              ))}
              {(availability.data ?? []).length === 0 && <li className="text-muted">No working hours set — the consultant cannot be booked yet.</li>}
            </ul>
          </Card>

          <Card variant="bordered">
            <CardTitle>Performance</CardTitle>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-muted">Completed</dt><dd className="text-xl font-semibold">{p.completedConsultations}</dd></div>
              <div><dt className="text-muted">Rating</dt><dd className="text-xl font-semibold">{p.averageRating != null ? Number(p.averageRating).toFixed(1) : "—"}</dd></div>
              <div><dt className="text-muted">Reviews</dt><dd className="text-xl font-semibold">{p.reviewCount}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted">
              <Link className="underline" href={`/admin/marketplace/bookings?consultantId=${p.id}`}>Consultations</Link> ·{" "}
              <Link className="underline" href={`/admin/marketplace/payouts?consultantId=${p.id}`}>Payouts</Link> ·{" "}
              <Link className="underline" href="/admin/marketplace/reviews">Reviews</Link>
            </p>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card variant="elevated">
            <CardTitle>Verification decision</CardTitle>
            <CardDescription>Approval verifies the profile and makes it publicly visible. Notes are shown to the consultant.</CardDescription>
            {c.verificationNotes && <p className="mt-2 rounded bg-gray-50 p-2 text-xs">Last note: {c.verificationNotes}</p>}
            <textarea className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm" rows={3} placeholder="Notes for the consultant (reason, missing documents…)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-2">
              {(DECISIONS[c.status] ?? []).map((d) => (
                <Button key={d.action} variant={d.variant} size="sm" loading={busy} onClick={() => void run(() => adminMarketplaceApi.decide(id, d.action, notes || undefined), `Consultant ${d.label.toLowerCase()} done.`)}>
                  {d.label}
                </Button>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs text-muted mb-2">Login access</p>
              <Button size="sm" variant="outline" loading={busy} onClick={() => void run(() => adminMarketplaceApi.account(id, !c.accountActive), c.accountActive ? "Login disabled." : "Login enabled.")}>
                {c.accountActive ? "Disable login" : "Enable login"}
              </Button>
            </div>
          </Card>

          <Card variant="bordered">
            <CardTitle>Edit listing</CardTitle>
            <CardDescription>Corrections applied on the consultant&apos;s behalf are audited.</CardDescription>
            <div className="mt-3 space-y-3">
              <Input label="Base fee (₹)" type="number" min={0} value={edit.baseFee} onChange={(e) => setEdit({ ...edit, baseFee: e.target.value })} />
              <Input label="Slot length (minutes)" type="number" min={15} step={15} value={edit.slotDurationMinutes} onChange={(e) => setEdit({ ...edit, slotDurationMinutes: e.target.value })} />
              <Input label="Years of experience" type="number" min={0} max={60} value={edit.experienceYears} onChange={(e) => setEdit({ ...edit, experienceYears: e.target.value })} />
              <Button size="sm" loading={busy} onClick={() => void run(() => adminMarketplaceApi.updateConsultant(id, {
                baseFee: Number(edit.baseFee),
                slotDurationMinutes: Number(edit.slotDurationMinutes),
                experienceYears: Number(edit.experienceYears),
              }), "Listing updated.")}>
                Save changes
              </Button>
            </div>
          </Card>

          <Card variant="bordered">
            <CardTitle>Payout destination</CardTitle>
            <p className="mt-2 text-sm">
              {c.bankAccountNumberMasked ? `${c.bankAccountName ?? ""} · ${c.bankAccountNumberMasked} · ${c.bankIfsc ?? ""}` : c.upiId ? `UPI ${c.upiId}` : "Not provided"}
            </p>
            <Button className="mt-3" size="sm" variant="outline" loading={busy} onClick={() => void run(() => adminMarketplaceApi.generatePayout(id), "Payout generated for all completed, unsettled consultations.")}>
              Generate payout
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
