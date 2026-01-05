import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Breakpoint system for responsive layouts
 * Supports foldables, tablets, and wide screens
 * 
 * Breakpoints:
 * - xs: 0px+ (phones, small screens)
 * - sm: 640px+ (tablets, small foldables)
 * - md: 768px+ (tablets, foldables)
 * - lg: 1024px+ (foldables unfolded, tablets landscape)
 * - xl: 1280px+ (large tablets, desktop)
 */
export const BREAKPOINTS = {
  xs: 0,     // Extra small devices (phones, small screens)
  sm: 640,   // Small devices (tablets, small foldables)
  md: 768,   // Medium devices (tablets, foldables)
  lg: 1024,  // Large devices (foldables unfolded, tablets landscape)
  xl: 1280,  // Extra large (large tablets, desktop)
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Hook for responsive breakpoint-based layouts
 * 
 * Returns current breakpoint and helper flags for different screen sizes.
 * Automatically updates when window dimensions change (foldable spanning/unspanning).
 * 
 * @returns {Object} Breakpoint information
 * @returns {number} .width - Current screen width
 * @returns {Breakpoint} .current - Current breakpoint (xs, sm, md, lg, or xl)
 * @returns {boolean} .isSm - Width >= 640px
 * @returns {boolean} .isMd - Width >= 768px
 * @returns {boolean} .isLg - Width >= 1024px
 * @returns {boolean} .isXl - Width >= 1280px
 * @returns {boolean} .isTablet - Width >= 768px (alias for isMd)
 * @returns {boolean} .isWide - Width >= 1024px (alias for isLg)
 * 
 * @example
 * ```tsx
 * const { current, isTablet, isWide } = useResponsiveBreakpoints();
 * 
 * // Adjust layout based on breakpoint
 * const columns = isWide ? 3 : isTablet ? 2 : 1;
 * const padding = current === 'xl' ? 24 : current === 'lg' ? 20 : 16;
 * ```
 */
export function useResponsiveBreakpoints() {
  const { width } = useWindowDimensions();

  const breakpoints = useMemo(() => {
    const isSm = width >= BREAKPOINTS.sm;
    const isMd = width >= BREAKPOINTS.md;
    const isLg = width >= BREAKPOINTS.lg;
    const isXl = width >= BREAKPOINTS.xl;

    // Determine current breakpoint (largest matching)
    // Default to 'xs' for devices below 640px
    let current: Breakpoint = 'xs';
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