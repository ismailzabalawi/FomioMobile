import React from "react";
import { useFocusEffect } from "expo-router";
import { useHeader, HeaderState } from "@/components/ui/header";

export function useScreenHeader(
  config: HeaderState,
  deps: React.DependencyList = []
) {
  const { setHeader, resetHeader } = useHeader();

  useFocusEffect(
    React.useCallback(() => {
      setHeader(config);
      // cleanup on blur
      return () => {
        resetHeader();
      };
    }, [setHeader, resetHeader, ...deps])
  );
}

