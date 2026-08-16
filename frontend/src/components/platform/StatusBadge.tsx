"use client";

import Badge from "@/components/ui/Badge";

const VARIANTS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  DATA_PENDING: "default",
  DOCUMENTS_PENDING: "warning",
  DATA_IMPORTED: "info",
  RECONCILIATION_PENDING: "warning",
  RECONCILIATION_COMPLETED: "info",
  UNDER_REVIEW: "info",
  QUERY_RAISED: "warning",
  USER_ACTION_REQUIRED: "warning",
  APPROVED: "success",
  READY_FOR_FILING: "info",
  FILED: "success",
  VERIFICATION_PENDING: "warning",
  VERIFIED: "success",
  ACKNOWLEDGEMENT_RECEIVED: "success",
  COMPLETED: "success",
  REJECTED: "danger",
  MATCHED: "success",
  PARTIALLY_MATCHED: "warning",
  MISMATCH: "danger",
  MISSING_IN_PORTAL: "danger",
  MISSING_IN_BOOKS: "danger",
  DUPLICATE: "warning",
  NEEDS_REVIEW: "warning",
  PAID: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "info",
  OPEN: "warning",
  RESOLVED: "success",
  CLOSED: "default",
  URGENT: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "default",
};

/** Turns an API enum such as READY_FOR_FILING into "Ready for filing" with a matching colour. */
export function humanise(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? "default"}>{humanise(status)}</Badge>;
}
