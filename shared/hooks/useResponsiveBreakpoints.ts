import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Breakpoint system for responsive layouts
 * Supports foldables, tablets, and wide screens
 */
export const BREAKPOINTS = {
  sm: 640,   // Small devices (tablets, small foldables)
  md: 768,   // Medium devices (tablets, foldables)
  lg: 1024,  // Large devices (foldables unfolded, tablets landscape)
  xl: 1280,  // Extra large (large tablets, desktop)
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Hook for responsive breakpoint-based layouts
 * Returns current breakpoint and helper flags for different screen sizes
 * Automatically updates when window dimensions change (foldable spanning/unspanning)
 */
export function useResponsiveBreakpoints() {
  const { width } = useWindowDimensions();

  const breakpoints = useMemo(() => {
    const isSm = width >= BREAKPOINTS.sm;
    const isMd = width >= BREAKPOINTS.md;
    const isLg = width >= BREAKPOINTS.lg;
    const isXl = width >= BREAKPOINTS.xl;

    // Determine current breakpoint (largest matching)
    let current: Breakpoint = 'sm';
    if (isXl) current = 'xl';
    else if (isLg) current = 'lg';
    else if (isMd) current = 'md';
    else if (isSm) current = 'sm';

    return {
      width,
      current,
      isSm,
      isMd,
      isLg,
      isXl,
      isTablet: isMd,
      isWide: isLg, // Foldable unfolded or tablet landscape
    };
  }, [width]);

  return breakpoints;
}