"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";

const REPORTS: { key: string; label: string; group: string }[] = [
  { key: "it-filing-status", label: "Filing status", group: "Income tax" },
  { key: "it-tax-liability", label: "Tax liability", group: "Income tax" },
  { key: "it-refund", label: "Refunds", group: "Income tax" },
  { key: "it-pending-documents", label: "Pending documents", group: "Income tax" },
  { key: "it-turnaround", label: "Turnaround time", group: "Income tax" },
  { key: "gst-filing-status", label: "Filing status", group: "GST" },
  { key: "gst-gstr1", label: "GSTR-1 summary", group: "GST" },
  { key: "gst-gstr3b", label: "GSTR-3B summary", group: "GST" },
  { key: "gst-itc", label: "Input tax credit", group: "GST" },
  { key: "gst-reconciliation", label: "Reconciliation", group: "GST" },
  { key: "gst-mismatch", label: "Mismatches", group: "GST" },
  { key: "gst-tax-liability", label: "Tax liability", group: "GST" },
  { key: "employee-workload", label: "Staff workload", group: "Practice" },
];

const FORMATS = ["CSV", "EXCEL", "PDF"];

export default function AdminReportsPage() {
  const [reportKey, setReportKey] = useState("it-filing-status");
  const [financialYear, setFinancialYear] = useState("");
  const [period, setPeriod] = useState("");
  const report = useApiData(
    () => adminApi.report(reportKey, { financialYear, period }),
    [reportKey, financialYear, period],
  );
  const [error, setError] = useState<string | null>(null);

  const download = async (format: string) => {
    setError(null);
    try {
      const blob = await adminApi.exportReport(reportKey, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportKey}.${format.toLowerCase() === "excel" ? "xlsx" : format.toLowerCase()}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const groups = Array.from(new Set(REPORTS.map((item) => item.group)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted">Generated from live case data and exportable as CSV, Excel or PDF.</p>
      </div>

      <Card variant="bordered">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Report</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={reportKey}
              onChange={(event) => setReportKey(event.target.value)}
            >
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {REPORTS.filter((item) => item.group === group).map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <Input
            label="Financial year"
            placeholder="2024-25"
            value={financialYear}
            onChange={(event) => setFinancialYear(event.target.value)}
          />
          <Input
            label="Period"
            placeholder="2025-04"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-4">
          {FORMATS.map((format) => (
            <Button key={format} size="sm" variant="outline" onClick={() => download(format)}>
              Export {format}
            </Button>
          ))}
        </div>
        {error !== null && <p className="text-sm text-danger mt-3">{error}</p>}
      </Card>

      <Card variant="bordered">
        <CardTitle>{report.data?.title ?? "Report"}</CardTitle>
        <CardDescription>{report.data?.rows.length ?? 0} row(s)</CardDescription>
        {report.error !== null && <p className="text-sm text-danger mt-2">{report.error}</p>}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                {(report.data?.headers ?? []).map((header) => (
                  <th key={header} className="py-2 pr-4 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report.data?.rows ?? []).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border/60">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="py-2 pr-4">{cell ?? "-"}</td>
                  ))}
                </tr>
              ))}
              {(report.data?.rows ?? []).length === 0 && (
                <tr>
                  <td className="py-6 text-muted" colSpan={(report.data?.headers ?? []).length || 1}>
                    {report.isLoading ? "Generating…" : "No data for this filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
