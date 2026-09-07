"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useConsultantAuth } from "@/contexts/ConsultantAuthContext";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { marketplaceApi } from "@/lib/marketplace-api";
import { CONSULTATION_MODES, ConsultationMode, modeLabel } from "@/lib/marketplace-types";

const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu",
  "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

function csv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function ConsultantRegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useConsultantAuth();
  const types = useApiData(() => marketplaceApi.professionalTypes());
  const categories = useApiData(() => marketplaceApi.categories());
  const pricing = useApiData(() => marketplaceApi.pricing());

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    professionalTypeCode: "",
    registrationNumber: "",
    qualification: "",
    experienceYears: "0",
    specializations: "",
    city: "",
    state: "",
    languages: "English, Hindi",
    bio: "",
    baseFee: "",
  });
  const [modes, setModes] = useState<ConsultationMode[]>(["VIDEO", "PHONE"]);
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const selectedType = types.data?.find((item) => item.code === form.professionalTypeCode);
  const toggle = <T,>(list: T[], value: T, update: (next: T[]) => void) =>
    update(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (modes.length === 0) {
      setError("Choose at least one consultation mode.");
      return;
    }
    register({
      ...form,
      experienceYears: Number(form.experienceYears),
      baseFee: form.baseFee === "" ? undefined : Number(form.baseFee),
      specializations: csv(form.specializations),
      languages: csv(form.languages),
      consultationModes: modes,
      categorySlugs,
    })
      .then(() => router.push("/consultant"))
      .catch((cause: unknown) => setError(errorMessage(cause)));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Card variant="bordered">
        <CardTitle>Join TaxFilr as a professional</CardTitle>
        <CardDescription>
          Chartered Accountants, tax and GST consultants, lawyers and financial advisors. Your profile goes live on the
          marketplace after our team verifies your credentials.
        </CardDescription>

        <form className="mt-6 space-y-8" onSubmit={submit}>
          <section className="space-y-4">
            <h2 className="font-semibold">Account</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={form.name} onChange={set("name")} required />
              <Input label="Email" type="email" value={form.email} onChange={set("email")} required />
              <Input label="Mobile (10 digits)" value={form.phone} onChange={set("phone")} pattern="[0-9]{10}" />
              <Input label="Password (min 8 characters)" type="password" value={form.password} onChange={set("password")} minLength={8} required />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Professional details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">Professional type</span>
                <select className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={form.professionalTypeCode} onChange={set("professionalTypeCode")} required>
                  <option value="">Select</option>
                  {(types.data ?? []).map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                </select>
              </label>
              <Input
                label={selectedType?.regulator ? `${selectedType.regulator} registration number` : "Registration number"}
                value={form.registrationNumber}
                onChange={set("registrationNumber")}
                helperText="Used to verify your credentials with the regulator before your profile goes live"
              />
              <Input label="Qualification" placeholder="e.g. CA, LLB, CS" value={form.qualification} onChange={set("qualification")} />
              <Input label="Years of experience" type="number" min={0} max={60} value={form.experienceYears} onChange={set("experienceYears")} required />
              <Input label="City" value={form.city} onChange={set("city")} />
              <label className="block text-sm">
                <span className="text-muted">State</span>
                <select className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={form.state} onChange={set("state")}>
                  <option value="">Select</option>
                  {INDIAN_STATES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <Input label="Specializations (comma separated)" placeholder="Capital gains, NRI taxation, GST audit" value={form.specializations} onChange={set("specializations")} />
              <Input label="Languages (comma separated)" value={form.languages} onChange={set("languages")} />
            </div>
            <label className="block text-sm">
              <span className="text-muted">Short biography</span>
              <textarea className="mt-1 w-full rounded-lg border border-border px-3 py-2" rows={4} maxLength={4000} value={form.bio} onChange={set("bio")} />
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Practice areas</h2>
            <div className="flex flex-wrap gap-2">
              {(categories.data ?? []).map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => toggle(categorySlugs, item.slug, setCategorySlugs)}
                  className={`rounded-full border px-3 py-1 text-sm ${categorySlugs.includes(item.slug) ? "border-primary bg-primary text-white" : "border-border"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Consultations</h2>
            <div className="flex flex-wrap gap-2">
              {CONSULTATION_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggle(modes, mode, setModes)}
                  className={`rounded-full border px-3 py-1 text-sm ${modes.includes(mode) ? "border-primary bg-primary text-white" : "border-border"}`}
                >
                  {modeLabel(mode)}
                </button>
              ))}
            </div>
            <Input
              label="Base consultation fee (₹)"
              type="number"
              min={pricing.data ? Number(pricing.data.minimumFee) : 0}
              value={form.baseFee}
              onChange={set("baseFee")}
              helperText={pricing.data ? `Minimum ₹${Number(pricing.data.minimumFee)}. Platform commission is deducted from each paid consultation.` : undefined}
            />
          </section>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={isLoading}>Create consultant account</Button>
          <p className="text-sm text-muted text-center">
            Already registered? <Link href="/consultant/login" className="text-primary underline">Sign in</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
