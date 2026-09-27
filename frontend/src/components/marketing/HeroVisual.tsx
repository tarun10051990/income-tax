import { ArrowUpRight, BadgeCheck, FileCheck, TrendingUp } from "lucide-react";

/** Original illustrative dashboard mock rendered with CSS — no external imagery required. */
export default function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-emerald/20 via-transparent to-primary-light/20 blur-2xl" />
      <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-navy/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Compliance overview</p>
            <p className="text-sm font-semibold text-navy-deep">FY 2026-27</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-xs font-semibold text-emerald">
            <BadgeCheck className="h-3.5 w-3.5" />
            All filings on time
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Tax saved", value: "₹1.84L", delta: "+12%" },
            { label: "ITC reconciled", value: "98.6%", delta: "+3.1%" },
            { label: "Open queries", value: "0", delta: "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-bold text-navy-deep">{item.value}</p>
              <p className="text-[11px] font-semibold text-emerald">{item.delta}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">Monthly GST liability</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald">
              <TrendingUp className="h-3.5 w-3.5" /> Stable
            </span>
          </div>
          <div className="mt-4 flex h-24 items-end gap-2">
            {[38, 52, 46, 64, 58, 72, 66, 80, 74, 88, 82, 92].map((height, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-navy to-primary-light" style={{ height: `${height}%`, opacity: 0.55 + i * 0.035 }} />
            ))}
          </div>
        </div>

        <ul className="mt-5 space-y-2.5">
          {[
            { label: "GSTR-3B · March", status: "Filed" },
            { label: "TDS 26Q · Q4", status: "Filed" },
            { label: "ITR-2 · AY 2026-27", status: "Under review" },
          ].map((row) => (
            <li key={row.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <FileCheck className="h-4 w-4 text-navy" />
                {row.label}
              </span>
              <span className={row.status === "Filed" ? "font-semibold text-emerald" : "font-semibold text-amber-600"}>{row.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute -left-6 top-1/3 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:block">
        <p className="text-[11px] text-slate-500">Refund credited</p>
        <p className="flex items-center gap-1 text-base font-bold text-navy-deep">
          ₹42,180 <ArrowUpRight className="h-4 w-4 text-emerald" />
        </p>
      </div>
      <div className="absolute -right-4 bottom-10 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:block">
        <p className="text-[11px] text-slate-500">Next due date</p>
        <p className="text-sm font-semibold text-navy-deep">GSTR-1 · 11 Apr</p>
      </div>
    </div>
  );
}
