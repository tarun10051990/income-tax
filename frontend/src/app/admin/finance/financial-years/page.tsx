"use client";

import { FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import DataTable from "@/components/platform/DataTable";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminFinanceApi } from "@/lib/finance-api";
import { FinancialYearView } from "@/lib/finance-types";

export default function FinancialYearsPage() {
  const years = useApiData(() => adminFinanceApi.financialYears());
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (body: { code: string; open?: boolean; notes?: string }) => {
    setBusy(true);
    setError(null);
    try {
      await adminFinanceApi.saveFinancialYear(body);
      years.reload();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (await save({ code: code.trim(), open: true, notes: notes || undefined })) {
      setCode("");
      setNotes("");
    }
  };

  const next = (() => {
    const latest = years.data?.map((y) => Number(y.code.slice(0, 4))).sort((a, b) => b - a)[0];
    if (latest === undefined) return "";
    const start = latest + 1;
    return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financial years</h1>
        <p className="text-sm text-muted">
          Indian financial years run 1 April – 31 March and are derived from dates automatically; create future years ahead of time
          and close years once filings are complete. Closed years stay effective for historical calculations.
        </p>
      </div>

      <Card variant="bordered">
        <CardTitle>Add a financial year</CardTitle>
        <CardDescription>Format YYYY-YY, e.g. {next || "2026-27"}. Quarters and assessment year are computed.</CardDescription>
        <form onSubmit={create} className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_auto] items-end">
          <Input label="Code" placeholder={next || "2026-27"} pattern="\d{4}-\d{2}" required value={code} onChange={(e) => setCode(e.target.value)} />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button type="submit" loading={busy}>Create</Button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      <Card variant="bordered">
        <CardTitle>Configured years</CardTitle>
        {years.error && <p className="mt-2 text-sm text-danger">{years.error}</p>}
        <DataTable<FinancialYearView>
          rows={years.data ?? []}
          rowKey={(y) => y.code}
          emptyMessage={years.isLoading ? "Loading…" : "No financial years yet."}
          columns={[
            { header: "FY", cell: (y) => <span className="font-medium">{y.code}</span> },
            { header: "AY", cell: (y) => y.assessmentYear },
            { header: "Period", cell: (y) => `${y.startDate} → ${y.endDate}` },
            { header: "Quarters", cell: (y) => <span className="text-xs text-muted">{y.quarters.map((q) => `${q.label}: ${q.start.slice(5)}–${q.end.slice(5)}`).join(" · ")}</span> },
            {
              header: "Status",
              cell: (y) => (
                <div className="flex gap-1">
                  <Badge variant={y.open ? "success" : "default"}>{y.open ? "Open" : "Closed"}</Badge>
                  {y.current && <Badge variant="info">Current</Badge>}
                </div>
              ),
            },
            { header: "Notes", cell: (y) => <span className="text-xs text-muted">{y.notes ?? ""}</span> },
            {
              header: "",
              cell: (y) => (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => save({ code: y.code, open: !y.open, notes: y.notes ?? undefined })}>
                  {y.open ? "Close year" : "Reopen"}
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
