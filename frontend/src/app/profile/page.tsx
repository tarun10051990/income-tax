"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";
import { TaxpayerProfileView } from "@/lib/platform-types";

const TAXPAYER_TYPES = ["INDIVIDUAL", "HUF", "FIRM", "COMPANY", "LLP", "TRUST"];

interface ProfileForm {
  pan: string;
  aadhaar: string;
  taxpayerType: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  metroCity: boolean;
}

/** Aadhaar and the bank account come back masked, so they start blank and are only sent when retyped. */
function toForm(profile: TaxpayerProfileView | null): ProfileForm {
  return {
    pan: profile?.pan ?? "",
    aadhaar: "",
    taxpayerType: profile?.taxpayerType ?? "INDIVIDUAL",
    dateOfBirth: profile?.dateOfBirth ?? "",
    addressLine1: profile?.addressLine1 ?? "",
    addressLine2: profile?.addressLine2 ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    pincode: profile?.pincode ?? "",
    bankAccountNumber: "",
    bankIfsc: profile?.bankIfsc ?? "",
    bankName: profile?.bankName ?? "",
    metroCity: profile?.metroCity ?? false,
  };
}

export default function ProfilePage() {
  const profile = useApiData(() => customerApi.profile());
  const [draft, setDraft] = useState<ProfileForm | null>(null);
  const form = draft ?? toForm(profile.data);
  const setForm = setDraft;
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = { ...form };
      ["aadhaar", "bankAccountNumber", "dateOfBirth"].forEach((key) => {
        if (`${body[key] ?? ""}`.length === 0) {
          delete body[key];
        }
      });
      await customerApi.updateProfile(body);
      setFeedback({ tone: "ok", message: "Profile saved." });
      setDraft(null);
      profile.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Your details</h1>
        <p className="text-sm text-muted">Used on every return you file. PAN and Aadhaar are stored masked.</p>
      </div>

      <Card variant="bordered">
        <CardTitle>Identity</CardTitle>
        <CardDescription>
          Aadhaar and bank account are write only; leave them blank to keep what is already stored.
        </CardDescription>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Input
            label="PAN"
            value={form.pan}
            onChange={(event) => setForm({ ...form, pan: event.target.value.toUpperCase() })}
          />
          <Input
            label="Aadhaar"
            placeholder={profile.data?.aadhaar ?? "12 digits"}
            value={form.aadhaar}
            onChange={(event) => setForm({ ...form, aadhaar: event.target.value })}
          />
          <div>
            <label className="block text-sm font-medium mb-1.5">Taxpayer type</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.taxpayerType}
              onChange={(event) => setForm({ ...form, taxpayerType: event.target.value })}
            >
              {TAXPAYER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <Input
            label="Date of birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
          />
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>Address</CardTitle>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Input
            label="Address line 1"
            value={form.addressLine1}
            onChange={(event) => setForm({ ...form, addressLine1: event.target.value })}
          />
          <Input
            label="Address line 2"
            value={form.addressLine2}
            onChange={(event) => setForm({ ...form, addressLine2: event.target.value })}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
          />
          <Input
            label="State"
            value={form.state}
            onChange={(event) => setForm({ ...form, state: event.target.value })}
          />
          <Input
            label="PIN code"
            value={form.pincode}
            onChange={(event) => setForm({ ...form, pincode: event.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm mt-4">
          <input
            type="checkbox"
            checked={form.metroCity}
            onChange={(event) => setForm({ ...form, metroCity: event.target.checked })}
          />
          I live in a metro city (affects the house rent allowance exemption)
        </label>
      </Card>

      <Card variant="bordered">
        <CardTitle>Refund bank account</CardTitle>
        <div className="grid gap-4 md:grid-cols-3 mt-4">
          <Input
            label="Account number"
            placeholder={profile.data?.bankAccountNumber ?? ""}
            value={form.bankAccountNumber}
            onChange={(event) => setForm({ ...form, bankAccountNumber: event.target.value })}
          />
          <Input
            label="IFSC"
            value={form.bankIfsc}
            onChange={(event) => setForm({ ...form, bankIfsc: event.target.value.toUpperCase() })}
          />
          <Input
            label="Bank name"
            value={form.bankName}
            onChange={(event) => setForm({ ...form, bankName: event.target.value })}
          />
        </div>
      </Card>

      {feedback !== null && (
        <p className={`text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>
      )}
      {profile.error !== null && <p className="text-sm text-danger">{profile.error}</p>}
      <Button loading={isSaving} onClick={save}>Save details</Button>
    </div>
  );
}
