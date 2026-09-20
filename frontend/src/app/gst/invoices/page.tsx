"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import GuidedField, { usePortalText } from "@/components/filing/GuidedField";
import DataTable from "@/components/platform/DataTable";
import CaseSelector from "@/components/platform/CaseSelector";
import { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";
import { InvoiceView } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

const DOCUMENT_TYPES = [
  "SALES",
  "SALES_RETURN",
  "CREDIT_NOTE",
  "DEBIT_NOTE_ISSUED",
  "PURCHASE",
  "PURCHASE_RETURN",
  "DEBIT_NOTE_RECEIVED",
];

const SUPPLY_TYPES = ["TAXABLE", "EXEMPT", "NIL_RATED", "NON_GST", "ZERO_RATED", "REVERSE_CHARGE"];

const EMPTY_INVOICE = {
  documentType: "SALES",
  supplyType: "TAXABLE",
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  counterpartyGstin: "",
  counterpartyName: "",
  placeOfSupply: "",
  hsnSacCode: "",
  taxableValue: "",
  cgst: "",
  sgst: "",
  igst: "",
  cess: "",
};

function InvoiceBook() {
  const searchParams = useSearchParams();
  const filings = useApiData(() => customerApi.cases({ taxType: "GST" }));
  const [selectedId, setSelectedId] = useState("");
  const caseId = selectedId.length > 0
    ? selectedId
    : searchParams.get("case") ?? filings.data?.content[0]?.id ?? "";

  const invoices = useApiData(
    () => (caseId.length === 0 ? Promise.resolve(null) : customerApi.gstInvoices(caseId)),
    [caseId],
  );
  const [form, setForm] = useState(EMPTY_INVOICE);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const t = usePortalText();
  const selectClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

  const totals = useMemo(() => {
    const rows = invoices.data?.content ?? [];
    return rows.reduce(
      (accumulator, invoice) => ({
        taxableValue: accumulator.taxableValue + invoice.taxableValue,
        tax: accumulator.tax + invoice.totalTax,
      }),
      { taxableValue: 0, tax: 0 },
    );
  }, [invoices.data]);

  const numeric = (value: string): number | undefined => (value.length === 0 ? undefined : Number(value));

  const addInvoice = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await customerApi.addGstInvoice(caseId, {
        documentType: form.documentType,
        supplyType: form.supplyType,
        invoiceNumber: form.invoiceNumber,
        invoiceDate: form.invoiceDate,
        counterpartyGstin: form.counterpartyGstin.length > 0 ? form.counterpartyGstin : undefined,
        counterpartyName: form.counterpartyName,
        placeOfSupply: form.placeOfSupply,
        hsnSacCode: form.hsnSacCode,
        taxableValue: numeric(form.taxableValue) ?? 0,
        cgst: numeric(form.cgst),
        sgst: numeric(form.sgst),
        igst: numeric(form.igst),
        cess: numeric(form.cess),
      });
      setForm({ ...EMPTY_INVOICE, documentType: form.documentType, supplyType: form.supplyType });
      setFeedback({ tone: "ok", message: "Invoice recorded." });
      invoices.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setIsSaving(false);
    }
  };

  const uploadCsv = async (file: File) => {
    setFeedback(null);
    try {
      const result = await customerApi.importGstCsv(caseId, file);
      setFeedback({
        tone: result.rejected.length > 0 ? "error" : "ok",
        message: `${result.imported} imported, ${result.duplicates} duplicate(s) skipped`
          + (result.rejected.length > 0 ? `, ${result.rejected.length} row(s) rejected` : "."),
      });
      invoices.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("gst.invoices.title")}</h1>
          <p className="text-sm text-muted">{t("gst.invoices.subtitle")}</p>
        </div>
        <CaseSelector
          cases={filings.data?.content ?? []}
          selectedId={caseId}
          onSelect={setSelectedId}
        />
      </div>

      {caseId.length === 0 ? (
        <Card variant="bordered">
          <p className="text-sm text-muted">
            Start a return on the <Link className="text-primary hover:underline" href="/gst/returns">returns page</Link> to
            record invoices.
          </p>
        </Card>
      ) : (
        <>
          <Card variant="bordered">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{t("gst.invoices.import.title")}</CardTitle>
                <CardDescription>{t("gst.invoices.import.body")}</CardDescription>
              </div>
              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file !== undefined) {
                      void uploadCsv(file);
                    }
                    event.target.value = "";
                  }}
                />
                <Button variant="outline" onClick={() => fileInput.current?.click()}>Upload CSV</Button>
              </div>
            </div>
          </Card>

          <Card variant="bordered">
            <CardTitle>{t("gst.invoices.add.title")}</CardTitle>
            <CardDescription>{t("gst.invoices.add.body")}</CardDescription>
            <div className="grid gap-4 md:grid-cols-3 mt-4">
              <GuidedField guide="gst.invoice.documentType">
                <select className={selectClass} value={form.documentType}
                  onChange={(event) => setForm({ ...form, documentType: event.target.value })}>
                  {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{humanise(type)}</option>)}
                </select>
              </GuidedField>
              <GuidedField guide="gst.invoice.supplyType">
                <select className={selectClass} value={form.supplyType}
                  onChange={(event) => setForm({ ...form, supplyType: event.target.value })}>
                  {SUPPLY_TYPES.map((type) => <option key={type} value={type}>{humanise(type)}</option>)}
                </select>
              </GuidedField>
              <GuidedField guide="gst.invoice.number" value={form.invoiceNumber}
                onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })} />
              <GuidedField guide="gst.invoice.date" type="date" value={form.invoiceDate}
                onChange={(event) => setForm({ ...form, invoiceDate: event.target.value })} />
              <GuidedField guide="gst.invoice.counterpartyGstin" value={form.counterpartyGstin} maxLength={15}
                onChange={(event) => setForm({ ...form, counterpartyGstin: event.target.value.toUpperCase() })} />
              <GuidedField guide="gst.invoice.counterpartyName" value={form.counterpartyName}
                onChange={(event) => setForm({ ...form, counterpartyName: event.target.value })} />
              <GuidedField guide="gst.invoice.placeOfSupply" value={form.placeOfSupply}
                onChange={(event) => setForm({ ...form, placeOfSupply: event.target.value })} />
              <GuidedField guide="gst.invoice.hsn" value={form.hsnSacCode}
                onChange={(event) => setForm({ ...form, hsnSacCode: event.target.value })} />
              <GuidedField guide="gst.invoice.taxableValue" type="number" min={0} rupee value={form.taxableValue}
                onChange={(event) => setForm({ ...form, taxableValue: event.target.value })} />
              <GuidedField guide="gst.invoice.cgst" type="number" min={0} rupee value={form.cgst}
                onChange={(event) => setForm({ ...form, cgst: event.target.value })} />
              <GuidedField guide="gst.invoice.sgst" type="number" min={0} rupee value={form.sgst}
                onChange={(event) => setForm({ ...form, sgst: event.target.value })} />
              <GuidedField guide="gst.invoice.igst" type="number" min={0} rupee value={form.igst}
                onChange={(event) => setForm({ ...form, igst: event.target.value })} />
            </div>
            {feedback !== null && (
              <p className={`text-sm mt-3 ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>
                {feedback.message}
              </p>
            )}
            <Button className="mt-4" loading={isSaving} onClick={addInvoice}>{t("gst.invoices.add.button")}</Button>
          </Card>

          <Card variant="bordered">
            <div className="flex items-center justify-between">
              <CardTitle>{t("gst.invoices.list.title")}</CardTitle>
              <p className="text-sm text-muted">
                {formatCurrency(totals.taxableValue)} taxable · {formatCurrency(totals.tax)} tax
              </p>
            </div>
            {invoices.error !== null && <p className="text-sm text-danger mt-2">{invoices.error}</p>}
            <DataTable<InvoiceView>
              rows={invoices.data?.content ?? []}
              rowKey={(row) => row.id}
              emptyMessage="No invoices recorded for this return yet."
              columns={[
                { header: "Number", cell: (row) => <span className="font-mono">{row.invoiceNumber}</span> },
                { header: "Date", cell: (row) => row.invoiceDate },
                { header: "Type", cell: (row) => humanise(row.documentType) },
                { header: "Source", cell: (row) => humanise(row.source) },
                { header: "Counterparty", cell: (row) => row.counterpartyName ?? row.counterpartyGstin ?? "-" },
                { header: "Taxable", align: "right", cell: (row) => formatCurrency(row.taxableValue) },
                { header: "Tax", align: "right", cell: (row) => formatCurrency(row.totalTax) },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default function GstInvoicesPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-sm text-muted">Loading…</div>}>
      <InvoiceBook />
    </Suspense>
  );
}
