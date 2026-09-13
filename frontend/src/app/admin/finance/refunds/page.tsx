"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/platform/DataTable";
import StatusBadge from "@/components/platform/StatusBadge";
import ClientPicker from "@/components/finance/ClientPicker";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminFinanceApi } from "@/lib/finance-api";
import { REFUND_STATUSES, RefundRequest, RefundStatus, RefundUpdate, RefundView, TaxType, labelize } from "@/lib/finance-types";
import { UserSummary } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

const SELECT = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export default function AdminRefundsPage() {
  const [status, setStatus] = useState<"" | RefundStatus>("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<RefundView | null>(null);
  const [update, setUpdate] = useState<RefundUpdate>({});
  const [creating, setCreating] = useState(false);
  const [client, setClient] = useState<UserSummary | null>(null);
  const [form, setForm] = useState<Omit<RefundRequest, "ownerId">>({ financialYear: "", taxType: "INCOME_TAX", amountClaimed: 0, status: "CLAIMED" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const years = useApiData(() => adminFinanceApi.financialYears());
  const refunds = useApiData(() => adminFinanceApi.refunds({ status: status || undefined, page }), [status, page]);
  const totalPages = refunds.data?.totalPages ?? 0;

  const openEdit = (r: RefundView) => {
    setEditing(r);
    setUpdate({ amountClaimed: r.amountClaimed, amountReceived: r.amountReceived, status: r.status, referenceNumber: r.referenceNumber ?? undefined, receivedOn: r.receivedOn ?? undefined, notes: r.notes ?? undefined });
    setError(null);
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await adminFinanceApi.updateRefund(editing.id, update);
      setEditing(null);
      refunds.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const saveCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) {
      setError("Choose a client");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminFinanceApi.createRefund({ ...form, ownerId: client.id });
      setCreating(false);
      refunds.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Refunds</h1>
          <p className="text-sm text-muted">Track department refunds from claim to credit. Filed returns create these automatically when tax paid exceeds liability.</p>
        </div>
        <Button onClick={() => { setForm({ financialYear: years.data?.find((y) => y.current)?.code ?? "", taxType: "INCOME_TAX", amountClaimed: 0, status: "CLAIMED" }); setClient(null); setError(null); setCreating(true); }}>
          Record refund
        </Button>
      </div>

      <Card variant="bordered" className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value as "" | RefundStatus); setPage(0); }}>
            <option value="">All statuses</option>
            {REFUND_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
          </select>
          <span className="text-sm text-muted">{refunds.data?.totalElements ?? 0} refunds</span>
        </div>
      </Card>

      {(error || refunds.error) && !editing && !creating && <p className="text-sm text-danger">{error ?? refunds.error}</p>}

      <Card variant="bordered">
        <CardTitle>Refunds</CardTitle>
        <CardDescription>Click Update to record the department reference, status and amount credited.</CardDescription>
        <DataTable<RefundView>
          rows={refunds.data?.content ?? []}
          rowKey={(r) => r.id}
          emptyMessage={refunds.isLoading ? "Loading…" : "No refunds match."}
          columns={[
            { header: "Client", cell: (r) => <Link href={`/admin/finance/clients/${r.ownerId}`} className="text-primary hover:underline">{r.ownerName ?? r.ownerId}</Link> },
            { header: "FY / AY", cell: (r) => `${r.financialYear} / ${r.assessmentYear}` },
            { header: "Tax", cell: (r) => labelize(r.taxType) },
            { header: "Claimed", align: "right", cell: (r) => formatCurrency(r.amountClaimed) },
            { header: "Received", align: "right", cell: (r) => formatCurrency(r.amountReceived) },
            { header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.referenceNumber ?? "-"}</span> },
            { header: "Received on", cell: (r) => r.receivedOn ?? "-" },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            { header: "", cell: (r) => <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Update</Button> },
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

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="Update refund" size="lg">
        {editing && (
          <form onSubmit={saveEdit} className="space-y-3">
            <p className="text-sm text-muted">{editing.ownerName} · FY {editing.financialYear} · {labelize(editing.taxType)}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="block font-medium mb-1.5">Status</span>
                <select className={SELECT} value={update.status ?? editing.status} onChange={(e) => setUpdate({ ...update, status: e.target.value as RefundStatus })}>
                  {REFUND_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
                </select>
              </label>
              <Input label="Department reference" value={update.referenceNumber ?? ""} onChange={(e) => setUpdate({ ...update, referenceNumber: e.target.value || undefined })} />
              <Input label="Amount claimed (₹)" type="number" min={0} step="0.01" value={update.amountClaimed ?? ""} onChange={(e) => setUpdate({ ...update, amountClaimed: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <Input label="Amount received (₹)" type="number" min={0} step="0.01" value={update.amountReceived ?? ""} onChange={(e) => setUpdate({ ...update, amountReceived: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <Input label="Received on" type="date" value={update.receivedOn ?? ""} onChange={(e) => setUpdate({ ...update, receivedOn: e.target.value || undefined })} />
            </div>
            <Input label="Notes" value={update.notes ?? ""} onChange={(e) => setUpdate({ ...update, notes: e.target.value || undefined })} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>Save</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Record refund" size="lg">
        <form onSubmit={saveCreate} className="space-y-3">
          <ClientPicker value={client} onChange={setClient} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="block font-medium mb-1.5">Financial year *</span>
              <select className={SELECT} value={form.financialYear} onChange={(e) => setForm({ ...form, financialYear: e.target.value })} required>
                <option value="">Select</option>
                {years.data?.map((y) => <option key={y.code} value={y.code}>FY {y.code}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="block font-medium mb-1.5">Tax type *</span>
              <select className={SELECT} value={form.taxType} onChange={(e) => setForm({ ...form, taxType: e.target.value as TaxType })}>
                <option value="INCOME_TAX">Income tax</option>
                <option value="GST">GST</option>
              </select>
            </label>
            <Input label="Amount claimed (₹)" type="number" min={0} step="0.01" required value={form.amountClaimed || ""} onChange={(e) => setForm({ ...form, amountClaimed: Number(e.target.value) })} />
            <label className="text-sm">
              <span className="block font-medium mb-1.5">Status</span>
              <select className={SELECT} value={form.status ?? "CLAIMED"} onChange={(e) => setForm({ ...form, status: e.target.value as RefundStatus })}>
                {REFUND_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
              </select>
            </label>
            <Input label="Claimed on" type="date" value={form.claimedOn ?? ""} onChange={(e) => setForm({ ...form, claimedOn: e.target.value || undefined })} />
            <Input label="Department reference" value={form.referenceNumber ?? ""} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value || undefined })} />
          </div>
          <Input label="Notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })} />
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
