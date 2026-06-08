"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOTP: (phone: string, otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: { name: string; email: string; phone: string; pan: string; password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for the MVP
const DEMO_USERS: Record<string, User> = {
  "demo@taxfiler.in": {
    id: "usr_1",
    name: "Rahul Sharma",
    email: "demo@taxfiler.in",
    phone: "9876543210",
    pan: "ABCPS1234D",
    role: "user",
    onboardingComplete: false,
  },
  "admin@taxfiler.in": {
    id: "usr_admin",
    name: "Admin User",
    email: "admin@taxfiler.in",
    phone: "9876543211",
    pan: "ADMIN1234A",
    role: "admin",
    onboardingComplete: true,
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, _password?: string) => {
    void _password;
    setIsLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    const foundUser = DEMO_USERS[email];
    if (foundUser) {
      setUser(foundUser);
    } else {
      // Create a new user for any email
      setUser({
        id: `usr_${Date.now()}`,
        name: email.split("@")[0],
        email,
        phone: "",
        pan: "",
        role: "user",
        onboardingComplete: false,
      });
    }
    setIsLoading(false);
  }, []);

  const loginWithOTP = useCallback(async (phone: string, _otp?: string) => {
    void _otp;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setUser({
      id: `usr_${Date.now()}`,
      name: `User ${phone.slice(-4)}`,
      email: "",
      phone,
      pan: "",
      role: "user",
      onboardingComplete: false,
    });
    setIsLoading(false);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setUser(DEMO_USERS["demo@taxfiler.in"]);
    setIsLoading(false);
  }, []);

  const register = useCallback(async (data: { name: string; email: string; phone: string; pan: string }) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setUser({
      id: `usr_${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      pan: data.pan,
      role: "user",
      onboardingComplete: false,
    });
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
