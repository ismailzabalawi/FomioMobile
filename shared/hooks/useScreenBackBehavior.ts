import React from "react";
import { useFocusEffect, router } from "expo-router";
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

  // Resolve config once for usePreventRemove
  const resolved = React.useMemo(
    () => (typeof config === "function" ? config() : config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps]
  );

  // Intercept swipe gestures and make them use the same handler as header back button
  // This ensures swipe back uses safeBack() just like the header button
  usePreventRemove(
    !!resolved.onBackPress,
    React.useCallback(() => {
      // Call the exact same handler that the header back button uses
      // This ensures swipe gesture behaves identically to header back button
      if (resolved.onBackPress) {
        resolved.onBackPress();
      }
    }, [resolved.onBackPress])
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
    }, [setBackBehavior, setHeader, resolved])
  );
}

