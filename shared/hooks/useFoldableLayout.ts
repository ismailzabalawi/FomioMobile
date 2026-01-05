import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFoldingFeature } from '@logicwind/react-native-fold-detection';

/**
 * Hinge/dual-screen information interface
 * Supports foldables and wide screens
 */
export interface HingeInfo {
  isSpanning: boolean; // Device is spanning across screens/hinge or is wide
  isSeparating: boolean;
  orientation: 'VERTICAL' | 'HORIZONTAL' | 'UNKNOWN';
  bounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  } | null;
}

/**
 * Hook for foldable/dual-screen device layout awareness
 * 
 * Uses width-based heuristic detection that works without native modules.
 * This is compatible with Expo Go and all platforms.
 * 
 * Note: Native foldable detection (via @logicwind/react-native-fold-detection)
 * is used when available, with a width-based heuristic fallback.
 * 
 * Features:
 * - Detects when device is in wide/spanning mode (width > 600px)
 * - Provides safe area insets for complete layout protection
 * - Works on iOS, Android, and web
 * - Responsive to screen size changes (fold/unfold)
 * - Aspect ratio detection and auto-adjustment for optimal layouts
 * 
 * @returns {Object} Foldable layout information
 * @returns {boolean} .isSpanning - Whether device is in spanning/wide mode
 * @returns {HingeInfo} .hinge - Detailed hinge information (bounds, orientation, separating state)
 * @returns {Object} .posture - Device posture information
 * @returns {boolean} .posture.isTableTop - Device is in tabletop mode (folded, both screens visible)
 * @returns {boolean} .posture.isBook - Device is in book mode (folded, single screen visible)
 * @returns {boolean} .posture.isFlat - Device is fully unfolded/flat
 * @returns {number} .aspectRatio - Screen aspect ratio (width / height)
 * @returns {boolean} .isPortrait - Device is in portrait orientation (height > width)
 * @returns {boolean} .isLandscape - Device is in landscape orientation (width > height)
 * @returns {boolean} .isVeryTall - Aspect ratio < 0.5 (outer screen of foldable)
 * @returns {boolean} .isVeryWide - Aspect ratio > 2.0 (unfolded foldable in landscape)
 * @returns {boolean} .isSquareish - Aspect ratio between 0.8 and 1.25 (inner screen of foldable)
 * @returns {boolean} .isNarrowScreen - Width < 400px (outer screen of foldable)
 * @returns {number} .screenWidth - Current screen width in pixels
 * @returns {number} .screenHeight - Current screen height in pixels
 * @returns {number} .paddingLeft - Safe area left padding (unchanged from system)
 * @returns {number} .paddingRight - Safe area right padding (unchanged from system)
 * @returns {number} .paddingTop - Safe area top padding (unchanged from system)
 * @returns {number} .paddingBottom - Safe area bottom padding (unchanged from system)
 * @returns {number} .horizontalPadding - Combined left + right padding
 * @returns {boolean} .isWideScreen - Width > 600px
 * @returns {boolean} .isTablet - Width > 768px
 * 
 * @example
 * ```tsx
 * const { isSpanning, aspectRatio, paddingLeft, paddingRight } = useFoldableLayout();
 * 
 * // Adjust layout based on foldable state
 * const containerStyle = {
 *   paddingLeft: paddingLeft,
 *   paddingRight: paddingRight,
 *   maxWidth: isSpanning ? 1200 : '100%',
 * };
 * ```
 */
export function useFoldableLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const foldingFeature = useFoldingFeature();

  const foldableInfo = useMemo(() => {
    const layoutInfo = foldingFeature?.layoutInfo as
      | {
          bounds?: { top: number; bottom: number; left: number; right: number };
          isSeparating?: boolean;
          state?: string;
          orientation?: string;
        }
      | undefined;

    const nativeBounds = layoutInfo?.bounds
      ? {
          ...layoutInfo.bounds,
          width: Math.max(0, layoutInfo.bounds.right - layoutInfo.bounds.left),
          height: Math.max(0, layoutInfo.bounds.bottom - layoutInfo.bounds.top),
        }
      : null;

    // Prefer native fold info when available; otherwise fall back to width heuristic.
    const hasNativeFold =
      !!nativeBounds ||
      Boolean(layoutInfo?.isSeparating) ||
      Boolean(foldingFeature?.isTableTop) ||
      Boolean(foldingFeature?.isBook);
    const isSpanning = hasNativeFold || width > 600;

    const hinge: HingeInfo = {
      isSpanning,
      isSeparating: Boolean(layoutInfo?.isSeparating),
      orientation:
        layoutInfo?.orientation === 'VERTICAL' || layoutInfo?.orientation === 'HORIZONTAL'
          ? layoutInfo.orientation
          : 'UNKNOWN',
      bounds: nativeBounds,
    };

    // Aspect ratio calculations
    const aspectRatio = width > 0 && height > 0 ? width / height : 1;
    const isPortrait = height > width;
    const isLandscape = width > height;
    // Very tall: outer screen of foldable (e.g., Galaxy Fold outer ~0.4)
    const isVeryTall = aspectRatio < 0.5;
    // Very wide: unfolded foldable in landscape (e.g., ~2.2)
    const isVeryWide = aspectRatio > 2.0;
    // Squareish: inner screen of foldable unfolded in portrait (~0.8-1.0)
    const isSquareish = aspectRatio >= 0.8 && aspectRatio <= 1.25;
    // Narrow screen: outer screen of foldable or small phones (width < 400)
    const isNarrowScreen = width < 400;

    return {
      isSpanning: hinge.isSpanning,
      hinge,
      posture: {
        isTableTop: Boolean(foldingFeature?.isTableTop),
        isBook: Boolean(foldingFeature?.isBook),
        isFlat: Boolean(foldingFeature?.isFlat),
      },
      // Screen dimensions
      screenWidth: width,
      screenHeight: height,
      // Aspect ratio information (components can use these to adapt)
      aspectRatio,
      isPortrait,
      isLandscape,
      isVeryTall,
      isVeryWide,
      isSquareish,
      isNarrowScreen,
      // Pass through safe area insets unchanged
      // Components should use these directly without modification
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      horizontalPadding: insets.left + insets.right,
      // Additional info for responsive layouts
      isWideScreen: width > 600,
      isTablet: width > 768,
    };
  }, [width, height, insets]);

  return foldableInfo;
}
