"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useConsultantAuth } from "@/contexts/ConsultantAuthContext";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { consultantApi } from "@/lib/marketplace-api";

export default function ConsultantSettingsPage() {
  const { session } = useConsultantAuth();
  const profile = useApiData(() => consultantApi.profile());
  const [bank, setBank] = useState({ accountName: "", accountNumber: "", ifsc: "", upiId: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await consultantApi.updateBank({
        accountName: bank.accountName,
        accountNumber: bank.accountNumber || undefined,
        ifsc: bank.ifsc || undefined,
        upiId: bank.upiId || undefined,
      });
      setFeedback({ tone: "ok", message: "Payout details saved." });
      setBank({ accountName: "", accountNumber: "", ifsc: "", upiId: "" });
      profile.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  };

  const data = profile.data;
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bank and settings</h1>
        <p className="text-sm text-muted">Where we send your payouts, and your login details.</p>
      </div>

      <Card variant="bordered">
        <CardTitle>Account</CardTitle>
        <p className="mt-2 text-sm">{session?.name} · {session?.email}</p>
        <CardDescription>To change your email or reset your password, contact support from the help centre.</CardDescription>
      </Card>

      <Card variant="bordered">
        <CardTitle>Payout details</CardTitle>
        <CardDescription>
          {data?.bankAccountNumberMasked
            ? `Current: ${data.bankAccountName ?? ""} · ${data.bankAccountNumberMasked} · ${data.bankIfsc ?? ""}${data.upiId ? ` · UPI ${data.upiId}` : ""}`
            : data?.upiId
              ? `Current: UPI ${data.upiId}`
              : "No payout details yet — add them before your first payout."}
        </CardDescription>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Account holder name" required value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} />
          <Input label="Account number" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} helperText="Only the last 4 digits are retained on the platform; the full number is passed to the payout provider." />
          <Input label="IFSC" value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })} pattern="[A-Z]{4}0[A-Z0-9]{6}" />
          <Input label="UPI ID" value={bank.upiId} onChange={(e) => setBank({ ...bank, upiId: e.target.value })} placeholder="name@bank" />
        </div>
        {feedback && <p className={`mt-3 text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>}
        <Button className="mt-4" loading={busy} disabled={bank.accountName.trim() === ""} onClick={() => void save()}>Save payout details</Button>
      </Card>
    </div>
  );
}
