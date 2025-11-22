import React from "react";
import { useFocusEffect, router } from "expo-router";
import { useHeader } from "@/components/ui/header";

interface BackBehaviorConfig {
  canGoBack?: boolean;
  onBackPress?: () => void;
}

export function useScreenBackBehavior(
  config: BackBehaviorConfig | (() => BackBehaviorConfig),
  deps: React.DependencyList = []
) {
  const { setBackBehavior, setHeader } = useHeader();

  useFocusEffect(
    React.useCallback(() => {
      const resolved =
        typeof config === "function" ? config() : config;
      setBackBehavior({
        canGoBack:
          resolved.canGoBack !== undefined
            ? resolved.canGoBack
            : router.canGoBack(),
        onBackPress: resolved.onBackPress,
      });
      // Cleanup: reset back behavior on blur
      return () => {
        setHeader({ canGoBack: undefined, onBackPress: undefined });
      };
    }, [setBackBehavior, setHeader, ...deps])
  );
}

