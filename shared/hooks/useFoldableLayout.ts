import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hinge/dual-screen information interface
 * Supports foldables and wide screens
 */
export interface HingeInfo {
  isSpanning: boolean; // Device is spanning across screens/hinge or is wide
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
 * Note: Native foldable detection libraries (react-native-dualscreeninfo,
 * @logicwind/react-native-fold-detection) have been disabled due to
 * compatibility issues with Expo. The heuristic approach provides good
 * support for responsive layouts on foldables and wide screens.
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

  const foldableInfo = useMemo(() => {
    // Heuristic detection: wide screens (foldables unfolded, tablets, etc.)
    // typically have width > 600px
    const isSpanning = width > 600;

    const hinge: HingeInfo = {
      isSpanning,
      bounds: null, // No native hinge detection available
    };

    return {
      isSpanning: hinge.isSpanning,
      hinge,
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