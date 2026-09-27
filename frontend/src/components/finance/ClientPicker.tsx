"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import { useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { UserSummary } from "@/lib/platform-types";

interface ClientPickerProps {
  value: UserSummary | null;
  onChange: (client: UserSummary | null) => void;
}

/** Search-as-you-type taxpayer selector for staff forms that need an ownerId. */
export default function ClientPicker({ value, onChange }: ClientPickerProps) {
  const [query, setQuery] = useState("");
  const results = useApiData(
    () => (query.trim().length >= 2 ? adminApi.customers({ query: query.trim(), size: 8 }) : Promise.resolve(null)),
    [query],
  );

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{value.name}</span> <span className="text-muted">{value.email}</span>
        </span>
        <button type="button" className="text-xs text-primary underline" onClick={() => onChange(null)}>Change</button>
      </div>
    );
  }

  return (
    <div>
      <Input label="Client" placeholder="Search taxpayer by name, email or PAN" value={query} onChange={(e) => setQuery(e.target.value)} required />
      {(results.data?.content.length ?? 0) > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-surface text-sm">
          {results.data?.content.map((c) => (
            <li key={c.id}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => onChange(c)}>
                <span className="font-medium">{c.name}</span> <span className="text-muted">{c.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
