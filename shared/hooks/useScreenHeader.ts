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
 * 
 * ⚠️ WARNING: Do not pass React elements (JSX) in the deps array. 
 * React elements are recreated on every render and will cause infinite loops.
 * If you need to update the header when a React element changes, pass a stable identifier instead.
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
  
  // Helper to check if a value is a React element
  const isReactElement = (value: unknown): boolean => {
    return (
      React.isValidElement(value) ||
      (typeof value === 'object' && value !== null && '$$typeof' in value)
    );
  };

  useEffect(() => {
    if (!isFocusedRef.current) return;
    
    // Filter out React elements from comparison - they can't be reliably compared
    // and should not be in deps anyway (they're recreated on every render)
    const stableDeps = deps.filter(dep => !isReactElement(dep));
    const prevStableDeps = prevDepsRef.current.filter(dep => !isReactElement(dep));
    
    // Check if stable deps actually changed by comparing serialized values
    // This prevents infinite loops when object/array references change but values don't
    const depsChanged = stableDeps.length !== prevStableDeps.length ||
      stableDeps.some((dep, index) => {
        const prevDep = prevStableDeps[index];
        
        // React elements should not be in deps - skip them
        if (isReactElement(dep) || isReactElement(prevDep)) {
          return false; // Ignore React elements in comparison
        }
        
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
  }, [deps, setHeader]); // ✅ FIXED: Added setHeader to dependency array
}

