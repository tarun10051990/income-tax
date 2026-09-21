"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminMarketplaceApi } from "@/lib/marketplace-api";
import { CategoryView, CouponView, PricingRuleView, ProfessionalTypeView, formatDateTime } from "@/lib/marketplace-types";

const DOMAINS = ["INCOME_TAX", "GST", "LEGAL", "ACCOUNTING", "OTHER"];
const REGULATORS = ["ICAI", "BAR_COUNCIL", "NONE"];

export default function AdminPricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Pricing, categories and professional types</h1>
        <p className="text-sm text-muted">Everything the marketplace charges or lists is configured here; changes apply to new quotes immediately.</p>
      </div>
      <PricingRules />
      <div className="grid gap-8 lg:grid-cols-2">
        <Categories />
        <ProfessionalTypes />
      </div>
      <Coupons />
    </div>
  );
}

function useSaver() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: ok });
      return true;
    } catch (cause) {
      setMessage({ ok: false, text: errorMessage(cause) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, message, run };
}

function Feedback({ message }: { message: { ok: boolean; text: string } | null }) {
  return message ? <p className={`text-sm ${message.ok ? "text-secondary" : "text-danger"}`}>{message.text}</p> : null;
}

function PricingRules() {
  const rules = useApiData(() => adminMarketplaceApi.pricingRules());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { busy, message, run } = useSaver();

  const save = async (rule: PricingRuleView) => {
    const value = Number(drafts[rule.code]);
    if (Number.isNaN(value)) return;
    if (await run(() => adminMarketplaceApi.updatePricingRule(rule.code, value), `${rule.label} updated.`)) {
      setDrafts((d) => { const next = { ...d }; delete next[rule.code]; return next; });
      rules.reload();
    }
  };

  return (
    <Card variant="bordered">
      <CardTitle>Platform pricing rules</CardTitle>
      <CardDescription>Commission, platform fee, GST on fees, surcharges and the refund window. Percent rules are 0–100.</CardDescription>
      {rules.error && <p className="mt-2 text-sm text-danger">{rules.error}</p>}
      <Feedback message={message} />
      <div className="mt-4 divide-y divide-border">
        {(rules.data ?? []).map((rule) => {
          const draft = drafts[rule.code];
          const dirty = draft !== undefined && draft !== String(rule.value);
          return (
            <div key={rule.code} className="grid gap-2 py-3 sm:grid-cols-[1fr_180px_auto] sm:items-center">
              <div>
                <p className="text-sm font-medium">{rule.label} <span className="text-xs text-muted font-mono">{rule.code}</span></p>
                {rule.description && <p className="text-xs text-muted">{rule.description}</p>}
                {rule.updatedAt && <p className="text-[11px] text-muted">Last changed {formatDateTime(rule.updatedAt)}{rule.updatedBy ? ` by ${rule.updatedBy}` : ""}</p>}
              </div>
              <div className="flex items-center gap-1">
                <input type="number" step="0.01" className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={draft ?? String(rule.value)} onChange={(e) => setDrafts({ ...drafts, [rule.code]: e.target.value })} />
                <span className="text-xs text-muted w-8">{rule.valueType === "PERCENT" ? "%" : rule.valueType === "HOURS" ? "hrs" : "₹"}</span>
              </div>
              <Button size="sm" disabled={!dirty} loading={busy} onClick={() => void save(rule)}>Save</Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const EMPTY_CATEGORY = { slug: "", name: "", domain: "INCOME_TAX", description: "", recommendedTypes: "", startingFee: "", active: true, sortOrder: "0" };

function Categories() {
  const categories = useApiData(() => adminMarketplaceApi.categories());
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const { busy, message, run } = useSaver();

  const edit = (c: CategoryView) => setForm({
    slug: c.slug, name: c.name, domain: c.domain, description: c.description ?? "", recommendedTypes: c.recommendedTypes.join(", "),
    startingFee: c.startingFee != null ? String(c.startingFee) : "", active: c.active, sortOrder: String(c.sortOrder),
  });

  const save = async () => {
    const ok = await run(() => adminMarketplaceApi.saveCategory({
      slug: form.slug.trim(), name: form.name.trim(), domain: form.domain, description: form.description.trim() || null,
      recommendedTypes: form.recommendedTypes.split(",").map((s) => s.trim()).filter(Boolean),
      startingFee: form.startingFee ? Number(form.startingFee) : null, active: form.active, sortOrder: Number(form.sortOrder) || 0,
    }), "Category saved.");
    if (ok) { setForm(EMPTY_CATEGORY); categories.reload(); }
  };

  return (
    <Card variant="bordered">
      <CardTitle>Consultation categories</CardTitle>
      <CardDescription>What clients browse by (ITR filing, GST registration, notices…). Saving with an existing slug updates it.</CardDescription>
      <ul className="mt-3 divide-y divide-border text-sm">
        {(categories.data ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2">
            <span>{c.name} <span className="text-xs text-muted">{c.slug} · {c.domain}{c.active ? "" : " · hidden"}</span></span>
            <button type="button" className="text-xs underline" onClick={() => edit(c)}>Edit</button>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-border pt-4 space-y-3">
        <p className="text-sm font-medium">{form.slug && categories.data?.some((c) => c.slug === form.slug) ? `Editing ${form.slug}` : "Add category"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="itr-filing" />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label className="text-sm">
            <span className="block mb-1 text-muted">Domain</span>
            <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}>
              {DOMAINS.map((d) => <option key={d} value={d}>{d.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <Input label="Starting fee (₹, optional)" type="number" min={0} value={form.startingFee} onChange={(e) => setForm({ ...form, startingFee: e.target.value })} />
          <Input label="Recommended professional types (codes, comma separated)" value={form.recommendedTypes} onChange={(e) => setForm({ ...form, recommendedTypes: e.target.value })} />
          <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
        <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Visible to clients</label>
        <div className="flex gap-2">
          <Button size="sm" loading={busy} disabled={!form.slug.trim() || !form.name.trim()} onClick={() => void save()}>Save category</Button>
          <Button size="sm" variant="ghost" onClick={() => setForm(EMPTY_CATEGORY)}>Clear</Button>
        </div>
        <Feedback message={message} />
      </div>
    </Card>
  );
}

const EMPTY_TYPE = { code: "", label: "", designation: "", regulator: "NONE", active: true, sortOrder: "0" };

function ProfessionalTypes() {
  const types = useApiData(() => adminMarketplaceApi.professionalTypes());
  const [form, setForm] = useState(EMPTY_TYPE);
  const { busy, message, run } = useSaver();

  const edit = (t: ProfessionalTypeView) => setForm({ code: t.code, label: t.label, designation: t.designation ?? "", regulator: t.regulator, active: t.active, sortOrder: String(t.sortOrder) });

  const save = async () => {
    const ok = await run(() => adminMarketplaceApi.saveProfessionalType({
      code: form.code.trim().toUpperCase(), label: form.label.trim(), designation: form.designation.trim() || null,
      regulator: form.regulator, active: form.active, sortOrder: Number(form.sortOrder) || 0,
    }), "Professional type saved.");
    if (ok) { setForm(EMPTY_TYPE); types.reload(); }
  };

  return (
    <Card variant="bordered">
      <CardTitle>Professional types</CardTitle>
      <CardDescription>CA, lawyer, GST practitioner… The regulator decides which registration number is verified.</CardDescription>
      <ul className="mt-3 divide-y divide-border text-sm">
        {(types.data ?? []).map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2 py-2">
            <span>{t.label}{t.designation ? ` (${t.designation})` : ""} <span className="text-xs text-muted">{t.code} · {t.regulator}{t.active ? "" : " · hidden"}</span></span>
            <button type="button" className="text-xs underline" onClick={() => edit(t)}>Edit</button>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-border pt-4 space-y-3">
        <p className="text-sm font-medium">{form.code && types.data?.some((t) => t.code === form.code) ? `Editing ${form.code}` : "Add professional type"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS" />
          <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Company Secretary" />
          <Input label="Designation prefix (optional)" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="CS" />
          <label className="text-sm">
            <span className="block mb-1 text-muted">Regulator</span>
            <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.regulator} onChange={(e) => setForm({ ...form, regulator: e.target.value })}>
              {REGULATORS.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Open for registration</label>
        <div className="flex gap-2">
          <Button size="sm" loading={busy} disabled={!form.code.trim() || !form.label.trim()} onClick={() => void save()}>Save type</Button>
          <Button size="sm" variant="ghost" onClick={() => setForm(EMPTY_TYPE)}>Clear</Button>
        </div>
        <Feedback message={message} />
      </div>
    </Card>
  );
}

const EMPTY_COUPON = { code: "", description: "", percentOff: "", amountOff: "", validFrom: "", validTo: "", maxRedemptions: "", active: true };

function Coupons() {
  const coupons = useApiData(() => adminMarketplaceApi.coupons());
  const [form, setForm] = useState(EMPTY_COUPON);
  const { busy, message, run } = useSaver();

  const edit = (c: CouponView) => setForm({
    code: c.code, description: c.description ?? "", percentOff: c.percentOff != null ? String(c.percentOff) : "", amountOff: c.amountOff != null ? String(c.amountOff) : "",
    validFrom: c.validFrom ?? "", validTo: c.validTo ?? "", maxRedemptions: c.maxRedemptions != null ? String(c.maxRedemptions) : "", active: c.active,
  });

  const save = async () => {
    const ok = await run(() => adminMarketplaceApi.saveCoupon({
      code: form.code.trim().toUpperCase(), description: form.description.trim() || null,
      percentOff: form.percentOff ? Number(form.percentOff) : null, amountOff: form.amountOff ? Number(form.amountOff) : null,
      validFrom: form.validFrom || null, validTo: form.validTo || null,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null, active: form.active,
    }), "Coupon saved.");
    if (ok) { setForm(EMPTY_COUPON); coupons.reload(); }
  };

  return (
    <Card variant="bordered">
      <CardTitle>Discount coupons</CardTitle>
      <CardDescription>Applied by clients at booking; the discount reduces the total payable and is shown on the invoice.</CardDescription>
      <ul className="mt-3 divide-y divide-border text-sm">
        {(coupons.data ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2">
            <span>
              <span className="font-mono">{c.code}</span> — {c.percentOff != null ? `${c.percentOff}% off` : `₹${c.amountOff} off`}
              <span className="text-xs text-muted"> · {c.redemptions}{c.maxRedemptions != null ? `/${c.maxRedemptions}` : ""} used{c.validTo ? ` · until ${c.validTo}` : ""}{c.active ? "" : " · inactive"}</span>
            </span>
            <button type="button" className="text-xs underline" onClick={() => edit(c)}>Edit</button>
          </li>
        ))}
        {(coupons.data ?? []).length === 0 && <li className="py-2 text-muted">No coupons.</li>}
      </ul>
      <div className="mt-4 border-t border-border pt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FIRST100" />
          <Input label="Percent off" type="number" min={0} max={100} value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: e.target.value, amountOff: e.target.value ? "" : form.amountOff })} />
          <Input label="Or amount off (₹)" type="number" min={0} value={form.amountOff} onChange={(e) => setForm({ ...form, amountOff: e.target.value, percentOff: e.target.value ? "" : form.percentOff })} />
          <Input label="Valid from" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          <Input label="Valid to" type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
          <Input label="Max redemptions" type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} />
        </div>
        <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
        <div className="flex gap-2">
          <Button size="sm" loading={busy} disabled={!form.code.trim() || (!form.percentOff && !form.amountOff)} onClick={() => void save()}>Save coupon</Button>
          <Button size="sm" variant="ghost" onClick={() => setForm(EMPTY_COUPON)}>Clear</Button>
        </div>
        <Feedback message={message} />
      </div>
    </Card>
  );
}
