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
 * 
 * Returns safe defaults if context is not available (e.g., in BottomSheetModal portals)
 * to prevent crashes, but logs a warning for debugging.
 */
// Declare __DEV__ for TypeScript (React Native global)
declare const __DEV__: boolean;

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    // Return safe defaults instead of throwing to support components in portals/modals
    // that might not have access to the AuthProvider context
    // Only warn in development mode to reduce noise in production
    if (__DEV__) {
      // Use a one-time warning per component mount to avoid spam
      const hasWarned = (global as any).__useAuthWarningShown;
      if (!hasWarned) {
        console.warn("useAuth called outside <AuthProvider> - returning default values. Consider passing isAuthenticated as a prop.");
        (global as any).__useAuthWarningShown = true;
        // Reset after a delay to allow warnings in different components
        setTimeout(() => {
          (global as any).__useAuthWarningShown = false;
        }, 5000);
      }
    }
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      signIn: async () => ({ success: false, error: "Not within AuthProvider" }),
      signOut: async () => {},
      signUp: async () => ({ success: false, error: "Not within AuthProvider" }),
      refreshAuth: async () => {},
      setAuthenticatedUser: async () => {},
    };
  }
  return context;
}

