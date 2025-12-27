import { useCallback } from "react";
import { router, usePathname } from "expo-router";

export function useSafeNavigation() {
  const pathname = usePathname();
  
  const safeBack = useCallback(() => {
    // If we're in the tabs context (compose, home, etc.), always navigate to home feed
    // This prevents going back to onboarding or other auth screens
    if (pathname?.startsWith("/(tabs)")) {
      router.replace('/(tabs)');
      return;
    }
    
    // For other screens, use normal back navigation
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback: navigate to safe screen (home tab)
      router.replace('/(tabs)');
    }
  }, [pathname]);

  return { safeBack };
}

