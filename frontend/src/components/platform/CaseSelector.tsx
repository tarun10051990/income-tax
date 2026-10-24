"use client";

import { CaseSummary } from "@/lib/platform-types";
import { humanise } from "@/components/platform/StatusBadge";

interface CaseSelectorProps {
  cases: CaseSummary[];
  selectedId: string;
  onSelect: (caseId: string) => void;
  label?: string;
}

export default function CaseSelector({ cases, selectedId, onSelect, label = "Return" }: CaseSelectorProps) {
  return (
    <div className="max-w-md">
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <select
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
      >
        {cases.length === 0 && <option value="">No returns available</option>}
        {cases.map((filing) => (
          <option key={filing.id} value={filing.id}>
            {filing.caseNumber} · {humanise(filing.returnType ?? "")} · {filing.period ?? ""} · {humanise(filing.status)}
          </option>
        ))}
      </select>
    </div>
  );
}
