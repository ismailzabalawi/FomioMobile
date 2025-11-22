import { useAuth } from "@/shared/auth-context";

/**
 * Simple auth state hook for route guards
 * Uses the unified AuthContext to ensure consistent state
 * Returns ready state and signedIn status
 */
export function useAuthState() {
  const { isAuthenticated, isLoading } = useAuth();
  return { ready: !isLoading, signedIn: isAuthenticated };
}
