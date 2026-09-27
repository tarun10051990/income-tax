"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, ReactNode } from "react";
import { apiRequest, writeToken } from "@/lib/api";
import { SessionStore } from "@/lib/session-store";

interface ConsultantAuthResponse {
  token: string;
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ConsultantSession {
  id: string;
  name: string;
  email: string;
}

interface ConsultantAuthContextType {
  session: ConsultantSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (body: Record<string, unknown>) => Promise<void>;
  signOut: () => void;
}

const ConsultantAuthContext = createContext<ConsultantAuthContextType | undefined>(undefined);

const sessionStore = new SessionStore<ConsultantSession>("taxfilr.consultant.session");
const noopSubscribe = () => () => {};

export function ConsultantAuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getServerSnapshot);
  const isReady = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [isLoading, setIsLoading] = useState(false);

  const persist = useCallback((response: ConsultantAuthResponse) => {
    writeToken("consultant", response.token);
    sessionStore.write({ id: response.id, name: response.name, email: response.email });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      persist(await apiRequest<ConsultantAuthResponse>("/auth/consultant/login", {
        method: "POST",
        body: { email, password },
      }));
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (body: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      persist(await apiRequest<ConsultantAuthResponse>("/auth/consultant/register", { method: "POST", body }));
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const signOut = useCallback(() => {
    writeToken("consultant", null);
    sessionStore.write(null);
  }, []);

  const value = useMemo(
    () => ({ session, isAuthenticated: session !== null, isReady, isLoading, signIn, register, signOut }),
    [session, isReady, isLoading, signIn, register, signOut],
  );

  return <ConsultantAuthContext.Provider value={value}>{children}</ConsultantAuthContext.Provider>;
}

export function useConsultantAuth() {
  const context = useContext(ConsultantAuthContext);
  if (context === undefined) {
    throw new Error("useConsultantAuth must be used within a ConsultantAuthProvider");
  }
  return context;
}
