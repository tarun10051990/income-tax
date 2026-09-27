"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import GuidedField, { usePortalText } from "@/components/filing/GuidedField";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/platform/DataTable";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";
import { GstProfileView } from "@/lib/platform-types";

const EMPTY_FORM = {
  gstin: "",
  legalName: "",
  tradeName: "",
  businessType: "Proprietorship",
  registeredAddress: "",
  state: "",
  authorizedSignatory: "",
  signatoryDesignation: "",
  compositionScheme: false,
};

export default function GstRegistrationsPage() {
  const profiles = useApiData(() => customerApi.gstProfiles());
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const t = usePortalText();
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      if (editingId === null) {
        await customerApi.createGstProfile({ ...form });
        setFeedback({ tone: "ok", message: "Registration added." });
      } else {
        await customerApi.updateGstProfile(editingId, { ...form });
        setFeedback({ tone: "ok", message: "Registration updated." });
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      profiles.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (profile: GstProfileView) => {
    setEditingId(profile.id);
    setForm({
      gstin: profile.gstin,
      legalName: profile.legalName,
      tradeName: profile.tradeName ?? "",
      businessType: profile.businessType ?? "Proprietorship",
      registeredAddress: profile.registeredAddress ?? "",
      state: profile.state ?? "",
      authorizedSignatory: profile.authorizedSignatory ?? "",
      signatoryDesignation: profile.signatoryDesignation ?? "",
      compositionScheme: profile.compositionScheme,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("gst.profile.title")}</h1>
        <p className="text-sm text-muted">{t("gst.profile.subtitle")}</p>
      </div>

      <Card variant="bordered">
        <CardTitle>{editingId === null ? "Add a registration" : "Edit registration"}</CardTitle>
        <CardDescription>GSTIN, legal name and state are used to derive the place of supply.</CardDescription>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <GuidedField
            guide="gst.profile.gstin"
            value={form.gstin}
            placeholder="27ABCDE1234F1Z5" maxLength={15}
            onChange={(event) => setForm({ ...form, gstin: event.target.value.toUpperCase() })}
          />
          <GuidedField
            guide="gst.profile.legalName"
            value={form.legalName}
            onChange={(event) => setForm({ ...form, legalName: event.target.value })}
          />
          <GuidedField
            guide="gst.profile.tradeName"
            value={form.tradeName}
            onChange={(event) => setForm({ ...form, tradeName: event.target.value })}
          />
          <GuidedField
            guide="gst.profile.businessType"
            value={form.businessType}
            onChange={(event) => setForm({ ...form, businessType: event.target.value })}
          />
          <GuidedField
            guide="gst.profile.state"
            value={form.state}
            onChange={(event) => setForm({ ...form, state: event.target.value })}
          />
          <GuidedField
            guide="gst.profile.address"
            value={form.registeredAddress}
            onChange={(event) => setForm({ ...form, registeredAddress: event.target.value })}
          />
          <GuidedField
            guide="gst.profile.signatory"
            value={form.authorizedSignatory}
            onChange={(event) => setForm({ ...form, authorizedSignatory: event.target.value })}
          />
          <GuidedField
            guide="gst.profile.designation"
            value={form.signatoryDesignation}
            onChange={(event) => setForm({ ...form, signatoryDesignation: event.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm mt-4">
          <input
            type="checkbox"
            checked={form.compositionScheme}
            onChange={(event) => setForm({ ...form, compositionScheme: event.target.checked })}
          />
          Registered under the composition scheme
        </label>
        {feedback !== null && (
          <p className={`text-sm mt-3 ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>
            {feedback.message}
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <Button onClick={save} loading={isSaving}>
            {editingId === null ? "Add registration" : "Save changes"}
          </Button>
          {editingId !== null && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <Card variant="bordered">
        <CardTitle>Registrations on file</CardTitle>
        {profiles.error !== null && <p className="text-sm text-danger mt-2">{profiles.error}</p>}
        <DataTable<GstProfileView>
          rows={profiles.data ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No GSTIN added yet."
          columns={[
            { header: "GSTIN", cell: (row) => <span className="font-mono">{row.gstin}</span> },
            { header: "Legal name", cell: (row) => row.legalName },
            { header: "State", cell: (row) => row.state ?? "-" },
            {
              header: "Scheme",
              cell: (row) => (
                <Badge variant={row.compositionScheme ? "warning" : "info"}>
                  {row.compositionScheme ? "Composition" : "Regular"}
                </Badge>
              ),
            },
            {
              header: "",
              align: "right",
              cell: (row) => (
                <button className="text-primary hover:underline" onClick={() => edit(row)}>
                  Edit
                </button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
