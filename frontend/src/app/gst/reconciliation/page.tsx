"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import DataTable from "@/components/platform/DataTable";
import CaseSelector from "@/components/platform/CaseSelector";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";
import { ReconciliationView } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

function Reconciliation() {
  const searchParams = useSearchParams();
  const filings = useApiData(() => customerApi.cases({ taxType: "GST" }));
  const [selectedId, setSelectedId] = useState("");
  const caseId = selectedId.length > 0
    ? selectedId
    : searchParams.get("case") ?? filings.data?.content[0]?.id ?? "";

  const summary = useApiData(
    () => (caseId.length === 0 ? Promise.resolve(null) : customerApi.reconciliationSummary(caseId)),
    [caseId],
  );
  const computation = useApiData(
    () => (caseId.length === 0 ? Promise.resolve(null) : customerApi.gstComputation(caseId)),
    [caseId],
  );

  const [entries, setEntries] = useState<ReconciliationView[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const run = async () => {
    setIsRunning(true);
    setFeedback(null);
    try {
      setEntries(await customerApi.runReconciliation(caseId));
      summary.reload();
      computation.reload();
      filings.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setIsRunning(false);
    }
  };

  const submit = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const updated = await customerApi.submitGstFiling(caseId);
      setFeedback({
        tone: "ok",
        message: `Sent for review. ${updated.caseNumber} is now ${humanise(updated.status).toLowerCase()}.`,
      });
      filings.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const money = (value: number | undefined) => formatCurrency(value ?? 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reconciliation</h1>
          <p className="text-sm text-muted">
            Compares your books against the invoices downloaded from the portal and flags the differences.
          </p>
        </div>
        <CaseSelector cases={filings.data?.content ?? []} selectedId={caseId} onSelect={setSelectedId} />
      </div>

      {caseId.length === 0 ? (
        <Card variant="bordered">
          <p className="text-sm text-muted">
            Start a return on the <Link className="text-primary hover:underline" href="/gst/returns">returns page</Link> first.
          </p>
        </Card>
      ) : (
        <>
          <Card variant="bordered">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Run the match</CardTitle>
                <CardDescription>
                  Invoices are matched on counterparty GSTIN, invoice number and value; anything outside tolerance is
                  flagged for review.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" loading={isRunning} onClick={run}>Run reconciliation</Button>
                <Button loading={isSubmitting} onClick={submit}>Send for review</Button>
              </div>
            </div>
            {feedback !== null && (
              <p className={`text-sm mt-3 ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>
                {feedback.message}
              </p>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(summary.data ?? {}).map(([status, count]) => (
              <Card key={status} variant="bordered">
                <StatusBadge status={status} />
                <p className="text-2xl font-semibold mt-2">{count}</p>
              </Card>
            ))}
            {Object.keys(summary.data ?? {}).length === 0 && !summary.isLoading && (
              <Card variant="bordered" className="md:col-span-4">
                <p className="text-sm text-muted">No reconciliation has been run for this return yet.</p>
              </Card>
            )}
          </div>

          <Card variant="bordered">
            <CardTitle>Liability for this period</CardTitle>
            {computation.error !== null && <p className="text-sm text-danger mt-2">{computation.error}</p>}
            <div className="grid gap-4 md:grid-cols-4 mt-4 text-sm">
              <div>
                <p className="text-muted">Output tax</p>
                <p className="text-lg font-semibold">{money(computation.data?.outputTax)}</p>
              </div>
              <div>
                <p className="text-muted">Input tax credit</p>
                <p className="text-lg font-semibold">{money(computation.data?.inputTaxCredit)}</p>
              </div>
              <div>
                <p className="text-muted">Interest and late fee</p>
                <p className="text-lg font-semibold">
                  {money((computation.data?.interest ?? 0) + (computation.data?.lateFee ?? 0))}
                </p>
              </div>
              <div>
                <p className="text-muted">Net payable</p>
                <p className="text-lg font-semibold text-primary">{money(computation.data?.netLiability)}</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              This is the government tax payable for the period. Professional fees are billed separately under payments.
            </p>
          </Card>

          {entries.length > 0 && (
            <Card variant="bordered">
              <CardTitle>Latest run</CardTitle>
              <DataTable<ReconciliationView>
                rows={entries}
                rowKey={(row) => row.id}
                columns={[
                  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
                  { header: "Invoice", cell: (row) => row.invoiceNumber ?? "-" },
                  { header: "Counterparty", cell: (row) => row.counterpartyGstin ?? "-" },
                  {
                    header: "Taxable difference",
                    align: "right",
                    cell: (row) => formatCurrency(row.taxableValueDifference),
                  },
                  { header: "Tax difference", align: "right", cell: (row) => formatCurrency(row.taxDifference) },
                  { header: "Remarks", cell: (row) => row.remarks ?? "-" },
                ]}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function GstReconciliationPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-sm text-muted">Loading…</div>}>
      <Reconciliation />
    </Suspense>
  );
}
