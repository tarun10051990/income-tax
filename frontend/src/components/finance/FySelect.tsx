"use client";

import { FinancialYearView } from "@/lib/finance-types";

interface FySelectProps {
  years: FinancialYearView[];
  value: string;
  onChange: (fy: string) => void;
  allowAll?: boolean;
}

export default function FySelect({ years, value, onChange, allowAll = true }: FySelectProps) {
  return (
    <label className="text-sm">
      <span className="sr-only">Financial year</span>
      <select
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowAll && <option value="">All financial years</option>}
        {years.map((y) => (
          <option key={y.code} value={y.code}>
            FY {y.code}
            {y.current ? " (current)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
