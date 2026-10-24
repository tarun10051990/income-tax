"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DataTable from "@/components/platform/DataTable";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { PaymentView } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

const STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"];

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const payments = useApiData(() => adminApi.payments({ status, size: 50 }), [status]);
  const customers = useApiData(() => adminApi.customers({ size: 100 }));
  const [invoice, setInvoice] = useState({ customerId: "", description: "", amount: "", taxAmount: "", dueDate: "" });
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  const raise = async () => {
    setFeedback(null);
    try {
      await adminApi.raiseInvoice({
        customerId: invoice.customerId,
        description: invoice.description,
        amount: Number(invoice.amount),
        taxAmount: invoice.taxAmount.length > 0 ? Number(invoice.taxAmount) : undefined,
        dueDate: invoice.dueDate.length > 0 ? invoice.dueDate : undefined,
      });
      setInvoice({ customerId: "", description: "", amount: "", taxAmount: "", dueDate: "" });
      setFeedback({ tone: "ok", message: "Fee invoice raised." });
      payments.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    }
  };

  const record = async (paymentId: string, outcome: string) => {
    setFeedback(null);
    try {
      await adminApi.paymentOutcome(paymentId, {
        status: outcome,
        failureReason: outcome === "FAILED" ? "Reported failed by the payment provider" : undefined,
      });
      payments.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Professional fees</h1>
        <p className="text-sm text-muted">
          Service fees charged by the practice. Government tax payable is never collected here.
        </p>
      </div>

      <Card variant="bordered">
        <CardTitle>Raise a fee invoice</CardTitle>
        <CardDescription>The taxpayer is notified and can see it under payments.</CardDescription>
        <div className="grid gap-4 md:grid-cols-5 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Taxpayer</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={invoice.customerId}
              onChange={(event) => setInvoice({ ...invoice, customerId: event.target.value })}
            >
              <option value="">Select</option>
              {(customers.data?.content ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>
              ))}
            </select>
          </div>
          <Input
            label="Description"
            value={invoice.description}
            onChange={(event) => setInvoice({ ...invoice, description: event.target.value })}
          />
          <Input
            label="Fee"
            type="number"
            value={invoice.amount}
            onChange={(event) => setInvoice({ ...invoice, amount: event.target.value })}
          />
          <Input
            label="GST on the fee"
            type="number"
            value={invoice.taxAmount}
            onChange={(event) => setInvoice({ ...invoice, taxAmount: event.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            value={invoice.dueDate}
            onChange={(event) => setInvoice({ ...invoice, dueDate: event.target.value })}
          />
        </div>
        {feedback !== null && (
          <p className={`text-sm mt-3 ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>
            {feedback.message}
          </p>
        )}
        <Button
          className="mt-4"
          disabled={invoice.customerId.length === 0 || invoice.amount.length === 0}
          onClick={raise}
        >
          Raise invoice
        </Button>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full border px-3 py-1 text-sm ${
            status === undefined ? "border-primary text-primary bg-primary/5" : "border-border text-muted"
          }`}
          onClick={() => setStatus(undefined)}
        >
          All
        </button>
        {STATUSES.map((option) => (
          <button
            key={option}
            className={`rounded-full border px-3 py-1 text-sm ${
              option === status ? "border-primary text-primary bg-primary/5" : "border-border text-muted hover:bg-gray-50"
            }`}
            onClick={() => setStatus(option)}
          >
            {humanise(option)}
          </button>
        ))}
      </div>

      <Card variant="bordered">
        <CardTitle>Invoices</CardTitle>
        {payments.error !== null && <p className="text-sm text-danger mt-2">{payments.error}</p>}
        <DataTable<PaymentView>
          rows={payments.data?.content ?? []}
          rowKey={(row) => row.id}
          emptyMessage={payments.isLoading ? "Loading…" : "No invoices."}
          columns={[
            { header: "Invoice", cell: (row) => <span className="font-mono">{row.invoiceNumber}</span> },
            { header: "Case", cell: (row) => row.caseNumber ?? "-" },
            { header: "Description", cell: (row) => row.description ?? "-" },
            { header: "Total", align: "right", cell: (row) => formatCurrency(row.totalAmount) },
            { header: "Due", cell: (row) => row.dueDate ?? "-" },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
            {
              header: "",
              align: "right",
              cell: (row) => (row.status !== "PENDING" ? null : (
                <span className="flex gap-2 justify-end">
                  <button className="text-primary hover:underline" onClick={() => record(row.id, "PAID")}>
                    Mark paid
                  </button>
                  <button className="text-danger hover:underline" onClick={() => record(row.id, "FAILED")}>
                    Mark failed
                  </button>
                </span>
              )),
            },
          ]}
        />
      </Card>
    </div>
  );
}
