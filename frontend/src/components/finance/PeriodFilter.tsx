"use client";

import { FinancialYearView, PeriodQuery } from "@/lib/finance-types";

interface PeriodFilterProps {
  years: FinancialYearView[];
  value: PeriodQuery;
  onChange: (next: PeriodQuery) => void;
  /** Staff analytics also offer a multi-year view. */
  allowAll?: boolean;
}

const SELECT = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground";

/** Monthly / quarterly / financial-year / custom-range selector shared by the client and admin dashboards. */
export default function PeriodFilter({ years, value, onChange, allowAll = false }: PeriodFilterProps) {
  const type = value.period ?? "FY";
  const currentFy = years.find((y) => y.current)?.code ?? years[0]?.code;
  const fy = value.fy ?? currentFy ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="block text-xs text-muted mb-1">View</span>
        <select
          className={SELECT}
          value={type}
          onChange={(e) => onChange({ period: e.target.value as PeriodQuery["period"], fy })}
        >
          <option value="MONTH">Monthly</option>
          <option value="QUARTER">Quarterly</option>
          <option value="FY">Financial year</option>
          <option value="CUSTOM">Custom range</option>
          {allowAll && <option value="ALL">Last 5 years</option>}
        </select>
      </label>

      {(type === "FY" || type === "QUARTER") && (
        <label className="text-sm">
          <span className="block text-xs text-muted mb-1">Financial year</span>
          <select className={SELECT} value={fy} onChange={(e) => onChange({ ...value, fy: e.target.value })}>
            {years.map((y) => (
              <option key={y.code} value={y.code}>
                FY {y.code}
                {y.current ? " (current)" : ""}
                {!y.open ? " · closed" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {type === "QUARTER" && (
        <label className="text-sm">
          <span className="block text-xs text-muted mb-1">Quarter</span>
          <select
            className={SELECT}
            value={value.quarter ?? ""}
            onChange={(e) => onChange({ ...value, quarter: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Current quarter</option>
            {(years.find((y) => y.code === fy)?.quarters ?? []).map((q) => (
              <option key={q.number} value={q.number}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {type === "MONTH" && (
        <label className="text-sm">
          <span className="block text-xs text-muted mb-1">Month</span>
          <input
            type="month"
            className={SELECT}
            value={value.month ?? ""}
            onChange={(e) => onChange({ ...value, month: e.target.value || undefined })}
          />
        </label>
      )}

      {type === "CUSTOM" && (
        <>
          <label className="text-sm">
            <span className="block text-xs text-muted mb-1">From</span>
            <input
              type="date"
              className={SELECT}
              value={value.from ?? ""}
              onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-muted mb-1">To</span>
            <input
              type="date"
              className={SELECT}
              value={value.to ?? ""}
              onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
            />
          </label>
        </>
      )}
    </div>
  );
}

/** Whether the filter has enough input to issue a request (custom ranges need both dates). */
export function periodReady(value: PeriodQuery): boolean {
  return value.period !== "CUSTOM" || (value.from !== undefined && value.to !== undefined);
}
