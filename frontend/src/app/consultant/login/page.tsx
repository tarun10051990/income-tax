"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useConsultantAuth } from "@/contexts/ConsultantAuthContext";
import { errorMessage } from "@/hooks/useApiData";

export default function ConsultantLoginPage() {
  const router = useRouter();
  const { signIn, isLoading } = useConsultantAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card variant="bordered">
        <CardTitle>Consultant sign in</CardTitle>
        <CardDescription>
          For CAs, tax consultants, lawyers and advisors listed on the marketplace. Taxpayers sign in from the main site.
        </CardDescription>
        <form
          className="space-y-4 mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            signIn(email, password)
              .then(() => router.push("/consultant"))
              .catch((cause: unknown) => setError(errorMessage(cause)));
          }}
        >
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={isLoading}>Sign in</Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          New to TaxFilr? <Link href="/consultant/register" className="text-primary underline">Apply to join the marketplace</Link>
        </p>
      </Card>
    </div>
  );
}
