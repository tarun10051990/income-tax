"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import StatusBadge from "@/components/platform/StatusBadge";
import { TrackingRow, labelize } from "@/lib/finance-types";
import { formatCurrency } from "@/lib/utils";

interface TrackingTableProps {
  rows: TrackingRow[];
  error?: string | null;
}

/** Per FY × tax-type position with expandable liability breakdown and paid-by-type detail. */
export default function TrackingTable({ rows, error }: TrackingTableProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Card variant="bordered">
      <CardTitle>Tax tracking</CardTitle>
      <CardDescription>
        Liability comes from your filed computation (or our team&apos;s entries); outstanding = liability − verified payments.
        Unverified payments are shown but not deducted.
      </CardDescription>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted py-6">No liabilities or tax payments yet for this selection.</p>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4 font-medium">FY / AY</th>
                <th className="py-2 pr-4 font-medium">Tax</th>
                <th className="py-2 pr-4 font-medium text-right">Liability</th>
                <th className="py-2 pr-4 font-medium text-right">Paid (verified)</th>
                <th className="py-2 pr-4 font-medium text-right">Unverified</th>
                <th className="py-2 pr-4 font-medium text-right">Outstanding</th>
                <th className="py-2 pr-4 font-medium text-right">Refund</th>
                <th className="py-2 pr-4 font-medium">Due</th>
                <th className="py-2 pr-4 font-medium">Payment</th>
                <th className="py-2 pr-4 font-medium">Filing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const key = `${r.financialYear}-${r.taxType}`;
                const expanded = open === key;
                return (
                  <FragmentRow key={key} row={r} expanded={expanded} onToggle={() => setOpen(expanded ? null : key)} />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function FragmentRow({ row: r, expanded, onToggle }: { row: TrackingRow; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="border-b border-border/60 cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <td className="py-2.5 pr-4">{r.financialYear} <span className="text-muted">/ {r.assessmentYear}</span></td>
        <td className="py-2.5 pr-4">{labelize(r.taxType)}</td>
        <td className="py-2.5 pr-4 text-right">{formatCurrency(r.liability)}</td>
        <td className="py-2.5 pr-4 text-right text-emerald-700">{formatCurrency(r.verifiedPaid)}</td>
        <td className="py-2.5 pr-4 text-right text-amber-700">{r.unverifiedPaid ? formatCurrency(r.unverifiedPaid) : "-"}</td>
        <td className="py-2.5 pr-4 text-right font-medium">{formatCurrency(r.outstanding)}</td>
        <td className="py-2.5 pr-4 text-right">
          {r.refundClaimed ? `${formatCurrency(r.refundReceived)} / ${formatCurrency(r.refundClaimed)}` : "-"}
        </td>
        <td className="py-2.5 pr-4">{r.dueDate ?? "-"}</td>
        <td className="py-2.5 pr-4"><StatusBadge status={r.paymentStatus} /></td>
        <td className="py-2.5 pr-4">{r.filingStatus ? <StatusBadge status={r.filingStatus} /> : <span className="text-muted">Not started</span>}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/60 bg-gray-50/60">
          <td colSpan={10} className="px-4 py-3">
            <div className="grid gap-4 md:grid-cols-2 text-xs">
              <div>
                <p className="font-medium text-foreground mb-1">Liability breakdown</p>
                {r.liabilities.length === 0 ? (
                  <p className="text-muted">No liability recorded.</p>
                ) : (
                  <ul className="space-y-1">
                    {r.liabilities.map((l) => (
                      <li key={l.id} className="flex justify-between gap-4">
                        <span>
                          {l.source === "FILING" ? "From filed return" : "Entered by our team"}
                          {l.period ? ` · ${l.period}` : ""}
                          {l.dueDate ? ` · due ${l.dueDate}` : ""}
                          {l.notes ? ` · ${l.notes}` : ""}
                        </span>
                        <span className="font-mono">{formatCurrency(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Verified payments by type</p>
                {Object.keys(r.paidByType).length === 0 ? (
                  <p className="text-muted">No verified payments.</p>
                ) : (
                  <ul className="space-y-1">
                    {Object.entries(r.paidByType).map(([type, amount]) => (
                      <li key={type} className="flex justify-between gap-4">
                        <span>{labelize(type)}</span>
                        <span className="font-mono">{formatCurrency(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {r.filedOn && <p className="mt-2 text-muted">Filed on {new Date(r.filedOn).toLocaleDateString("en-IN")}</p>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
