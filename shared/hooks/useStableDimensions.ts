import { useState, useEffect } from 'react';
import { useWindowDimensions, ScaledSize } from 'react-native';

/**
 * Hook for stable window dimensions with debouncing
 * 
 * Wraps `useWindowDimensions()` with debouncing to prevent rapid re-renders
 * during fold/unfold animations on foldable devices. Dimensions update after
 * the animation settles, providing stable values for layout calculations.
 * 
 * Use this hook when:
 * - You need stable dimensions during fold/unfold transitions
 * - Rapid dimension changes cause performance issues
 * - Layout calculations are expensive and should only run after animation completes
 * 
 * Use `useWindowDimensions()` directly when:
 * - You need immediate dimension updates (e.g., for real-time UI feedback)
 * - The component can handle rapid re-renders efficiently
 * - Debouncing would cause noticeable lag in UI updates
 * 
 * @param {number} [debounceMs=100] - Debounce delay in milliseconds
 * @returns {ScaledSize} Stable window dimensions (width, height, scale, fontScale)
 * 
 * @example
 * ```tsx
 * // Default 100ms debounce
 * const { width, height } = useStableDimensions();
 * 
 * // Custom debounce delay (200ms for slower animations)
 * const dimensions = useStableDimensions(200);
 * 
 * // Use in layout calculations
 * const layout = useMemo(() => {
 *   return calculateLayout(dimensions.width, dimensions.height);
 * }, [dimensions.width, dimensions.height]);
 * ```
 */
export function useStableDimensions(debounceMs: number = 100): ScaledSize {
  const dimensions = useWindowDimensions();
  const [stable, setStable] = useState<ScaledSize>(dimensions);

  useEffect(() => {
    // Debounce dimension updates to prevent rapid re-renders during animations
    const timer = setTimeout(() => {
      setStable(dimensions);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [dimensions.width, dimensions.height, dimensions.scale, dimensions.fontScale, debounceMs]);

  return stable;
}

