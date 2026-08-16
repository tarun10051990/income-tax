"use client";

import Link from "next/link";
import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DataTable from "@/components/platform/DataTable";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";
import { CaseSummary } from "@/lib/platform-types";

const RETURN_TYPES = ["GSTR_1", "GSTR_3B", "GSTR_4", "GSTR_9"];

function financialYearFor(period: string): string {
  const [year, month] = period.split("-").map((part) => Number.parseInt(part, 10));
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${`${startYear + 1}`.slice(2)}`;
}

export default function GstReturnsPage() {
  const profiles = useApiData(() => customerApi.gstProfiles());
  const filings = useApiData(() => customerApi.cases({ taxType: "GST" }));
  const [gstProfileId, setGstProfileId] = useState("");
  const [returnType, setReturnType] = useState("GSTR_1");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selectedProfile = gstProfileId.length > 0 ? gstProfileId : profiles.data?.[0]?.id ?? "";

  const create = async () => {
    setIsCreating(true);
    setFeedback(null);
    try {
      const created = await customerApi.createGstFiling({
        gstProfileId: selectedProfile,
        returnType,
        period,
        financialYear: financialYearFor(period),
      });
      setFeedback({
        tone: "ok",
        message: `${created.caseNumber} created. The due date is ${created.dueDate ?? "not configured"}.`,
      });
      filings.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">GST returns</h1>
        <p className="text-sm text-muted">
          Start a return for a period, then load invoices and reconcile before you submit it for review.
        </p>
      </div>

      <Card variant="bordered">
        <CardTitle>Start a return</CardTitle>
        <CardDescription>
          The due date comes from the deadline configuration your tax team maintains, not from a hard coded date.
        </CardDescription>
        <div className="grid gap-4 md:grid-cols-3 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Registration</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={selectedProfile}
              onChange={(event) => setGstProfileId(event.target.value)}
            >
              {(profiles.data ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.gstin} — {profile.legalName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Return</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={returnType}
              onChange={(event) => setReturnType(event.target.value)}
            >
              {RETURN_TYPES.map((type) => (
                <option key={type} value={type}>{humanise(type)}</option>
              ))}
            </select>
          </div>
          <Input
            label="Period"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </div>
        {(profiles.data ?? []).length === 0 && !profiles.isLoading && (
          <p className="text-sm text-muted mt-3">
            Add a GSTIN on the <Link className="text-primary hover:underline" href="/gst/profile">registrations page</Link> first.
          </p>
        )}
        {feedback !== null && (
          <p className={`text-sm mt-3 ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>
            {feedback.message}
          </p>
        )}
        <Button
          className="mt-4"
          loading={isCreating}
          disabled={selectedProfile.length === 0}
          onClick={create}
        >
          Create return
        </Button>
      </Card>

      <Card variant="bordered">
        <CardTitle>Returns</CardTitle>
        {filings.error !== null && <p className="text-sm text-danger mt-2">{filings.error}</p>}
        <DataTable<CaseSummary>
          rows={filings.data?.content ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No returns yet."
          columns={[
            { header: "Case", cell: (row) => row.caseNumber },
            { header: "Return", cell: (row) => humanise(row.returnType ?? "-") },
            { header: "Period", cell: (row) => row.period ?? "-" },
            { header: "Due", cell: (row) => row.dueDate ?? "-" },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
            {
              header: "",
              align: "right",
              cell: (row) => (
                <span className="flex gap-3 justify-end">
                  <Link className="text-primary hover:underline" href={`/gst/invoices?case=${row.id}`}>Invoices</Link>
                  <Link className="text-primary hover:underline" href={`/gst/reconciliation?case=${row.id}`}>
                    Reconcile
                  </Link>
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
