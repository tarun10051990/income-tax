"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/platform/DataTable";
import StatusBadge from "@/components/platform/StatusBadge";
import FySelect from "@/components/finance/FySelect";
import Kpi from "@/components/finance/Kpi";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { financeApi } from "@/lib/finance-api";
import { TAX_PAYMENT_TYPES, TaxPaymentRequest, TaxPaymentView, labelize } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";

const METHODS = ["", "NET_BANKING", "UPI", "DEBIT_CARD", "CREDIT_CARD", "NEFT_RTGS", "CHEQUE", "DEDUCTED_AT_SOURCE", "OTHER"];

const EMPTY: TaxPaymentRequest = { type: "ADVANCE_TAX", amount: 0, paidOn: new Date().toISOString().slice(0, 10) };

function toRequest(p: TaxPaymentView): TaxPaymentRequest {
  return {
    type: p.type,
    amount: p.amount,
    paidOn: p.paidOn,
    assessmentYear: p.assessmentYear,
    challanNumber: p.challanNumber ?? undefined,
    paymentMethod: p.paymentMethod ?? undefined,
    notes: p.notes ?? undefined,
    proofDocumentId: p.proofDocumentId ?? undefined,
  };
}

export default function TaxPaymentsPage() {
  const [fy, setFy] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; form: TaxPaymentRequest } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const years = useApiData(() => financeApi.financialYears());
  const payments = useApiData(() => financeApi.payments(fy || undefined), [fy]);
  const rows = payments.data ?? [];

  const verified = rows.filter((p) => p.verificationStatus === "VERIFIED").reduce((s, p) => s + p.amount, 0);
  const pending = rows.filter((p) => p.verificationStatus === "PENDING").reduce((s, p) => s + p.amount, 0);
  const rejected = rows.filter((p) => p.verificationStatus === "REJECTED").reduce((s, p) => s + p.amount, 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      if (editing.id === null) await financeApi.createPayment(editing.form);
      else await financeApi.updatePayment(editing.id, editing.form);
      setEditing(null);
      payments.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: TaxPaymentView) => {
    if (!window.confirm(`Delete ${labelize(row.type)} payment of ${formatCurrency(row.amount)}?`)) return;
    try {
      await financeApi.deletePayment(row.id);
      payments.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const update = (patch: Partial<TaxPaymentRequest>) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FySelect years={years.data ?? []} value={fy} onChange={setFy} />
        <Button onClick={() => setEditing({ id: null, form: EMPTY })}>Record tax payment</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Verified tax paid" value={verified} tone="success" hint="Counts towards your liability" />
        <Kpi label="Awaiting verification" value={pending} tone="warning" hint="Not yet counted as paid" />
        <Kpi label="Rejected" value={rejected} tone={rejected ? "danger" : "default"} hint="Check the note and re-submit" />
      </div>

      {(error || payments.error) && <p className="text-sm text-danger">{error ?? payments.error}</p>}

      <Card variant="bordered">
        <CardTitle>Government tax payments</CardTitle>
        <CardDescription>
          Advance tax, self-assessment tax, TDS and GST paid to the government. Only verified payments reduce your outstanding tax.
        </CardDescription>
        <DataTable<TaxPaymentView>
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No tax payments recorded yet."
          columns={[
            { header: "Paid on", cell: (r) => r.paidOn },
            { header: "FY / AY", cell: (r) => `${r.financialYear} / ${r.assessmentYear}` },
            { header: "Type", cell: (r) => labelize(r.type) },
            { header: "Challan / ref", cell: (r) => <span className="font-mono text-xs">{r.challanNumber ?? "-"}</span> },
            { header: "Method", cell: (r) => labelize(r.paymentMethod) },
            { header: "Amount", align: "right", cell: (r) => formatCurrency(r.amount) },
            {
              header: "Status",
              cell: (r) => (
                <div>
                  <StatusBadge status={r.verificationStatus} />
                  {r.verificationNote && <p className="mt-1 text-xs text-muted">{r.verificationNote}</p>}
                </div>
              ),
            },
            {
              header: "",
              cell: (r) =>
                r.verificationStatus === "VERIFIED" ? (
                  <span className="text-xs text-muted">Locked</span>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ id: r.id, form: toRequest(r) })}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r)}>Delete</Button>
                  </div>
                ),
            },
          ]}
        />
      </Card>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? "Edit tax payment" : "Record tax payment"} size="lg">
        {editing && (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="block font-medium mb-1.5">Type *</span>
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  value={editing.form.type}
                  onChange={(e) => update({ type: e.target.value as TaxPaymentRequest["type"] })}
                >
                  {TAX_PAYMENT_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                </select>
              </label>
              <Input label="Amount (₹)" type="number" min={1} step="0.01" required value={editing.form.amount || ""} onChange={(e) => update({ amount: Number(e.target.value) })} />
              <Input label="Paid on" type="date" required value={editing.form.paidOn} onChange={(e) => update({ paidOn: e.target.value })} helperText="The financial year is derived from this date" />
              <Input label="Assessment year" placeholder="e.g. 2026-27" value={editing.form.assessmentYear ?? ""} onChange={(e) => update({ assessmentYear: e.target.value || undefined })} helperText="Leave blank to use FY + 1" />
              <Input label="Challan / reference number" value={editing.form.challanNumber ?? ""} onChange={(e) => update({ challanNumber: e.target.value || undefined })} />
              <label className="text-sm">
                <span className="block font-medium mb-1.5">Payment method</span>
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  value={editing.form.paymentMethod ?? ""}
                  onChange={(e) => update({ paymentMethod: e.target.value || undefined })}
                >
                  {METHODS.map((m) => <option key={m} value={m}>{m ? labelize(m) : "Not specified"}</option>)}
                </select>
              </label>
              <Input label="Proof document ID" value={editing.form.proofDocumentId ?? ""} onChange={(e) => update({ proofDocumentId: e.target.value || undefined })} helperText="ID of the challan uploaded in Documents" />
            </div>
            <Input label="Notes" value={editing.form.notes ?? ""} onChange={(e) => update({ notes: e.target.value })} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
