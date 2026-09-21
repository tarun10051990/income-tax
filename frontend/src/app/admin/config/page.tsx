"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/platform/DataTable";
import { humanise } from "@/components/platform/StatusBadge";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { TaxRuleView } from "@/lib/platform-types";

const CATEGORIES = [
  "SLABS",
  "RATES",
  "DEDUCTION_LIMITS",
  "THRESHOLDS",
  "DEADLINES",
  "INTEREST_AND_FEES",
  "RETURN_SCHEMA",
  "VALIDATION",
];

export default function AdminConfigPage() {
  const { can } = useAdminAuth();
  const [taxType, setTaxType] = useState("INCOME_TAX");
  const rules = useApiData(() => adminApi.taxRules(taxType), [taxType]);
  const [form, setForm] = useState({
    ruleKey: "",
    category: "SLABS",
    description: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    configuration: "{\n}\n",
  });
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canPublish = can("CONFIG_MANAGE");

  const publish = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      JSON.parse(form.configuration);
      await adminApi.publishTaxRule({ ...form, taxType });
      setFeedback({ tone: "ok", message: "Published as a new version; the previous version stays in history." });
      rules.reload();
    } catch (cause) {
      setFeedback({
        tone: "error",
        message: cause instanceof SyntaxError ? "The configuration must be valid JSON." : errorMessage(cause),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Rules and deadlines</h1>
        <p className="text-sm text-muted">
          Slabs, deduction limits, interest, late fees and due dates are data, not code. Each change is a new version
          with an effective date, so past filings keep the rules that applied at the time.
        </p>
      </div>

      <div className="flex gap-2">
        {["INCOME_TAX", "GST"].map((option) => (
          <button
            key={option}
            className={`rounded-full border px-3 py-1 text-sm ${
              option === taxType ? "border-primary text-primary bg-primary/5" : "border-border text-muted hover:bg-gray-50"
            }`}
            onClick={() => setTaxType(option)}
          >
            {humanise(option)}
          </button>
        ))}
      </div>

      <Card variant="bordered">
        <CardTitle>Publish a version</CardTitle>
        <CardDescription>
          {canPublish
            ? "Only a super administrator may publish; the change is recorded in the audit trail."
            : "Your role can view rules but not publish them."}
        </CardDescription>
        <div className="grid gap-4 md:grid-cols-4 mt-4">
          <Input
            label="Rule key"
            placeholder="income-tax.slabs.new-regime"
            value={form.ruleKey}
            onChange={(event) => setForm({ ...form, ruleKey: event.target.value })}
          />
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {CATEGORIES.map((category) => <option key={category} value={category}>{humanise(category)}</option>)}
            </select>
          </div>
          <Input
            label="Effective from"
            type="date"
            value={form.effectiveFrom}
            onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        <label className="block text-sm font-medium mb-1.5 mt-4">Configuration (JSON)</label>
        <textarea
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono"
          rows={8}
          value={form.configuration}
          onChange={(event) => setForm({ ...form, configuration: event.target.value })}
        />
        {feedback !== null && (
          <p className={`text-sm mt-3 ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>
            {feedback.message}
          </p>
        )}
        <Button className="mt-4" loading={isSaving} onClick={publish}>Publish version</Button>
      </Card>

      <Card variant="bordered">
        <CardTitle>Current and historical rules</CardTitle>
        {rules.error !== null && <p className="text-sm text-danger mt-2">{rules.error}</p>}
        <DataTable<TaxRuleView>
          rows={rules.data ?? []}
          rowKey={(row) => row.id}
          emptyMessage={rules.isLoading ? "Loading…" : "No rules configured for this tax type."}
          columns={[
            { header: "Key", cell: (row) => <span className="font-mono text-xs">{row.ruleKey}</span> },
            { header: "Category", cell: (row) => humanise(row.category) },
            { header: "Effective", cell: (row) => `${row.effectiveFrom} → ${row.effectiveTo ?? "open"}` },
            { header: "Version", cell: (row) => `v${row.version}` },
            {
              header: "State",
              cell: (row) => (
                <Badge variant={row.active ? "success" : "default"}>{row.active ? "Active" : "Superseded"}</Badge>
              ),
            },
            { header: "Published by", cell: (row) => row.createdBy ?? "-" },
          ]}
        />
      </Card>
    </div>
  );
}
