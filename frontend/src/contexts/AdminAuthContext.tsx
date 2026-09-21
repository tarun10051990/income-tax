"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, ReactNode } from "react";
import { apiRequest, writeToken } from "@/lib/api";
import { SessionStore } from "@/lib/session-store";

interface AdminAuthResponse {
  token: string;
  id: string;
  name: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  mfaEnrolmentRequired?: boolean;
  mfaSecret?: string;
  permissions: string[];
  expiresInMs: number;
}

export interface StaffSession {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AdminAuthContextType {
  session: StaffSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoading: boolean;
  /** Resolves to an enrolment payload when the account still has to set up an authenticator. */
  signIn: (email: string, password: string, totpCode?: string) => Promise<{ enrolmentSecret: string | null }>;
  completeEnrolment: (totpCode: string) => Promise<void>;
  signOut: () => void;
  can: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const sessionStore = new SessionStore<StaffSession>("taxfilr.admin.session");
const noopSubscribe = () => () => {};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot,
  );
  const isReady = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [isLoading, setIsLoading] = useState(false);
  /** Short lived token issued for enrolment only; it cannot reach the admin endpoints. */
  const [enrolmentToken, setEnrolmentToken] = useState<string | null>(null);

  const persist = useCallback((response: AdminAuthResponse) => {
    writeToken("admin", response.token);
    sessionStore.write({
      id: response.id,
      name: response.name,
      email: response.email,
      role: response.role,
      permissions: response.permissions,
    });
    setEnrolmentToken(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string, totpCode?: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest<AdminAuthResponse>("/auth/admin/login", {
        method: "POST",
        body: { email, password, totpCode },
      });
      if (response.mfaEnrolmentRequired === true) {
        setEnrolmentToken(response.token);
        return { enrolmentSecret: response.mfaSecret ?? "" };
      }
      persist(response);
      return { enrolmentSecret: null };
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const completeEnrolment = useCallback(async (totpCode: string) => {
    if (enrolmentToken === null) {
      throw new Error("Start signing in again to enrol your authenticator.");
    }
    setIsLoading(true);
    try {
      persist(await apiRequest<AdminAuthResponse>("/auth/admin/mfa/enrol", {
        method: "POST",
        body: { totpCode },
        token: enrolmentToken,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [enrolmentToken, persist]);

  const signOut = useCallback(() => {
    writeToken("admin", null);
    sessionStore.write(null);
  }, []);

  const can = useCallback(
    (permission: string) => session !== null && session.permissions.includes(permission),
    [session],
  );

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session !== null,
      isReady,
      isLoading,
      signIn,
      completeEnrolment,
      signOut,
      can,
    }),
    [session, isReady, isLoading, signIn, completeEnrolment, signOut, can],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
