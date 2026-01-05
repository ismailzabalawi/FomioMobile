import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useFoldableLayout } from '@/shared/hooks/useFoldableLayout';

interface AdaptiveContentOptions {
  /** Maximum content width when constrained (default: 10000) */
  maxWidth?: number;
  /** Ratio of available width to use for content (default: 1.0) */
  widthRatio?: number;
  /** Minimum horizontal padding on each side (default: 8) */
  minHorizontalPadding?: number;
  /** Minimum screen width before applying constraints (default: 100000, effectively never) */
  minWidthForConstraint?: number;
  /** Whether to constrain content when vertical hinge is detected (default: false) */
  constrainForHinge?: boolean;
}

interface AdaptiveContentLayout {
  /** Style object for the content container */
  contentContainerStyle: ViewStyle;
  /** Calculated content width in pixels */
  contentWidth: number;
  /** Calculated side padding in pixels */
  sidePadding: number;
}

/**
 * Hook for adaptive content layout that handles foldable devices and wide screens
 * 
 * Automatically adjusts content width and padding based on screen size, safe area insets,
 * and hinge detection. By default, content is not constrained (minWidthForConstraint = 100000)
 * to prevent narrow layouts. Explicit configuration is required for constrained layouts.
 * 
 * @param {AdaptiveContentOptions} options - Configuration options
 * @param {number} [options.maxWidth=10000] - Maximum content width when constrained
 * @param {number} [options.widthRatio=1] - Ratio of available width to use (0-1)
 * @param {number} [options.minHorizontalPadding=8] - Minimum padding on each side
 * @param {number} [options.minWidthForConstraint=100000] - Min width before constraining (effectively never by default)
 * @param {boolean} [options.constrainForHinge=false] - Constrain when vertical hinge detected
 * 
 * @returns {AdaptiveContentLayout} Layout information
 * @returns {ViewStyle} .contentContainerStyle - Style object with horizontal padding (safe for ScrollView/FlatList contentContainerStyle)
 * @returns {number} .contentWidth - Calculated content width in pixels (use for maxWidth on container if constraining)
 * @returns {number} .sidePadding - Calculated side padding in pixels
 * 
 * @example
 * ```tsx
 * // Default: full width with safe area padding
 * const layout = useAdaptiveContentLayout();
 * 
 * // Constrained layout for tablets/wide screens
 * const constrainedLayout = useAdaptiveContentLayout({
 *   maxWidth: 800,
 *   minWidthForConstraint: 768,
 * });
 * 
 * // Constrain when hinge is detected
 * const hingeAwareLayout = useAdaptiveContentLayout({
 *   maxWidth: 600,
 *   constrainForHinge: true,
 * });
 * ```
 */
export function useAdaptiveContentLayout(
  options: AdaptiveContentOptions = {}
): AdaptiveContentLayout {
  const { width } = useWindowDimensions();
  const { paddingLeft, paddingRight, hinge } = useFoldableLayout();
  const {
    maxWidth = 10000,
    widthRatio = 1,
    minHorizontalPadding = 8,
    minWidthForConstraint = 100000,
    constrainForHinge = false,
  } = options;

  // Extract numeric value from hinge.bounds to avoid object reference issues in dependency array
  const hingeBoundsWidth = hinge.bounds?.width ?? 0;

  return useMemo(() => {
    const hasVerticalHinge =
      hinge.isSeparating &&
      hinge.orientation === 'VERTICAL' &&
      Boolean(hinge.bounds);
    const shouldConstrain = width >= minWidthForConstraint || (constrainForHinge && hasVerticalHinge);

    if (!shouldConstrain) {
      return {
        contentContainerStyle: {
          paddingLeft: paddingLeft + minHorizontalPadding,
          paddingRight: paddingRight + minHorizontalPadding,
        },
        contentWidth: width,
        sidePadding: minHorizontalPadding,
      };
    }

    const hingePenalty =
      hasVerticalHinge && hinge.bounds
        ? Math.max(0, hingeBoundsWidth)
        : 0;
    const safeHorizontal = paddingLeft + paddingRight;
    const availableWidth = Math.max(
      0,
      width - safeHorizontal - minHorizontalPadding * 2 - hingePenalty
    );
    const contentWidth = Math.min(maxWidth, Math.floor(availableWidth * widthRatio));
    const sidePadding = Math.max(
      minHorizontalPadding,
      (availableWidth - contentWidth) / 2 + minHorizontalPadding
    );

    return {
      contentContainerStyle: {
        paddingLeft: paddingLeft + sidePadding,
        paddingRight: paddingRight + sidePadding,
        // Note: maxWidth and alignSelf should be applied to the ScrollView/FlatList container,
        // not the contentContainerStyle. These are provided for reference in contentWidth.
      },
      contentWidth,
      sidePadding,
    };
  }, [
    width,
    paddingLeft,
    paddingRight,
    hinge.isSpanning,
    hinge.isSeparating,
    hinge.orientation,
    hingeBoundsWidth,
    maxWidth,
    widthRatio,
    minHorizontalPadding,
    minWidthForConstraint,
    constrainForHinge,
  ]);
}
