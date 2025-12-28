import { useCallback, useRef } from "react";
import { router, usePathname } from "expo-router";

export function useSafeNavigation() {
  const pathname = usePathname();
  const isNavigatingRef = useRef(false);
  
  const safeBack = useCallback(() => {
    // Prevent infinite loops by checking if we're already navigating
    if (isNavigatingRef.current) {
      return;
    }
    
    isNavigatingRef.current = true;
    
    try {
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
    } finally {
      // Reset the flag after a short delay to allow navigation to complete
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    }
  }, [pathname]);

  return { safeBack };
}

