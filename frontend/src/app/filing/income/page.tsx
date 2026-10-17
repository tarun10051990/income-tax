"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFiling } from "@/contexts/FilingContext";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import GuidedField, { usePortalText } from "@/components/filing/GuidedField";
import { AgeGroup, TaxCategory, categoryVisibleForAge, treatmentLabel } from "@/lib/tax-rates";

/** Order and look of the "What did you have this year?" tiles; names / help come from the CMS. */
const GROUPS: Array<{ code: string; emoji: string; gradient: string }> = [
  { code: "SHARES_FUNDS", emoji: "📈", gradient: "from-fuchsia-500 to-purple-600" },
  { code: "TRADING_BUSINESS", emoji: "💼", gradient: "from-orange-400 to-pink-500" },
  { code: "PROPERTY_GOLD", emoji: "🏠", gradient: "from-amber-400 to-orange-500" },
  { code: "INTEREST_DIVIDEND", emoji: "🏦", gradient: "from-sky-400 to-blue-600" },
  { code: "RENT", emoji: "🔑", gradient: "from-emerald-400 to-teal-600" },
  { code: "CRYPTO_LOTTERY", emoji: "🎲", gradient: "from-violet-500 to-indigo-600" },
  { code: "EXEMPT", emoji: "🌾", gradient: "from-lime-400 to-green-600" },
];

const AGES: AgeGroup[] = ["BELOW_60", "SENIOR", "SUPER_SENIOR"];

