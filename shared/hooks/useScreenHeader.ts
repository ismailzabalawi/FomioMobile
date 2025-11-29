import React, { useRef, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import { useHeader, HeaderState } from "@/components/ui/header";

/**
 * Hook to configure the global header for a screen.
 * Header is set on screen focus and reset on blur.
 * 
 * The header is updated when the screen gains focus and when dependencies change.
 */
export function useScreenHeader(
  config: HeaderState,
  deps: React.DependencyList = []
) {
  const { setHeader, resetHeader } = useHeader();
  
  // Store config in a ref that's always current
  const configRef = useRef(config);
  const isFocusedRef = useRef(false);
  configRef.current = config;

  useFocusEffect(
    React.useCallback(() => {
      isFocusedRef.current = true;
      setHeader(configRef.current);
      
      return () => {
        isFocusedRef.current = false;
        resetHeader();
      };
    }, [setHeader, resetHeader])
  );
  
  useEffect(() => {
    if (!isFocusedRef.current) return;
        setHeader(configRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

