import React, { createContext, useContext } from "react";
import { useAuth as useAuthZustand } from "./useAuth";
import type { AppUser } from "./discourseApi";

/**
 * AuthContext provides a React Context wrapper around the Zustand-based useAuth hook
 * This ensures a single source of truth and allows AuthProvider at root level
 */
type AuthContextValue = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (identifier?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signUp: (userData: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;
  setAuthenticatedUser: (user: AppUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider wraps the app and provides authentication state via Context
 * This ensures all components use the same auth state instance
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthZustand();

  const value: AuthContextValue = {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    signIn: auth.signIn,
    signOut: auth.signOut,
    signUp: auth.signUp,
    refreshAuth: auth.refreshAuth,
    setAuthenticatedUser: auth.setAuthenticatedUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth hook - must be used within AuthProvider
 * This is the unified import path: @/shared/auth-context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return context;
}

