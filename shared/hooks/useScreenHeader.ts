import React, { useRef, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import { useHeader, HeaderState } from "@/components/ui/header";

/**
 * Hook to configure the global header for a screen.
 * Header is set on screen focus and reset on blur.
 * 
 * The header is updated when the screen gains focus and when dependencies change.
 * 
 * Default rule: extendToStatusBar defaults to true for consistent header heights (matches Feed/Compose).
 * Override by explicitly setting extendToStatusBar in the config.
 */
export function useScreenHeader(
  config: HeaderState,
  deps: React.DependencyList = []
) {
  const { setHeader, resetHeader } = useHeader();
  
  // Apply default rule: extendToStatusBar defaults to true unless explicitly set
  // This ensures consistent header heights across screens (matches Feed/Compose behavior)
  const configWithDefaults = React.useMemo(() => ({
    ...config,
    extendToStatusBar: config.extendToStatusBar ?? true,
  }), [config]);
  
  // Store config in a ref that's always current
  const configRef = useRef(configWithDefaults);
  const isFocusedRef = useRef(false);
  const prevDepsRef = useRef<React.DependencyList>([]);
  configRef.current = configWithDefaults;

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
    
    // Check if deps actually changed by comparing serialized values
    // This prevents infinite loops when object/array references change but values don't
    const depsChanged = deps.length !== prevDepsRef.current.length ||
      deps.some((dep, index) => {
        const prevDep = prevDepsRef.current[index];
        // For objects/arrays, use JSON.stringify comparison
        // For primitives, use strict equality
        if (typeof dep === 'object' && dep !== null && typeof prevDep === 'object' && prevDep !== null) {
          try {
            return JSON.stringify(dep) !== JSON.stringify(prevDep);
          } catch {
            // If serialization fails, fall back to reference comparison
            return dep !== prevDep;
          }
        }
        return dep !== prevDep;
      });
    
    if (depsChanged) {
      prevDepsRef.current = deps;
        setHeader(configRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