export default function AdditionalIncomePage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { form16Data, amounts, setAmount, ageGroup, setAgeGroup, rateBook, rateBookError, setCurrentStep,
    metroCity, setMetroCity, rentPaid, setRentPaid, taxPaid, setTaxPaid, documents } = useFiling();
  const t = usePortalText();

  const categories = useMemo(() => (rateBook?.categories ?? []).filter((c) => c.active), [rateBook]);
  /** Tiles the user tapped on / off; groups that already have an amount start switched on. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const picked = useMemo(() => {
    const withAmounts = new Set(categories.filter((c) => c.kind === "INCOME" && (amounts[c.code] || 0) > 0).map((c) => c.groupCode));
    return new Set(GROUPS.map((g) => g.code).filter((g) => toggled[g] ?? withAmounts.has(g)));
  }, [categories, amounts, toggled]);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (!form16Data) { router.push("/filing/upload"); return; }
    setCurrentStep("additional_income");
  }, [isAuthenticated, isReady, form16Data, router, setCurrentStep]);

  if (!form16Data) return null;

  const hasSalary = form16Data.salary.basicSalary > 0;
  const filledCount = documents.reduce((n, d) => n + d.fills.filter((f) => f.include && f.amount > 0).length, 0);
  const incomeIn = (group: string) => categories.filter((c) => c.kind === "INCOME" && c.groupCode === group);
  const deductions = categories.filter((c) => c.kind === "DEDUCTION" && !c.autoFromCodes && c.code !== "DED_PROF_TAX"
    && categoryVisibleForAge(c, ageGroup));
  const autoDeductions = categories.filter((c) => c.kind === "DEDUCTION" && c.autoFromCodes && categoryVisibleForAge(c, ageGroup));
  const toggle = (group: string) => {
    const on = !picked.has(group);
    if (!on) incomeIn(group).forEach((c) => setAmount(c.code, 0));
    setToggled((prev) => ({ ...prev, [group]: on }));
  };
  const updateTaxPaid = (field: keyof typeof taxPaid, value: string) => setTaxPaid({ ...taxPaid, [field]: Number(value) || 0 });
  const amount = (value: number) => (value ? String(value) : "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("itr.income.title")}</h1>
        <p className="text-muted mt-1">{t("itr.income.subtitle")}</p>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${filledCount ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <span>{filledCount ? `${filledCount} amount${filledCount > 1 ? "s" : ""} ${t("itr.income.fromDocs").toLowerCase()}` : t("itr.income.uploadMore")}</span>
        <Button size="sm" variant="outline" onClick={() => { setCurrentStep("documents"); router.push("/filing/documents"); }}>
          {filledCount ? "Add or change files" : "Upload files"}
        </Button>
      </div>

      {rateBookError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("itr.income.ratesError")} ({rateBookError})
        </div>
      )}

      <Card variant="bordered">
        <CardTitle>{t("itr.income.age.title")}</CardTitle>
        <CardDescription>{t("itr.income.age.body")}</CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {AGES.map((age) => (
            <button key={age} type="button" onClick={() => setAgeGroup(age)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition ${ageGroup === age
                ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white border-transparent shadow"
                : "bg-white border-border hover:border-purple-300"}`}>
              {t(`itr.income.age.${age}`)}
            </button>
          ))}
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>{t("itr.income.pick.title")}</CardTitle>
        <CardDescription>{t("itr.income.pick.body")}</CardDescription>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {GROUPS.filter((g) => incomeIn(g.code).length > 0).map((g) => {
            const on = picked.has(g.code);
            return (
              <button key={g.code} type="button" onClick={() => toggle(g.code)} aria-pressed={on}
                className={`rounded-2xl p-4 text-left transition border-2 ${on
                  ? `bg-gradient-to-br ${g.gradient} text-white border-transparent shadow-lg scale-[1.02]`
                  : "bg-white border-border hover:border-purple-300"}`}>
                <span className="text-2xl" aria-hidden>{g.emoji}</span>
                <p className="mt-2 font-semibold text-sm">{t(`itr.group.${g.code}`)}</p>
                <p className={`text-xs mt-0.5 ${on ? "text-white/90" : "text-muted"}`}>{t(`itr.group.${g.code}.hint`)}</p>
              </button>
            );
          })}
        </div>
        {picked.size === 0 && <p className="mt-3 text-sm text-muted">{t("itr.income.pick.none")}</p>}
      </Card>

      {GROUPS.filter((g) => picked.has(g.code)).map((g) => (
        <Card key={g.code} variant="bordered" className="rounded-2xl">
          <CardTitle>{g.emoji} {t(`itr.group.${g.code}`)}</CardTitle>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {incomeIn(g.code).map((c) => (
              <CategoryField key={c.code} category={c} value={amounts[c.code] || 0} onChange={(v) => setAmount(c.code, v)} />
            ))}
            {g.code === "TRADING_BUSINESS" && (
              <>
                <GuidedField guide="itr.business.turnover" type="number" min={0} placeholder="0" rupee
                  value={amount(taxPaid.businessTurnover)} onChange={(e) => updateTaxPaid("businessTurnover", e.target.value)} />
                <GuidedField guide="itr.profession.receipts" type="number" min={0} placeholder="0" rupee
                  value={amount(taxPaid.professionalReceipts)} onChange={(e) => updateTaxPaid("professionalReceipts", e.target.value)} />
              </>
            )}
          </div>
        </Card>
      ))}

      {hasSalary && (
        <Card variant="bordered">
          <CardTitle>{t("itr.income.hra.title")}</CardTitle>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={metroCity} onChange={() => setMetroCity(true)} className="text-primary" />
                <span className="text-sm">{t("itr.income.hra.metro")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={!metroCity} onChange={() => setMetroCity(false)} className="text-primary" />
                <span className="text-sm">{t("itr.income.hra.nonMetro")}</span>
              </label>
            </div>
            <GuidedField guide="itr.hra.rentPaid" type="number" min={0} placeholder="0" rupee
              value={amount(rentPaid)} onChange={(e) => setRentPaid(Number(e.target.value) || 0)} />
          </div>
        </Card>
      )}

      <Card variant="bordered">
        <CardTitle>{t("itr.income.deductions.title")}</CardTitle>
        <CardDescription>{t("itr.income.deductions.body")}</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {deductions.map((c) => (
            <CategoryField key={c.code} category={c} value={amounts[c.code] || 0} onChange={(v) => setAmount(c.code, v)} />
          ))}
        </div>
        {autoDeductions.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-emerald-700">
            {autoDeductions.map((c) => <li key={c.code}>✓ {c.name}: {c.hint}</li>)}
          </ul>
        )}
      </Card>

      <Card variant="bordered">
        <CardTitle>{t("itr.income.taxPaid.title")}</CardTitle>
        <CardDescription>{t("itr.income.taxPaid.body")}</CardDescription>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GuidedField guide="itr.tax.advanceTax" type="number" min={0} placeholder="0" rupee
            value={amount(taxPaid.advanceTax)} onChange={(e) => updateTaxPaid("advanceTax", e.target.value)} />
          <GuidedField guide="itr.tax.tdsOther" type="number" min={0} placeholder="0" rupee
            value={amount(taxPaid.otherTds)} onChange={(e) => updateTaxPaid("otherTds", e.target.value)} />
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => {
          if (hasSalary) { setCurrentStep("review"); router.push("/filing/review"); }
          else { setCurrentStep("upload"); router.push("/filing/upload"); }
        }}>
          {t("itr.income.back")}
        </Button>
        <Button disabled={!rateBook} onClick={() => { setCurrentStep("compute"); router.push("/filing/compute"); }}>
          {t("itr.income.next")}
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

/** Amount box for one tax category; the name, help text and rate badge all come from the tax_category_rates table. */
function CategoryField({ category, value, onChange }: { category: TaxCategory; value: number; onChange: (v: number) => void }) {
  const special = category.treatment === "SPECIAL_RATE";
  const free = category.treatment === "EXEMPT";
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <label htmlFor={`cat-${category.code}`} className="text-sm font-medium leading-snug">{category.name}</label>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${free ? "bg-lime-100 text-lime-800"
          : special ? "bg-fuchsia-100 text-fuchsia-800" : category.kind === "DEDUCTION" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>
          {treatmentLabel(category)}
        </span>
      </div>
      {category.hint && <p className="mt-1 text-xs text-muted">{category.hint}</p>}
      <div className="mt-2 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
        <input id={`cat-${category.code}`} type="number" min={0} inputMode="numeric" placeholder="0"
          value={value ? String(value) : ""} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-lg border border-border pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
      </div>
    </div>
  );
}
