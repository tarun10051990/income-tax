"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { consultantApi, marketplaceApi } from "@/lib/marketplace-api";
import { CONSULTATION_MODES, ConsultationMode, formatDateTime, modeLabel } from "@/lib/marketplace-types";

interface FormState {
  name: string;
  phone: string;
  registrationNumber: string;
  qualification: string;
  experienceYears: string;
  specializations: string;
  city: string;
  state: string;
  languages: string;
  photoUrl: string;
  bio: string;
  baseFee: string;
  slotDurationMinutes: string;
}

export default function ConsultantProfilePage() {
  const profile = useApiData(() => consultantApi.profile());
  const categories = useApiData(() => marketplaceApi.categories());
  const [form, setForm] = useState<FormState | null>(null);
  const [modes, setModes] = useState<ConsultationMode[]>([]);
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  const [seededFrom, setSeededFrom] = useState<typeof profile.data>(null);
  if (profile.data && profile.data !== seededFrom) {
    const p = profile.data.profile;
    setSeededFrom(profile.data);
    setForm({
      name: p.name,
      phone: profile.data.phone ?? "",
      registrationNumber: p.registrationNumber ?? "",
      qualification: p.qualification ?? "",
      experienceYears: String(p.experienceYears),
      specializations: p.specializations.join(", "),
      city: p.city ?? "",
      state: p.state ?? "",
      languages: p.languages.join(", "),
      photoUrl: p.photoUrl ?? "",
      bio: p.bio ?? "",
      baseFee: String(p.startingFee),
      slotDurationMinutes: String(p.slotDurationMinutes),
    });
    setModes(p.consultationModes);
    setCategorySlugs(p.categorySlugs);
  }

  if (profile.error) {
    return <div className="px-6 py-16 text-sm text-danger">{profile.error}</div>;
  }
  if (!form || !profile.data) {
    return <div className="px-6 py-16 text-sm text-muted">Loading profile…</div>;
  }
  const data = profile.data;
  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => (prev ? { ...prev, [key]: event.target.value } : prev));
  const csv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
  const toggle = <T,>(list: T[], value: T, update: (next: T[]) => void) =>
    update(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const save = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await consultantApi.updateProfile({
        ...form,
        experienceYears: Number(form.experienceYears),
        baseFee: Number(form.baseFee),
        slotDurationMinutes: Number(form.slotDurationMinutes),
        specializations: csv(form.specializations),
        languages: csv(form.languages),
        consultationModes: modes,
        categorySlugs,
        photoUrl: form.photoUrl || null,
      });
      setFeedback({ tone: "ok", message: "Profile saved." });
      profile.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile and verification</h1>
        <p className="text-sm text-muted">What clients see on the marketplace, plus your verification status.</p>
      </div>

      <Card variant="bordered">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Verification</CardTitle>
            <CardDescription>
              {data.profile.professionalType} · {data.email}
              {data.verifiedAt ? ` · verified ${formatDateTime(data.verifiedAt)}` : ""}
            </CardDescription>
          </div>
          <Badge variant={data.status === "ACTIVE" ? "success" : data.status === "SUSPENDED" || data.status === "REJECTED" ? "danger" : "warning"}>
            {data.status.replaceAll("_", " ")}
          </Badge>
        </div>
        {data.verificationNotes && (
          <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
            <span className="font-medium">Note from the verification team:</span> {data.verificationNotes}
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          Our team verifies your registration number with the issuing body (ICAI, Bar Council, etc.). Keep it accurate;
          changes after approval may trigger a re-check.
        </p>
      </Card>

      <Card variant="bordered">
        <CardTitle>Public profile</CardTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={form.name} onChange={set("name")} />
          <Input label="Mobile" value={form.phone} onChange={set("phone")} pattern="[0-9]{10}" />
          <Input label="Registration number" value={form.registrationNumber} onChange={set("registrationNumber")} />
          <Input label="Qualification" value={form.qualification} onChange={set("qualification")} />
          <Input label="Years of experience" type="number" min={0} max={60} value={form.experienceYears} onChange={set("experienceYears")} />
          <Input label="Photo URL" value={form.photoUrl} onChange={set("photoUrl")} placeholder="https://…" />
          <Input label="City" value={form.city} onChange={set("city")} />
          <Input label="State" value={form.state} onChange={set("state")} />
          <Input label="Specializations (comma separated)" value={form.specializations} onChange={set("specializations")} />
          <Input label="Languages (comma separated)" value={form.languages} onChange={set("languages")} />
        </div>
        <label className="block text-sm mt-4">
          <span className="text-muted">Biography</span>
          <textarea className="mt-1 w-full rounded-lg border border-border px-3 py-2" rows={5} maxLength={4000} value={form.bio} onChange={set("bio")} />
        </label>
      </Card>

      <Card variant="bordered">
        <CardTitle>Practice areas and modes</CardTitle>
        <p className="mt-3 text-xs font-medium text-muted">Categories</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {(categories.data ?? []).map((item) => (
            <button key={item.slug} type="button" onClick={() => toggle(categorySlugs, item.slug, setCategorySlugs)} className={`rounded-full border px-3 py-1 text-sm ${categorySlugs.includes(item.slug) ? "border-primary bg-primary text-white" : "border-border"}`}>
              {item.name}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs font-medium text-muted">Consultation modes</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {CONSULTATION_MODES.map((mode) => (
            <button key={mode} type="button" onClick={() => toggle(modes, mode, setModes)} className={`rounded-full border px-3 py-1 text-sm ${modes.includes(mode) ? "border-primary bg-primary text-white" : "border-border"}`}>
              {modeLabel(mode)}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Base consultation fee (₹)" type="number" min={0} value={form.baseFee} onChange={set("baseFee")} helperText="Used when a client books a general consultation without picking a service." />
          <Input label="Default slot length (minutes)" type="number" min={15} max={240} step={15} value={form.slotDurationMinutes} onChange={set("slotDurationMinutes")} />
        </div>
      </Card>

      {feedback && <p className={`text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>}
      <Button size="lg" loading={busy} onClick={() => void save()}>Save profile</Button>
    </div>
  );
}
