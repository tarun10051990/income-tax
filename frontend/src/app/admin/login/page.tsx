"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { errorMessage } from "@/hooks/useApiData";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, completeEnrolment, isLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [enrolmentSecret, setEnrolmentSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const otpAuthUri = enrolmentSecret === null
    ? null
    : `otpauth://totp/TaxFilr:${encodeURIComponent(email)}?secret=${enrolmentSecret}&issuer=TaxFilr`;

  const submit = async () => {
    setError(null);
    try {
      if (enrolmentSecret !== null) {
        await completeEnrolment(totpCode);
        router.push("/admin");
        return;
      }
      const result = await signIn(email, password, totpCode.length > 0 ? totpCode : undefined);
      if (result.enrolmentSecret !== null) {
        setEnrolmentSecret(result.enrolmentSecret);
        setTotpCode("");
        return;
      }
      router.push("/admin");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card variant="bordered">
        <CardTitle>Staff sign in</CardTitle>
        <CardDescription>
          For tax professionals and administrators. Taxpayers sign in from the main site.
        </CardDescription>

        {enrolmentSecret === null ? (
          <form
            className="space-y-4 mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Input
              label="Work email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Input
              label="Authenticator code"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 digits"
              helperText="Leave blank the first time; you will be asked to set up an authenticator."
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
            />
            {error !== null && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" loading={isLoading}>Sign in</Button>
          </form>
        ) : (
          <div className="space-y-4 mt-6">
            <p className="text-sm">
              Add this secret to your authenticator app, then enter the code it shows to finish enrolling.
            </p>
            <code className="block break-all rounded-lg bg-gray-50 p-3 text-sm font-mono">{enrolmentSecret}</code>
            {otpAuthUri !== null && (
              <p className="text-xs text-muted break-all">
                Or use this setup link in your authenticator: {otpAuthUri}
              </p>
            )}
            <Input
              label="Authenticator code"
              inputMode="numeric"
              maxLength={6}
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
            />
            {error !== null && <p className="text-sm text-danger">{error}</p>}
            <Button className="w-full" loading={isLoading} onClick={submit}>Finish enrolment</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
