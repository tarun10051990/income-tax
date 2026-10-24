"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/platform/DataTable";
import { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { UserSummary } from "@/lib/platform-types";

const STAFF_ROLES = [
  "ADMIN",
  "TAX_PROFESSIONAL",
  "GST_PROFESSIONAL",
  "REVIEWER",
  "DATA_ENTRY_OPERATOR",
  "CUSTOMER_SUPPORT",
];

export default function AdminStaffPage() {
  const staff = useApiData(() => adminApi.staff());
  const roles = useApiData(() => adminApi.roles());
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "TAX_PROFESSIONAL", password: "" });
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const create = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await adminApi.createStaff(form);
      setForm({ name: "", email: "", phone: "", role: form.role, password: "" });
      setFeedback({
        tone: "ok",
        message: "Account created. They must enrol an authenticator the first time they sign in.",
      });
      staff.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setIsSaving(false);
    }
  };

  const act = async (action: () => Promise<unknown>, message: string) => {
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: "ok", message });
      staff.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Staff accounts</h1>
        <p className="text-sm text-muted">
          Roles decide which cases and actions each person can reach. Multi factor authentication is mandatory for
          every staff account.
        </p>
      </div>

      <Card variant="bordered">
        <CardTitle>Add a staff member</CardTitle>
        <CardDescription>
          Give them a temporary password to share out of band; they will be asked to enrol an authenticator at first
          sign in.
        </CardDescription>
        <div className="grid gap-4 md:grid-cols-5 mt-4">
          <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input
            label="Work email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <div>
            <label className="block text-sm font-medium mb-1.5">Role</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              {STAFF_ROLES.map((role) => <option key={role} value={role}>{humanise(role)}</option>)}
            </select>
          </div>
          <Input
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </div>
        {feedback !== null && (
          <p className={`text-sm mt-3 ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>
            {feedback.message}
          </p>
        )}
        <Button className="mt-4" loading={isSaving} onClick={create}>Create account</Button>
      </Card>

      <Card variant="bordered">
        <CardTitle>Team</CardTitle>
        {staff.error !== null && <p className="text-sm text-danger mt-2">{staff.error}</p>}
        <DataTable<UserSummary>
          rows={staff.data ?? []}
          rowKey={(row) => row.id}
          emptyMessage={staff.isLoading ? "Loading…" : "No staff accounts."}
          columns={[
            { header: "Name", cell: (row) => row.name },
            { header: "Email", cell: (row) => row.email },
            { header: "Role", cell: (row) => humanise(row.role) },
            {
              header: "MFA",
              cell: (row) => (
                <Badge variant={row.mfaEnabled ? "success" : "warning"}>
                  {row.mfaEnabled ? "Enrolled" : "Not enrolled"}
                </Badge>
              ),
            },
            {
              header: "Account",
              cell: (row) => (
                <Badge variant={row.active ? "success" : "danger"}>{row.active ? "Active" : "Disabled"}</Badge>
              ),
            },
            {
              header: "",
              align: "right",
              cell: (row) => (
                <span className="flex gap-3 justify-end">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => act(() => adminApi.resetMfa(row.id), "Authenticator reset.")}
                  >
                    Reset MFA
                  </button>
                  <button
                    className={row.active ? "text-danger hover:underline" : "text-primary hover:underline"}
                    onClick={() => act(
                      () => adminApi.updateUser(row.id, { active: !row.active }),
                      row.active ? "Account disabled." : "Account enabled.",
                    )}
                  >
                    {row.active ? "Disable" : "Enable"}
                  </button>
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Card variant="bordered">
        <CardTitle>Permissions by role</CardTitle>
        <CardDescription>Read only view of the role to permission matrix the API enforces.</CardDescription>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {Object.entries(roles.data ?? {}).map(([role, permissions]) => (
            <div key={role}>
              <p className="text-sm font-medium">{humanise(role)}</p>
              <p className="text-xs text-muted">{permissions.map((item) => humanise(item)).join(", ")}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
