import React from "react";
import { useFocusEffect, router, useNavigation, usePathname } from "expo-router";
import { useHeader } from "@/components/ui/header";
import { Platform, BackHandler } from "react-native";
import { usePreventRemove } from "@react-navigation/native";

interface BackBehaviorConfig {
  canGoBack?: boolean;
  onBackPress?: () => void;
}

export function useScreenBackBehavior(
  config: BackBehaviorConfig | (() => BackBehaviorConfig),
  deps: React.DependencyList = []
) {
  const { setBackBehavior, setHeader } = useHeader();
  const navigation = useNavigation();
  const pathname = usePathname();

  // Resolve config once - usePreventRemove needs stable reference
  const resolved = React.useMemo(
    () => (typeof config === "function" ? config() : config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps]
  );

  // Use usePreventRemove hook to intercept gesture-based navigation (iOS swipe back, Android back gesture)
  // This is the recommended approach for native-stack as beforeRemove with preventDefault is not fully supported
  usePreventRemove(
    !!resolved.onBackPress,
    React.useCallback(() => {
      // If we're in tabs context, navigate directly to home to avoid going to onboarding
      // This is critical for compose screen to prevent going back to onboarding
      if (pathname?.startsWith("/(tabs)")) {
        router.replace('/(tabs)');
        return;
      }

      // Call our custom handler for other screens
      if (resolved.onBackPress) {
        resolved.onBackPress();
      }
    }, [pathname, resolved.onBackPress])
  );

  useFocusEffect(
    React.useCallback(() => {
      setBackBehavior({
        canGoBack:
          resolved.canGoBack !== undefined
            ? resolved.canGoBack
            : router.canGoBack(),
        onBackPress: resolved.onBackPress,
      });

      // Handle Android hardware back button
      let backHandler: ReturnType<typeof BackHandler.addEventListener> | null = null;
      if (Platform.OS === 'android' && resolved.onBackPress) {
        backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
          // If we're in tabs context, navigate directly to home
          if (pathname?.startsWith("/(tabs)")) {
            router.replace('/(tabs)');
            return true;
          }
          resolved.onBackPress?.();
          return true; // Prevent default back behavior
        });
      }

      // Cleanup: reset back behavior on blur
      return () => {
        if (backHandler) {
          backHandler.remove();
        }
        setHeader({ canGoBack: undefined, onBackPress: undefined });
      };
    }, [setBackBehavior, setHeader, pathname, resolved])
  );
}

