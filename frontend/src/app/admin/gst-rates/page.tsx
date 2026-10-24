"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  BUSINESS_TYPES, GstItc, GstRateBook, GstRateCategory, GstRule, GstRuleKind, GstTreatment, RULE_KINDS, adminGstRatesApi,
} from "@/lib/gst-rates";

const pct = (v: number | null) => (v === null || v === undefined ? "" : String(+(v * 100).toFixed(4)));
const num = (v: string) => (v.trim() === "" ? null : Number(v));
const cell = "rounded-md border border-border px-2 py-1 text-sm";
const TREATMENTS: GstTreatment[] = ["TAXABLE", "NIL", "EXEMPT", "ZERO_RATED"];
const ITCS: GstItc[] = ["FULL", "BLOCKED", "CONDITIONAL", "NOT_APPLICABLE"];

export default function AdminGstRatesPage() {
  const [book, setBook] = useState<GstRateBook | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [business, setBusiness] = useState("ALL");

  const load = useCallback(() => {
    adminGstRatesApi.rates().then(setBook).catch((e: Error) => setMessage(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const saved = (what: string) => { setMessage(`${what} saved. The change is in the audit trail.`); load(); };
  const fail = (e: Error) => setMessage(e.message);

  const categories = useMemo(
    () => (book?.categories ?? []).filter((c) => business === "ALL" || c.businessType === business),
    [book, business]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">GST rates</h1>
        <p className="text-sm text-muted">
          Every GST rate, scheme, limit and charge used by TaxFilr. Each row applies between its “from” and “till” dates, so
          old bills keep the old rate. Rates are in %, e.g. 18. Every change is logged with the old and new value.
        </p>
      </div>
      {message && <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm text-purple-800">{message}</div>}

      <Card variant="bordered">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Rates for goods and services</CardTitle>
            <CardDescription>{categories.length} rows</CardDescription>
          </div>
          <select value={business} onChange={(e) => setBusiness(e.target.value)} className={cell}>
            <option value="ALL">All businesses</option>
            {Object.entries(BUSINESS_TYPES).map(([k, b]) => <option key={k} value={k}>{b.label}</option>)}
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="p-2">Item</th><th className="p-2">HSN/SAC</th><th className="p-2">Type</th><th className="p-2">GST %</th>
                <th className="p-2">Cess %</th><th className="p-2">Reverse charge</th><th className="p-2">ITC</th><th className="p-2">From</th>
                <th className="p-2">Till</th><th className="p-2">On</th><th className="p-2" /></tr>
            </thead>
            <tbody>
              {categories.map((c) => <CategoryRow key={c.id} row={c} onSaved={saved} onError={fail} />)}
            </tbody>
          </table>
        </div>
      </Card>

      {(Object.keys(RULE_KINDS) as GstRuleKind[]).map((kind) => (
        <Card key={kind} variant="bordered">
          <CardTitle>{RULE_KINDS[kind].label}</CardTitle>
          <CardDescription>{RULE_KINDS[kind].blurb}</CardDescription>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr><th className="p-2">Rule</th><th className="p-2">Section</th><th className="p-2">Rate %</th><th className="p-2">Amount ₹</th>
                  <th className="p-2">Special states ₹</th><th className="p-2">Max ₹</th><th className="p-2">ITC</th><th className="p-2">From</th>
                  <th className="p-2">Till</th><th className="p-2">On</th><th className="p-2" /></tr>
              </thead>
              <tbody>
                {(book?.rules ?? []).filter((r) => r.kind === kind).map((r) => (
                  <RuleRow key={r.id} row={r} onSaved={saved} onError={fail} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CategoryRow({ row, onSaved, onError }: { row: GstRateCategory; onSaved: (w: string) => void; onError: (e: Error) => void }) {
  const [f, setF] = useState({
    name: row.name, hint: row.hint ?? "", hsnSac: row.hsnSac ?? "", treatment: row.treatment, rate: pct(row.rate),
    cessRate: pct(row.cessRate), reverseCharge: row.reverseCharge, itcAllowed: row.itcAllowed,
    effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo ?? "", active: row.active,
  });
  const save = () => adminGstRatesApi.updateCategory(row.id, {
    ...f, rate: num(f.rate) ?? 0, cessRate: num(f.cessRate), effectiveTo: f.effectiveTo || null,
  }).then(() => onSaved(row.name)).catch(onError);
  return (
    <tr className="border-t border-border align-top">
      <td className="p-2 min-w-56"><input className={`${cell} w-full`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={`${cell} mt-1 w-full text-xs`} value={f.hint} placeholder="Plain-language hint" onChange={(e) => setF({ ...f, hint: e.target.value })} /></td>
      <td className="p-2"><input className={`${cell} w-20`} value={f.hsnSac} onChange={(e) => setF({ ...f, hsnSac: e.target.value })} /></td>
      <td className="p-2"><select className={cell} value={f.treatment} onChange={(e) => setF({ ...f, treatment: e.target.value as GstTreatment })}>
        {TREATMENTS.map((t) => <option key={t}>{t}</option>)}</select></td>
      <td className="p-2"><input className={`${cell} w-16`} value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></td>
      <td className="p-2"><input className={`${cell} w-16`} value={f.cessRate} onChange={(e) => setF({ ...f, cessRate: e.target.value })} /></td>
      <td className="p-2 text-center"><input type="checkbox" checked={f.reverseCharge} onChange={(e) => setF({ ...f, reverseCharge: e.target.checked })} /></td>
      <td className="p-2 text-center"><input type="checkbox" checked={f.itcAllowed} onChange={(e) => setF({ ...f, itcAllowed: e.target.checked })} /></td>
      <td className="p-2"><input type="date" className={cell} value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} /></td>
      <td className="p-2"><input type="date" className={cell} value={f.effectiveTo} onChange={(e) => setF({ ...f, effectiveTo: e.target.value })} /></td>
      <td className="p-2 text-center"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /></td>
      <td className="p-2"><Button size="sm" onClick={save}>Save</Button></td>
    </tr>
  );
}

function RuleRow({ row, onSaved, onError }: { row: GstRule; onSaved: (w: string) => void; onError: (e: Error) => void }) {
  const [f, setF] = useState({
    name: row.name, hint: row.hint ?? "", section: row.section ?? "", rate: pct(row.rate),
    amount: row.amount === null ? "" : String(row.amount), specialStateAmount: row.specialStateAmount === null ? "" : String(row.specialStateAmount),
    maxAmount: row.maxAmount === null ? "" : String(row.maxAmount), itc: row.itc ?? "",
    effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo ?? "", active: row.active,
  });
  const save = () => adminGstRatesApi.updateRule(row.id, {
    ...f, rate: num(f.rate), amount: num(f.amount), specialStateAmount: num(f.specialStateAmount), maxAmount: num(f.maxAmount),
    itc: f.itc || null, effectiveTo: f.effectiveTo || null,
  }).then(() => onSaved(row.name)).catch(onError);
  return (
    <tr className="border-t border-border align-top">
      <td className="p-2 min-w-56"><input className={`${cell} w-full`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <textarea className={`${cell} mt-1 w-full text-xs`} rows={2} value={f.hint} onChange={(e) => setF({ ...f, hint: e.target.value })} /></td>
      <td className="p-2"><input className={`${cell} w-24`} value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} /></td>
      <td className="p-2"><input className={`${cell} w-16`} value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></td>
      <td className="p-2"><input className={`${cell} w-28`} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></td>
      <td className="p-2"><input className={`${cell} w-28`} value={f.specialStateAmount} onChange={(e) => setF({ ...f, specialStateAmount: e.target.value })} /></td>
      <td className="p-2"><input className={`${cell} w-24`} value={f.maxAmount} onChange={(e) => setF({ ...f, maxAmount: e.target.value })} /></td>
      <td className="p-2"><select className={cell} value={f.itc} onChange={(e) => setF({ ...f, itc: e.target.value })}>
        <option value="">–</option>{ITCS.map((t) => <option key={t}>{t}</option>)}</select></td>
      <td className="p-2"><input type="date" className={cell} value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} /></td>
      <td className="p-2"><input type="date" className={cell} value={f.effectiveTo} onChange={(e) => setF({ ...f, effectiveTo: e.target.value })} /></td>
      <td className="p-2 text-center"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /></td>
      <td className="p-2"><Button size="sm" onClick={save}>Save</Button></td>
    </tr>
  );
}
