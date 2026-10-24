"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BUSINESS_TYPES, GstCalculation, GstRateBook, GstRuleKind, ITC_LABELS, RULE_KINDS,
  cleanAmount, gstRatesApi, hintRateIsStale, percent, rateLabel,
} from "@/lib/gst-rates";

const rupee = (n: number | null | undefined) =>
  n === null || n === undefined ? "–" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const TILE_COLOURS = [
  "linear-gradient(135deg,#a855f7,#ec4899)", "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#f97316,#facc15)", "linear-gradient(135deg,#10b981,#84cc16)",
];

export default function GstRateFinderPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [book, setBook] = useState<GstRateBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<string>("TRADER");
  const [search, setSearch] = useState("");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("10000");
  const [interState, setInterState] = useState(false);
  const [calc, setCalc] = useState<GstCalculation | null>(null);

  useEffect(() => {
    gstRatesApi.rates(date).then((b) => { setBook(b); setError(null); }).catch((e: Error) => setError(e.message));
  }, [date]);

  const items = useMemo(() => {
    const all = book?.categories ?? [];
    const q = search.trim().toLowerCase();
    if (q) return all.filter((c) => `${c.name} ${c.hsnSac ?? ""} ${c.hint ?? ""}`.toLowerCase().includes(q));
    return all.filter((c) => c.businessType === business);
  }, [book, business, search]);

  useEffect(() => {
    const value = Number(amount);
    if (!code || amount === "" || !Number.isFinite(value) || value < 0) return;
    gstRatesApi.calculate({ categoryCode: code, taxableValue: value, invoiceDate: date, interState })
      .then(setCalc).catch((e: Error) => { setCalc(null); setError(e.message); });
  }, [code, amount, date, interState]);
  const shown = code && amount !== "" && calc?.categoryCode === code && Number(calc.taxableValue) === Number(amount)
    && calc.interState === interState ? calc : null;

  const kinds = Object.keys(RULE_KINDS) as GstRuleKind[];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="rounded-3xl p-6 text-white shadow-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#db2777 60%,#f97316)" }}>
        <p className="text-sm opacity-90">GST made simple</p>
        <h1 className="text-3xl font-bold mt-1">How much GST do I charge? 🧾</h1>
        <p className="mt-2 max-w-2xl text-sm opacity-90">
          Pick your type of business, tap what you sell, and see the GST on your bill. Rates come from our database and
          follow the date of your bill, so old bills use old rates.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5">
            Bill date
            <input type="date" value={date} max="2099-12-31" onChange={(e) => setDate(e.target.value || today)}
              className="rounded-md bg-white px-2 py-0.5 text-gray-900" />
          </label>
          <Link href="/gst" className="rounded-full bg-white px-3 py-1.5 font-semibold text-purple-700">Back to GST</Link>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. What kind of business?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(BUSINESS_TYPES).map(([key, b], i) => {
            const picked = business === key && !search;
            return (
              <button key={key} type="button" onClick={() => { setBusiness(key); setSearch(""); }}
                className={`rounded-2xl p-3 text-left text-sm font-semibold shadow-sm transition ${picked ? "text-white ring-4 ring-purple-200" : "bg-white text-gray-800 border border-border hover:shadow"}`}
                style={picked ? { background: TILE_COLOURS[i % TILE_COLOURS.length] } : undefined}>
                <span className="block text-2xl">{b.emoji}</span>{b.label}
              </button>
            );
          })}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Or search: e.g. biscuits, 9983, hotel"
          className="w-full rounded-xl border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Tap what you sell</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <button key={c.id} type="button" onClick={() => setCode(c.code)}
              className={`rounded-2xl border p-4 text-left transition ${code === c.code ? "border-purple-500 ring-2 ring-purple-200 bg-purple-50" : "border-border bg-white hover:shadow"}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-gray-900">{c.name}</span>
                <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
                  {rateLabel(c)}
                </span>
              </div>
              {c.hint && !hintRateIsStale(c.hint, c.rate) && <p className="mt-1 text-sm text-gray-600">{c.hint}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {c.hsnSac && <span className="rounded-full bg-gray-100 px-2 py-0.5">HSN/SAC {c.hsnSac}</span>}
                {c.reverseCharge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Buyer pays (reverse charge)</span>}
                {!c.itcAllowed && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">No credit on purchases</span>}
              </div>
            </button>
          ))}
          {book && items.length === 0 && <p className="text-sm text-gray-600">Nothing found. Try another word.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">3. GST on your bill</h2>
        <div className="flex flex-wrap items-end gap-4 text-sm">
          <label className="space-y-1">
            <span className="block text-gray-600">Bill amount before GST</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(cleanAmount(e.target.value))}
              className="w-44 rounded-lg border border-border px-3 py-2" />
          </label>
          <div className="flex rounded-full bg-gray-100 p-1">
            {[false, true].map((other) => (
              <button key={String(other)} type="button" onClick={() => setInterState(other)}
                className={`rounded-full px-4 py-1.5 font-medium ${interState === other ? "bg-white shadow text-purple-700" : "text-gray-600"}`}>
                {other ? "Buyer in another state" : "Buyer in my state"}
              </button>
            ))}
          </div>
        </div>
        {!shown && <p className="text-sm text-gray-600">Tap an item above to see the GST.</p>}
        {shown && (
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              ["CGST", shown.cgst], ["SGST", shown.sgst], ["IGST", shown.igst], ["Cess", shown.cess], ["Total bill", shown.invoiceTotal],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-4" style={{ background: "linear-gradient(135deg,#f5f3ff,#fdf2f8)" }}>
                <p className="text-xs text-gray-600">{label}</p>
                <p className="text-lg font-bold text-gray-900">{rupee(value as number)}</p>
              </div>
            ))}
            <p className="sm:col-span-5 text-sm text-gray-700">
              {shown.categoryName}: {rateLabel(shown)} on {rupee(shown.taxableValue)} = <b>{rupee(shown.totalTax)}</b> GST.{" "}
              {shown.interState ? "Other state, so it is all IGST." : "Same state, so it is split half CGST, half SGST."}
              {shown.reverseCharge && " Here the buyer pays this GST to the government (reverse charge)."}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your choices, limits and other GST rules</h2>
        {kinds.map((kind) => {
          const rules = (book?.rules ?? []).filter((r) => r.kind === kind);
          if (rules.length === 0) return null;
          return (
            <div key={kind} className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">{RULE_KINDS[kind].label}</h3>
              <p className="text-sm text-gray-600">{RULE_KINDS[kind].blurb}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {rules.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{r.name}</span>
                      <span className="flex shrink-0 gap-1 text-xs">
                        {r.rate !== null && <span className="rounded-full bg-purple-100 px-2 py-0.5 font-bold text-purple-700">{percent(r.rate)}</span>}
                        {r.amount !== null && <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-bold text-cyan-800">{rupee(r.amount)}</span>}
                      </span>
                    </div>
                    {r.hint && <p className="mt-1 text-sm text-gray-700">{r.hint}</p>}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                      {r.itc && <span className={`rounded-full px-2 py-0.5 ${r.itc === "FULL" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{ITC_LABELS[r.itc]}</span>}
                      {r.section && <span className="rounded-full bg-white px-2 py-0.5">Section {r.section}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <p className="text-xs text-gray-500">
        Rates follow GST Council decisions, including the GST 2.0 changes from 22 Sep 2025. Please check with your CA before
        filing; your admin can correct any rate.
      </p>
    </div>
  );
}
