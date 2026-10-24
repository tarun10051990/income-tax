"use client";

import { useCallback, useEffect, useState } from "react";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { RateBook, RegimeSetting, TaxCategory, TaxSlabRow, adminTaxRatesApi, taxRatesApi } from "@/lib/tax-rates";

const pct = (v: number | null) => (v === null || v === undefined ? "" : String(+(v * 100).toFixed(4)));
const num = (v: string) => (v.trim() === "" ? null : Number(v));

export default function AdminTaxRatesPage() {
  const [years, setYears] = useState<string[]>([]);
  const [fy, setFy] = useState<string>("");
  const [book, setBook] = useState<RateBook | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback((year?: string) => {
    adminTaxRatesApi.rates(year).then((b) => { setBook(b); setFy(b.financialYear); }).catch((e: Error) => setMessage(e.message));
  }, []);

  useEffect(() => {
    taxRatesApi.years().then((y) => setYears(y.map((r) => r.financialYear))).catch(() => undefined);
    load();
  }, [load]);

  const saved = (what: string) => { setMessage(`${what} saved`); load(fy); };
  const fail = (e: Error) => setMessage(e.message);

  const copyYear = () => {
    const to = window.prompt("New financial year (e.g. 2026-27)");
    if (!to) return;
    const [a, b] = to.split("-").map(Number);
    adminTaxRatesApi.copyYear({ fromFinancialYear: fy, toFinancialYear: to, toAssessmentYear: `${a + 1}-${String(b + 1).padStart(2, "0")}` })
      .then((bk) => { setYears((y) => [bk.financialYear, ...y]); setBook(bk); setFy(bk.financialYear); setMessage(`FY ${to} created from FY ${fy}`); })
      .catch(fail);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Income-tax rates</h1>
          <p className="text-muted text-sm mt-1">Every ITR calculation uses these tables. Rates are entered as percentages (20 = 20%).</p>
        </div>
        <div className="flex gap-2 items-center">
          <select className="rounded-lg border border-border px-3 py-2 text-sm" value={fy} onChange={(e) => load(e.target.value)}>
            {years.map((y) => <option key={y} value={y}>FY {y}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={copyYear}>Start next year from this one</Button>
        </div>
      </div>
      {message && <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">{message}</p>}
      {book && (
        <>
          <Card variant="bordered">
            <CardTitle>Regime settings</CardTitle>
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {book.settings.map((s) => <SettingForm key={s.id} setting={s} onSaved={() => saved(`${s.regime} regime`)} onError={fail} />)}
            </div>
          </Card>
          <Card variant="bordered">
            <CardTitle>Income categories & deductions</CardTitle>
            <CardDescription>Name and hint are shown to taxpayers on the income page.</CardDescription>
            <div className="mt-3 space-y-3">
              {book.categories.map((c) => <CategoryForm key={c.id} category={c} onSaved={() => saved(c.name)} onError={fail} />)}
            </div>
          </Card>
          <Card variant="bordered">
            <CardTitle>Slabs and surcharge bands</CardTitle>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b border-border">
                  <th className="py-2 px-2">Regime</th><th className="px-2">Type</th><th className="px-2">Age</th>
                  <th className="px-2">Above ₹</th><th className="px-2">Up to ₹</th><th className="px-2">Rate %</th><th />
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {book.slabs.map((s) => <SlabRow key={s.id} slab={s} onSaved={() => saved("Slab")} onError={fail} />)}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

const box = "w-full rounded-md border border-border px-2 py-1 text-sm";

function SettingForm({ setting, onSaved, onError }: { setting: RegimeSetting; onSaved: () => void; onError: (e: Error) => void }) {
  const [f, setF] = useState({
    standardDeduction: String(setting.standardDeduction), rebateIncomeLimit: String(setting.rebateIncomeLimit),
    rebateMaxAmount: String(setting.rebateMaxAmount), cessRate: pct(setting.cessRate), maxSurchargeRate: pct(setting.maxSurchargeRate),
    rebateMarginalRelief: setting.rebateMarginalRelief,
  });
  const field = (k: keyof typeof f, label: string) => (
    <label className="text-xs">{label}<input className={box} value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  );
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="font-semibold mb-2">{setting.regime} regime</p>
      <div className="grid grid-cols-2 gap-2">
        {field("standardDeduction", "Standard deduction ₹")}
        {field("rebateIncomeLimit", "87A income limit ₹")}
        {field("rebateMaxAmount", "87A max rebate ₹")}
        {field("cessRate", "Cess %")}
        {field("maxSurchargeRate", "Max surcharge %")}
        <label className="text-xs flex items-center gap-2 mt-4">
          <input type="checkbox" checked={f.rebateMarginalRelief} onChange={(e) => setF({ ...f, rebateMarginalRelief: e.target.checked })} />
          Marginal relief on 87A
        </label>
      </div>
      <Button size="sm" className="mt-3" onClick={() => adminTaxRatesApi.updateSetting(setting.id, {
        standardDeduction: Number(f.standardDeduction), rebateIncomeLimit: Number(f.rebateIncomeLimit), rebateMaxAmount: Number(f.rebateMaxAmount),
        rebateMarginalRelief: f.rebateMarginalRelief, cessRate: Number(f.cessRate) / 100, maxSurchargeRate: Number(f.maxSurchargeRate) / 100,
      }).then(onSaved).catch(onError)}>Save</Button>
    </div>
  );
}

function CategoryForm({ category: c, onSaved, onError }: { category: TaxCategory; onSaved: () => void; onError: (e: Error) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: c.name, hint: c.hint ?? "", section: c.section ?? "", treatment: c.treatment, rate: pct(c.rate),
    exemptionLimit: c.exemptionLimit === null ? "" : String(c.exemptionLimit), deductionLimit: c.deductionLimit === null ? "" : String(c.deductionLimit),
    seniorDeductionLimit: c.seniorDeductionLimit === null ? "" : String(c.seniorDeductionLimit),
    allowedRegimes: c.allowedRegimes, rebateRegimes: c.rebateRegimes ?? "", active: c.active,
  });
  const save = () => adminTaxRatesApi.updateCategory(c.id, {
    ...f, rate: f.rate === "" ? null : Number(f.rate) / 100, exemptionLimit: num(f.exemptionLimit), deductionLimit: num(f.deductionLimit),
    seniorDeductionLimit: num(f.seniorDeductionLimit), exemptionGroup: c.exemptionGroup,
    standardDeductionRate: c.standardDeductionRate, basicExemptionAdjustable: c.basicExemptionAdjustable, surchargeCap: c.surchargeCap,
    ageGroups: c.ageGroups, autoFromCodes: c.autoFromCodes, sortOrder: c.sortOrder,
  }).then(onSaved).catch(onError);
  return (
    <div className={`rounded-xl border p-3 ${c.active ? "border-border" : "border-dashed opacity-60"}`}>
      <button type="button" className="w-full flex justify-between items-center text-left" onClick={() => setOpen(!open)}>
        <span className="text-sm"><span className="font-mono text-xs text-muted mr-2">{c.code}</span>{c.name}</span>
        <span className="text-xs text-muted">{c.kind === "DEDUCTION" ? `limit ${c.deductionLimit ?? "none"}` : c.treatment === "SPECIAL_RATE" ? `${pct(c.rate)}%` : c.treatment}</span>
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <label className="text-xs col-span-2">Name<input className={box} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="text-xs">Section<input className={box} value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} /></label>
          <label className="text-xs">Treatment
            <select className={box} value={f.treatment} onChange={(e) => setF({ ...f, treatment: e.target.value as TaxCategory["treatment"] })}>
              <option value="SLAB">Slab rate</option><option value="SPECIAL_RATE">Flat rate</option><option value="EXEMPT">Tax-free</option>
            </select>
          </label>
          <label className="text-xs col-span-2 md:col-span-4">Hint<textarea className={box} rows={2} value={f.hint} onChange={(e) => setF({ ...f, hint: e.target.value })} /></label>
          <label className="text-xs">Flat rate %<input className={box} value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></label>
          <label className="text-xs">Tax-free amount ₹<input className={box} value={f.exemptionLimit} onChange={(e) => setF({ ...f, exemptionLimit: e.target.value })} /></label>
          <label className="text-xs">Deduction limit ₹<input className={box} value={f.deductionLimit} onChange={(e) => setF({ ...f, deductionLimit: e.target.value })} /></label>
          <label className="text-xs">Limit for 60+ ₹<input className={box} value={f.seniorDeductionLimit} onChange={(e) => setF({ ...f, seniorDeductionLimit: e.target.value })} /></label>
          <label className="text-xs">Regimes (OLD,NEW)<input className={box} value={f.allowedRegimes} onChange={(e) => setF({ ...f, allowedRegimes: e.target.value })} /></label>
          <label className="text-xs">87A rebate in<input className={box} value={f.rebateRegimes} onChange={(e) => setF({ ...f, rebateRegimes: e.target.value })} /></label>
          <label className="text-xs flex items-center gap-2 mt-4"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Active</label>
          <div className="flex items-end"><Button size="sm" onClick={save}>Save</Button></div>
        </div>
      )}
    </div>
  );
}

function SlabRow({ slab, onSaved, onError }: { slab: TaxSlabRow; onSaved: () => void; onError: (e: Error) => void }) {
  const [from, setFrom] = useState(String(slab.incomeFrom));
  const [to, setTo] = useState(slab.incomeTo === null ? "" : String(slab.incomeTo));
  const [rate, setRate] = useState(pct(slab.rate));
  return (
    <tr>
      <td className="py-1 px-2">{slab.regime}</td><td className="px-2">{slab.slabType}</td><td className="px-2">{slab.ageGroup}</td>
      <td className="px-2"><input className={box} value={from} onChange={(e) => setFrom(e.target.value)} /></td>
      <td className="px-2"><input className={box} value={to} placeholder="no limit" onChange={(e) => setTo(e.target.value)} /></td>
      <td className="px-2"><input className={box} value={rate} onChange={(e) => setRate(e.target.value)} /></td>
      <td className="px-2"><Button size="sm" variant="outline" onClick={() => adminTaxRatesApi.updateSlab(slab.id,
        { incomeFrom: Number(from), incomeTo: num(to), rate: Number(rate) / 100 }).then(onSaved).catch(onError)}>Save</Button></td>
    </tr>
  );
}
