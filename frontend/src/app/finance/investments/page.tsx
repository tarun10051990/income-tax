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
import { INVESTMENT_TYPES, InvestmentRequest, InvestmentView, labelize } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";

const SECTIONS = ["", "80C", "80CCD1B", "80D", "80E", "80G", "80TTA", "24B"];

const EMPTY: InvestmentRequest = { type: "MUTUAL_FUND", amount: 0, investedOn: new Date().toISOString().slice(0, 10) };

function toRequest(i: InvestmentView): InvestmentRequest {
  return {
    type: i.type,
    name: i.name ?? undefined,
    amount: i.amount,
    investedOn: i.investedOn,
    section: i.section ?? undefined,
    taxSavingEligibleAmount: i.taxSavingEligibleAmount,
    expectedReturn: i.expectedReturn ?? undefined,
    actualReturn: i.actualReturn ?? undefined,
    maturityDate: i.maturityDate ?? undefined,
    notes: i.notes ?? undefined,
    proofDocumentId: i.proofDocumentId ?? undefined,
  };
}

export default function InvestmentsPage() {
  const [fy, setFy] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; form: InvestmentRequest } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const years = useApiData(() => financeApi.financialYears());
  const investments = useApiData(() => financeApi.investments(fy || undefined), [fy]);
  const rows = investments.data ?? [];

  const total = rows.reduce((s, i) => s + i.amount, 0);
  const eligible = rows.reduce((s, i) => s + i.taxSavingEligibleAmount, 0);
  const verified = rows.filter((i) => i.verificationStatus === "VERIFIED").reduce((s, i) => s + i.amount, 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      if (editing.id === null) await financeApi.createInvestment(editing.form);
      else await financeApi.updateInvestment(editing.id, editing.form);
      setEditing(null);
      investments.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: InvestmentView) => {
    if (!window.confirm(`Delete ${labelize(row.type)} of ${formatCurrency(row.amount)}?`)) return;
    try {
      await financeApi.deleteInvestment(row.id);
      investments.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const update = (patch: Partial<InvestmentRequest>) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FySelect years={years.data ?? []} value={fy} onChange={setFy} />
        <Button onClick={() => setEditing({ id: null, form: EMPTY })}>Add investment</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Total invested" value={total} hint={`${rows.length} records`} />
        <Kpi label="Verified" value={verified} tone="success" hint="Confirmed by our team" />
        <Kpi label="Tax-saving eligible" value={eligible} hint="Amount you have marked as deductible" />
      </div>

      {(error || investments.error) && <p className="text-sm text-danger">{error ?? investments.error}</p>}

      <Card variant="bordered">
        <CardTitle>Investments</CardTitle>
        <CardDescription>New entries are pending until verified by our team; verified entries are locked.</CardDescription>
        <DataTable<InvestmentView>
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No investments recorded yet."
          columns={[
            { header: "Date", cell: (r) => r.investedOn },
            { header: "FY", cell: (r) => r.financialYear },
            { header: "Type", cell: (r) => labelize(r.type) },
            { header: "Name", cell: (r) => r.name ?? "-" },
            { header: "Section", cell: (r) => r.section ?? "-" },
            { header: "Amount", align: "right", cell: (r) => formatCurrency(r.amount) },
            { header: "Eligible", align: "right", cell: (r) => formatCurrency(r.taxSavingEligibleAmount) },
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

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? "Edit investment" : "Add investment"} size="lg">
        {editing && (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="block font-medium mb-1.5">Type *</span>
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  value={editing.form.type}
                  onChange={(e) => update({ type: e.target.value as InvestmentRequest["type"] })}
                >
                  {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                </select>
              </label>
              <Input label="Name / scheme" value={editing.form.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
              <Input label="Amount (₹)" type="number" min={1} step="0.01" required value={editing.form.amount || ""} onChange={(e) => update({ amount: Number(e.target.value) })} />
              <Input label="Invested on" type="date" required value={editing.form.investedOn} onChange={(e) => update({ investedOn: e.target.value })} />
              <label className="text-sm">
                <span className="block font-medium mb-1.5">Deduction section</span>
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  value={editing.form.section ?? ""}
                  onChange={(e) => update({ section: e.target.value || undefined })}
                >
                  {SECTIONS.map((s) => <option key={s} value={s}>{s || "Not tax-saving / default for type"}</option>)}
                </select>
              </label>
              <Input
                label="Tax-saving eligible amount (₹)"
                type="number"
                min={0}
                step="0.01"
                value={editing.form.taxSavingEligibleAmount ?? ""}
                onChange={(e) => update({ taxSavingEligibleAmount: e.target.value === "" ? undefined : Number(e.target.value) })}
                helperText="Cannot exceed the amount invested; defaults to the full amount for 80C/NPS types"
              />
              <Input label="Expected return (₹)" type="number" step="0.01" value={editing.form.expectedReturn ?? ""} onChange={(e) => update({ expectedReturn: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <Input label="Actual return (₹)" type="number" step="0.01" value={editing.form.actualReturn ?? ""} onChange={(e) => update({ actualReturn: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <Input label="Maturity date" type="date" value={editing.form.maturityDate ?? ""} onChange={(e) => update({ maturityDate: e.target.value || undefined })} />
              <Input label="Proof document ID" value={editing.form.proofDocumentId ?? ""} onChange={(e) => update({ proofDocumentId: e.target.value || undefined })} helperText="ID of a document uploaded in Documents" />
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
