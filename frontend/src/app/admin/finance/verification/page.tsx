"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/platform/DataTable";
import StatusBadge from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminFinanceApi } from "@/lib/finance-api";
import { InvestmentView, TaxPaymentView, VerificationDecision, VerificationStatus, labelize } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";

type Kind = "investments" | "payments";
type Target = { kind: "investments"; row: InvestmentView } | { kind: "payments"; row: TaxPaymentView };

const STATUSES: ("" | VerificationStatus)[] = ["PENDING", "VERIFIED", "REJECTED", ""];

export default function VerificationQueuePage() {
  const [kind, setKind] = useState<Kind>("investments");
  const [status, setStatus] = useState<"" | VerificationStatus>("PENDING");
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [decision, setDecision] = useState<VerificationDecision>({ status: "VERIFIED" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const investments = useApiData(
    () => (kind === "investments" ? adminFinanceApi.investments({ status: status || undefined, page }) : Promise.resolve(null)),
    [kind, status, page],
  );
  const payments = useApiData(
    () => (kind === "payments" ? adminFinanceApi.payments({ status: status || undefined, page }) : Promise.resolve(null)),
    [kind, status, page],
  );
  const current = kind === "investments" ? investments : payments;
  const totalPages = current.data?.totalPages ?? 0;

  const open = (t: Target) => {
    setTarget(t);
    setDecision({ status: "VERIFIED", correctedAmount: t.row.amount, correctedEligibleAmount: t.kind === "investments" ? t.row.taxSavingEligibleAmount : undefined });
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      if (target.kind === "investments") await adminFinanceApi.verifyInvestment(target.row.id, decision);
      else await adminFinanceApi.verifyPayment(target.row.id, { ...decision, correctedEligibleAmount: undefined });
      setTarget(null);
      current.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const owner = (row: InvestmentView | TaxPaymentView) => (
    <div>
      <Link href={`/admin/finance/clients/${row.ownerId}`} className="font-medium text-primary hover:underline">
        {row.ownerName ?? row.ownerId}
      </Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Verification queue</h1>
        <p className="text-sm text-muted">
          Client-entered investments and tax payments. Only verified payments count towards tax paid; verified records are locked for the client.
        </p>
      </div>

      <Card variant="bordered" className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {(["investments", "payments"] as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`px-3 py-2 ${kind === k ? "bg-primary text-white" : "bg-surface text-muted hover:text-foreground"}`}
                onClick={() => { setKind(k); setPage(0); }}
              >
                {k === "investments" ? "Investments" : "Tax payments"}
              </button>
            ))}
          </div>
          <select
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={status}
            onChange={(e) => { setStatus(e.target.value as "" | VerificationStatus); setPage(0); }}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s ? labelize(s) : "All statuses"}</option>)}
          </select>
          <span className="text-sm text-muted">{current.data?.totalElements ?? 0} records</span>
        </div>
      </Card>

      {current.error && <p className="text-sm text-danger">{current.error}</p>}

      <Card variant="bordered">
        {kind === "investments" ? (
          <DataTable<InvestmentView>
            rows={investments.data?.content ?? []}
            rowKey={(r) => r.id}
            emptyMessage={investments.isLoading ? "Loading…" : "Nothing in this queue."}
            columns={[
              { header: "Client", cell: owner },
              { header: "Date", cell: (r) => r.investedOn },
              { header: "FY", cell: (r) => r.financialYear },
              { header: "Type", cell: (r) => `${labelize(r.type)}${r.name ? ` · ${r.name}` : ""}` },
              { header: "Section", cell: (r) => r.section ?? "-" },
              { header: "Amount", align: "right", cell: (r) => formatCurrency(r.amount) },
              { header: "Eligible", align: "right", cell: (r) => formatCurrency(r.taxSavingEligibleAmount) },
              { header: "Proof", cell: (r) => (r.proofDocumentId ? <Link href={`/admin/documents`} className="text-primary text-xs">Document</Link> : <span className="text-xs text-muted">None</span>) },
              { header: "Status", cell: (r) => <StatusBadge status={r.verificationStatus} /> },
              { header: "", cell: (r) => <Button size="sm" variant="outline" onClick={() => open({ kind: "investments", row: r })}>Review</Button> },
            ]}
          />
        ) : (
          <DataTable<TaxPaymentView>
            rows={payments.data?.content ?? []}
            rowKey={(r) => r.id}
            emptyMessage={payments.isLoading ? "Loading…" : "Nothing in this queue."}
            columns={[
              { header: "Client", cell: owner },
              { header: "Paid on", cell: (r) => r.paidOn },
              { header: "FY / AY", cell: (r) => `${r.financialYear} / ${r.assessmentYear}` },
              { header: "Type", cell: (r) => labelize(r.type) },
              { header: "Challan", cell: (r) => <span className="font-mono text-xs">{r.challanNumber ?? "-"}</span> },
              { header: "Method", cell: (r) => labelize(r.paymentMethod) },
              { header: "Amount", align: "right", cell: (r) => formatCurrency(r.amount) },
              { header: "Proof", cell: (r) => (r.proofDocumentId ? <Link href={`/admin/documents`} className="text-primary text-xs">Document</Link> : <span className="text-xs text-muted">None</span>) },
              { header: "Status", cell: (r) => <StatusBadge status={r.verificationStatus} /> },
              { header: "", cell: (r) => <Button size="sm" variant="outline" onClick={() => open({ kind: "payments", row: r })}>Review</Button> },
            ]}
          />
        )}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button type="button" className="underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-muted">Page {page + 1} of {totalPages}</span>
            <button type="button" className="underline disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </Card>

      <Modal isOpen={target !== null} onClose={() => setTarget(null)} title={target?.kind === "investments" ? "Verify investment" : "Verify tax payment"}>
        {target && (
          <form onSubmit={submit} className="space-y-3">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium">{target.row.ownerName ?? target.row.ownerId}</p>
              <p className="text-muted">
                {labelize(target.row.type)} · {formatCurrency(target.row.amount)} · {target.kind === "investments" ? target.row.investedOn : target.row.paidOn}
              </p>
              {target.row.notes && <p className="mt-1 text-xs text-muted">Client note: {target.row.notes}</p>}
            </div>
            <label className="text-sm block">
              <span className="block font-medium mb-1.5">Decision</span>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={decision.status}
                onChange={(e) => setDecision({ ...decision, status: e.target.value as VerificationStatus })}
              >
                <option value="VERIFIED">Verify</option>
                <option value="REJECTED">Reject</option>
                <option value="PENDING">Keep pending</option>
              </select>
            </label>
            <Input
              label="Corrected amount (₹)"
              type="number"
              min={0.01}
              step="0.01"
              value={decision.correctedAmount ?? ""}
              onChange={(e) => setDecision({ ...decision, correctedAmount: e.target.value === "" ? undefined : Number(e.target.value) })}
              helperText="Leave as-is unless the proof shows a different figure"
            />
            {target.kind === "investments" && (
              <Input
                label="Corrected tax-saving eligible amount (₹)"
                type="number"
                min={0}
                step="0.01"
                value={decision.correctedEligibleAmount ?? ""}
                onChange={(e) => setDecision({ ...decision, correctedEligibleAmount: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            )}
            <Input label="Note to client" value={decision.note ?? ""} onChange={(e) => setDecision({ ...decision, note: e.target.value || undefined })} required={decision.status === "REJECTED"} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
              <Button type="submit" loading={busy} variant={decision.status === "REJECTED" ? "danger" : "primary"}>Save decision</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
