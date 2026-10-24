"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { consultantApi, marketplaceApi } from "@/lib/marketplace-api";
import { CONSULTATION_MODES, ConsultationMode, ServiceView, modeLabel } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/utils";

interface Draft {
  id: string | null;
  title: string;
  description: string;
  categorySlug: string;
  fee: string;
  durationMinutes: string;
  modes: ConsultationMode[];
  active: boolean;
}

const EMPTY: Draft = { id: null, title: "", description: "", categorySlug: "", fee: "", durationMinutes: "30", modes: ["VIDEO", "PHONE"], active: true };

export default function ConsultantServicesPage() {
  const services = useApiData(() => consultantApi.services());
  const categories = useApiData(() => marketplaceApi.categories());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const edit = (service: ServiceView) =>
    setDraft({
      id: service.id,
      title: service.title,
      description: service.description ?? "",
      categorySlug: service.categorySlug ?? "",
      fee: String(service.fee),
      durationMinutes: String(service.durationMinutes),
      modes: service.modes,
      active: service.active,
    });

  const save = async () => {
    if (!draft) {
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      title: draft.title,
      description: draft.description || null,
      categorySlug: draft.categorySlug || null,
      fee: Number(draft.fee),
      durationMinutes: Number(draft.durationMinutes),
      modes: draft.modes,
      active: draft.active,
    };
    try {
      if (draft.id) {
        await consultantApi.updateService(draft.id, body);
      } else {
        await consultantApi.createService(body);
      }
      setDraft(null);
      services.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await consultantApi.deleteService(id);
      services.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Services and fees</h1>
          <p className="text-sm text-muted">Packaged services clients can book, each with its own fee and duration.</p>
        </div>
        <Button onClick={() => setDraft(EMPTY)}>Add service</Button>
      </div>

      {services.error && <p className="text-sm text-danger">{services.error}</p>}

      {draft && (
        <Card variant="elevated">
          <CardTitle>{draft.id ? "Edit service" : "New service"}</CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
            <label className="block text-sm">
              <span className="text-muted">Category</span>
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={draft.categorySlug} onChange={(e) => setDraft({ ...draft, categorySlug: e.target.value })}>
                <option value="">None</option>
                {(categories.data ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
            </label>
            <Input label="Fee (₹)" type="number" min={0} value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} required />
            <Input label="Duration (minutes)" type="number" min={15} max={240} step={15} value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })} />
          </div>
          <label className="block text-sm mt-4">
            <span className="text-muted">Description</span>
            <textarea className="mt-1 w-full rounded-lg border border-border px-3 py-2" rows={3} maxLength={2000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <p className="mt-4 text-xs font-medium text-muted">Available modes</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {CONSULTATION_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraft({ ...draft, modes: draft.modes.includes(mode) ? draft.modes.filter((m) => m !== mode) : [...draft.modes, mode] })}
                className={`rounded-full border px-3 py-1 text-sm ${draft.modes.includes(mode) ? "border-primary bg-primary text-white" : "border-border"}`}
              >
                {modeLabel(mode)}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Visible to clients
          </label>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex gap-2">
            <Button loading={busy} disabled={draft.title.trim() === "" || draft.fee === "" || draft.modes.length === 0} onClick={() => void save()}>Save</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(services.data ?? []).length === 0 && !draft && (
          <Card variant="bordered" className="md:col-span-2">
            <CardDescription>No services yet. Clients can still book a general consultation at your base fee.</CardDescription>
          </Card>
        )}
        {(services.data ?? []).map((service) => (
          <Card key={service.id} variant="bordered">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{service.title}</CardTitle>
                <CardDescription>{service.categoryName ?? "Uncategorised"} · {service.durationMinutes} min</CardDescription>
              </div>
              <Badge variant={service.active ? "success" : "default"}>{service.active ? "Live" : "Hidden"}</Badge>
            </div>
            {service.description && <p className="mt-2 text-sm text-muted">{service.description}</p>}
            <p className="mt-2 text-lg font-semibold">{formatCurrency(Number(service.fee))}</p>
            <p className="text-xs text-muted">{service.modes.map(modeLabel).join(" · ")}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => edit(service)}>Edit</Button>
              <Button size="sm" variant="ghost" loading={busy} onClick={() => void remove(service.id)}>Remove</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
