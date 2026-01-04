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

    return {
      isSpanning: hinge.isSpanning,
      hinge,
      posture: {
        isTableTop: Boolean(foldingFeature?.isTableTop),
        isBook: Boolean(foldingFeature?.isBook),
        isFlat: Boolean(foldingFeature?.isFlat),
      },
      // Use safe area insets for padding
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
