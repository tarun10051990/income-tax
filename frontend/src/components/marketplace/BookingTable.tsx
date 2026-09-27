"use client";

import Badge from "@/components/ui/Badge";
import DataTable from "@/components/platform/DataTable";
import { humanise } from "@/components/platform/StatusBadge";
import { BookingView, formatDateTime, modeLabel } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

const TONES: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  REQUESTED: "warning",
  PAYMENT_PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "default",
  RESCHEDULED: "info",
  NO_SHOW: "danger",
  REFUND_REQUESTED: "warning",
  REFUNDED: "default",
  PENDING_VERIFICATION: "warning",
  UNDER_REVIEW: "info",
  APPROVED: "success",
  ACTIVE: "success",
  SUSPENDED: "danger",
  REJECTED: "danger",
  PAID: "success",
  PENDING: "warning",
  PUBLISHED: "success",
  HIDDEN: "default",
};

export function MarketplaceStatus({ status }: { status: string }) {
  return <Badge variant={TONES[status] ?? "default"}>{humanise(status)}</Badge>;
}

export default function BookingTable({
  rows,
  perspective,
  onRowClick,
  emptyMessage,
}: {
  rows: BookingView[];
  perspective: "client" | "consultant" | "admin";
  onRowClick?: (booking: BookingView) => void;
  emptyMessage?: string;
}) {
  return (
    <DataTable<BookingView>
      rows={rows}
      rowKey={(row) => row.id}
      onRowClick={onRowClick}
      emptyMessage={emptyMessage}
      columns={[
        { header: "Reference", cell: (row) => <span className="font-mono text-xs">{row.reference}</span> },
        {
          header: perspective === "consultant" ? "Client" : "Consultant",
          cell: (row) =>
            perspective === "consultant" ? row.clientName : (
              <span>
                {row.consultantName}
                <span className="block text-xs text-muted">{row.consultantType}</span>
              </span>
            ),
        },
        { header: "Service", cell: (row) => row.serviceTitle ?? row.categoryName ?? "General consultation" },
        { header: "When", cell: (row) => `${formatDateTime(row.scheduledStart)} · ${modeLabel(row.mode)}` },
        {
          header: perspective === "consultant" ? "Your earning" : "Total",
          align: "right",
          cell: (row) =>
            formatCurrency(Number(perspective === "consultant" ? row.consultantEarning ?? 0 : row.totalAmount)),
        },
        { header: "Status", cell: (row) => <MarketplaceStatus status={row.status} /> },
      ]}
    />
  );
}
