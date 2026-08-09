"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { NotificationTemplate } from "@/lib/platform-types";

const EMPTY_TEMPLATE = {
  eventKey: "",
  subject: "",
  body: "",
  inApp: true,
  email: false,
  sms: false,
  active: true,
};

export default function AdminTemplatesPage() {
  const templates = useApiData(() => adminApi.templates());
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await adminApi.saveTemplate(form);
      setFeedback({ tone: "ok", message: "Template saved." });
      templates.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setIsSaving(false);
    }
  };

  const load = (template: NotificationTemplate) => setForm({
    eventKey: template.eventKey,
    subject: template.subject,
    body: template.body,
    inApp: template.inApp,
    email: template.email,
    sms: template.sms,
    active: template.active,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Notification templates</h1>
        <p className="text-sm text-muted">
          Subject and body per event, with the channels each one uses. Placeholders such as {"{caseNumber}"} are
          replaced when the notification is sent.
        </p>
      </div>

      <Card variant="bordered">
        <CardTitle>Edit a template</CardTitle>
        <CardDescription>Saving an existing event key replaces its content.</CardDescription>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Input
            label="Event key"
            placeholder="FILING_STARTED"
            value={form.eventKey}
            onChange={(event) => setForm({ ...form, eventKey: event.target.value })}
          />
          <Input
            label="Subject"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
          />
        </div>
        <label className="block text-sm font-medium mb-1.5 mt-4">Body</label>
        <textarea
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          rows={5}
          value={form.body}
          onChange={(event) => setForm({ ...form, body: event.target.value })}
        />
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          {(["inApp", "email", "sms", "active"] as const).map((channel) => (
            <label key={channel} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[channel]}
                onChange={(event) => setForm({ ...form, [channel]: event.target.checked })}
              />
              {channel === "inApp" ? "In app" : channel === "sms" ? "SMS" : channel === "email" ? "Email" : "Active"}
            </label>
          ))}
        </div>
        {feedback !== null && (
          <p className={`text-sm mt-3 ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>
            {feedback.message}
          </p>
        )}
        <Button className="mt-4" loading={isSaving} onClick={save}>Save template</Button>
      </Card>

      {templates.error !== null && <p className="text-sm text-danger">{templates.error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {(templates.data ?? []).map((template) => (
          <Card key={template.id} variant="bordered">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{template.eventKey}</CardTitle>
                <CardDescription>{template.subject}</CardDescription>
              </div>
              <button className="text-sm text-primary hover:underline" onClick={() => load(template)}>Edit</button>
            </div>
            <p className="text-sm text-muted mt-2 whitespace-pre-line">{template.body}</p>
            <div className="flex gap-2 mt-3">
              {template.inApp && <Badge variant="info">In app</Badge>}
              {template.email && <Badge variant="info">Email</Badge>}
              {template.sms && <Badge variant="info">SMS</Badge>}
              {!template.active && <Badge variant="warning">Inactive</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
