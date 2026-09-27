"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/platform/DataTable";
import ClientPicker from "@/components/finance/ClientPicker";
import FySelect from "@/components/finance/FySelect";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminFinanceApi } from "@/lib/finance-api";
import { LiabilityRequest, LiabilityView, TaxType, labelize } from "@/lib/finance-types";
import { UserSummary } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

export default function AdminLiabilitiesPage() {
  const [fy, setFy] = useState("");
  const [taxType, setTaxType] = useState<"" | TaxType>("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [client, setClient] = useState<UserSummary | null>(null);
  const [form, setForm] = useState<Omit<LiabilityRequest, "ownerId">>({ financialYear: "", taxType: "INCOME_TAX", amount: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const years = useApiData(() => adminFinanceApi.financialYears());
  const liabilities = useApiData(
    () => adminFinanceApi.liabilities({ fy: fy || undefined, taxType: taxType || undefined, page }),
    [fy, taxType, page],
  );
  const totalPages = liabilities.data?.totalPages ?? 0;

  const openCreate = () => {
    setForm({ financialYear: years.data?.find((y) => y.current)?.code ?? "", taxType: "INCOME_TAX", amount: 0 });
    setClient(null);
    setError(null);
    setCreating(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) {
      setError("Choose a client");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminFinanceApi.createLiability({ ...form, ownerId: client.id });
      setCreating(false);
      liabilities.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: LiabilityView) => {
    if (!window.confirm(`Delete manual liability of ${formatCurrency(row.amount)}?`)) return;
    try {
      await adminFinanceApi.deleteLiability(row.id);
      liabilities.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tax liabilities</h1>
          <p className="text-sm text-muted">
            Filing-derived liabilities follow the return and cannot be deleted here; manual entries cover demands, interest and notices.
          </p>
        </div>
        <Button onClick={openCreate}>Add manual liability</Button>
      </div>

      <Card variant="bordered" className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FySelect years={years.data ?? []} value={fy} onChange={(v) => { setFy(v); setPage(0); }} />
          <select className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" value={taxType} onChange={(e) => { setTaxType(e.target.value as "" | TaxType); setPage(0); }}>
            <option value="">All tax types</option>
            <option value="INCOME_TAX">Income tax</option>
            <option value="GST">GST</option>
          </select>
          <span className="text-sm text-muted">{liabilities.data?.totalElements ?? 0} records</span>
        </div>
      </Card>

      {(error || liabilities.error) && <p className="text-sm text-danger">{error ?? liabilities.error}</p>}

      <Card variant="bordered">
        <CardTitle>Liabilities</CardTitle>
        <CardDescription>Click the client to open their 360° view.</CardDescription>
        <DataTable<LiabilityView>
          rows={liabilities.data?.content ?? []}
          rowKey={(r) => r.id}
          emptyMessage={liabilities.isLoading ? "Loading…" : "No liabilities match."}
          columns={[
            { header: "Client", cell: (r) => <Link href={`/admin/finance/clients/${r.ownerId}`} className="text-primary hover:underline text-xs font-mono">{r.ownerId.slice(0, 8)}…</Link> },
            { header: "FY / AY", cell: (r) => `${r.financialYear} / ${r.assessmentYear}` },
            { header: "Tax", cell: (r) => labelize(r.taxType) },
            { header: "Period", cell: (r) => r.period ?? "-" },
            { header: "Amount", align: "right", cell: (r) => formatCurrency(r.amount) },
            { header: "Due", cell: (r) => r.dueDate ?? "-" },
            { header: "Source", cell: (r) => (r.source === "FILING" ? "Filed return" : "Manual") },
            { header: "Notes", cell: (r) => <span className="text-xs text-muted">{r.notes ?? ""}</span> },
            { header: "", cell: (r) => (r.source === "MANUAL" ? <Button size="sm" variant="ghost" onClick={() => remove(r)}>Delete</Button> : null) },
          ]}
        />
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button type="button" className="underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-muted">Page {page + 1} of {totalPages}</span>
            <button type="button" className="underline disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </Card>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Add manual liability" size="lg">
        <form onSubmit={submit} className="space-y-3">
          <ClientPicker value={client} onChange={setClient} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="block font-medium mb-1.5">Financial year *</span>
              <select className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" value={form.financialYear} onChange={(e) => setForm({ ...form, financialYear: e.target.value })} required>
                <option value="">Select</option>
                {years.data?.map((y) => <option key={y.code} value={y.code}>FY {y.code}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="block font-medium mb-1.5">Tax type *</span>
              <select className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" value={form.taxType} onChange={(e) => setForm({ ...form, taxType: e.target.value as TaxType })}>
                <option value="INCOME_TAX">Income tax</option>
                <option value="GST">GST</option>
              </select>
            </label>
            <Input label="Amount (₹)" type="number" min={0} step="0.01" required value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            <Input label="Due date" type="date" value={form.dueDate ?? ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value || undefined })} />
            <Input label="Period" placeholder="e.g. Q2 or 2025-07" value={form.period ?? ""} onChange={(e) => setForm({ ...form, period: e.target.value || undefined })} />
          </div>
          <Input label="Notes" placeholder="Demand notice reference, interest u/s 234B, …" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
