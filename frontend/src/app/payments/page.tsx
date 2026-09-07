"use client";

import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import DataTable from "@/components/platform/DataTable";
import StatusBadge from "@/components/platform/StatusBadge";
import { useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";
import { PaymentView } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

export default function CustomerPaymentsPage() {
  const payments = useApiData(() => customerApi.payments());
  const rows = payments.data?.content ?? [];
  const outstanding = rows
    .filter((payment) => payment.status !== "PAID")
    .reduce((total, payment) => total + payment.totalAmount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted">
          Professional fees for the filing service. Government tax payable is shown on each return, not here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="bordered">
          <CardTitle>Invoices</CardTitle>
          <p className="text-3xl font-semibold mt-2">{rows.length}</p>
        </Card>
        <Card variant="bordered">
          <CardTitle>Outstanding</CardTitle>
          <p className="text-3xl font-semibold mt-2">{formatCurrency(outstanding)}</p>
          <CardDescription>Fees awaiting payment</CardDescription>
        </Card>
        <Card variant="bordered">
          <CardTitle>Paid</CardTitle>
          <p className="text-3xl font-semibold mt-2">
            {formatCurrency(rows.filter((payment) => payment.status === "PAID")
              .reduce((total, payment) => total + payment.totalAmount, 0))}
          </p>
        </Card>
      </div>

      <Card variant="bordered">
        <CardTitle>Fee invoices</CardTitle>
        {payments.error !== null && <p className="text-sm text-danger mt-2">{payments.error}</p>}
        <DataTable<PaymentView>
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No fee invoices have been raised for you."
          columns={[
            { header: "Invoice", cell: (row) => <span className="font-mono">{row.invoiceNumber}</span> },
            { header: "For", cell: (row) => row.description ?? row.caseNumber ?? "-" },
            { header: "Due", cell: (row) => row.dueDate ?? "-" },
            { header: "Fee", align: "right", cell: (row) => formatCurrency(row.amount) },
            { header: "Tax", align: "right", cell: (row) => formatCurrency(row.taxAmount) },
            { header: "Total", align: "right", cell: (row) => formatCurrency(row.totalAmount) },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </Card>
    </div>
  );
}
