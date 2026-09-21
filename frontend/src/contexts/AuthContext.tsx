"use client";

import { createContext, useContext, useState, useCallback, useSyncExternalStore, ReactNode } from "react";
import { User } from "@/lib/types";
import { ApiError, apiRequest, writeToken } from "@/lib/api";
import { SessionStore } from "@/lib/session-store";

interface AuthResponse {
  token: string;
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  pan?: string;
  onboardingComplete?: boolean;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** False during SSR/hydration, before the persisted session has been read. */
  isReady: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOTP: (phone: string, otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: { name: string; email: string; phone: string; pan: string; password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const userStore = new SessionStore<User>("taxfilr.customer.user");
const noopSubscribe = () => () => {};

function toUser(response: AuthResponse): User {
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    phone: response.phone ?? "",
    pan: response.pan ?? "",
    role: response.role === "USER" ? "user" : "admin",
    onboardingComplete: response.onboardingComplete ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(userStore.subscribe, userStore.getSnapshot, userStore.getServerSnapshot);
  const isReady = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [isLoading, setIsLoading] = useState(false);

  const persist = useCallback((response: AuthResponse) => {
    writeToken("customer", response.token);
    userStore.write(toUser(response));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      persist(await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      }));
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (data: {
    name: string;
    email: string;
    phone: string;
    pan: string;
    password: string;
  }) => {
    setIsLoading(true);
    try {
      persist(await apiRequest<AuthResponse>("/auth/register", { method: "POST", body: data }));
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  // Neither one-time passwords nor federated sign in is wired to a provider yet; the API only
  // issues tokens for an email and password, so these paths report that rather than pretend.
  const loginWithOTP = useCallback(async () => {
    throw new ApiError(501, "OTP_LOGIN_UNAVAILABLE",
      "Sign in with a one time password is not enabled yet. Please use your email and password.");
  }, []);

  const loginWithGoogle = useCallback(async () => {
    throw new ApiError(501, "SOCIAL_LOGIN_UNAVAILABLE",
      "Sign in with Google is not enabled yet. Please use your email and password.");
  }, []);

  const logout = useCallback(() => {
    writeToken("customer", null);
    userStore.write(null);
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    const current = userStore.getSnapshot();
    if (current !== null) {
      userStore.write({ ...current, ...data });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isReady,
        isLoading,
        login,
        loginWithOTP,
        loginWithGoogle,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
