import { useCallback } from "react";
import { router } from "expo-router";

export function useSafeNavigation() {
  const safeBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback: navigate to safe screen (home tab)
      router.replace("/(tabs)/");
    }
  }, []);

  return { safeBack };
}

