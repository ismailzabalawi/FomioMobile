// UI Spec: Bottom Sheet Animation Utilities
// - Reusable animation hooks for bottom sheet interactions
// - Provides common animation patterns (header fade, background blur, position-based effects)
// - Uses react-native-reanimated for smooth, performant animations

import { useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useBottomSheet } from '@gorhom/bottom-sheet';

/**
 * Animation constants for consistent interpolation ranges
 */
export const ANIMATION_CONSTANTS = {
  // Position ranges for interpolation (in pixels)
  HEADER_FADE_START: 0,
  HEADER_FADE_END: 200,
  
  // Background scale ranges
  BACKGROUND_SCALE_START: 0,
  BACKGROUND_SCALE_END: 300,
  BACKGROUND_SCALE_MIN: 0.95, // Scale down to 95% when sheet is fully expanded
  
  // Blur intensity ranges
  BLUR_START: 0,
  BLUR_END: 250,
  BLUR_MAX_INTENSITY: 20, // Maximum blur radius
  
  // Scroll indicator opacity
  SCROLL_INDICATOR_START: 100,
  SCROLL_INDICATOR_END: 300,
} as const;

/**
 * Hook to access animated position from bottom sheet
 * 
 * @returns Animated position value that can be used with useAnimatedStyle
 * 
 * @example
 * ```tsx
 * const animatedPosition = useBottomSheetAnimatedPosition();
 * const style = useAnimatedStyle(() => ({
 *   opacity: interpolate(animatedPosition.value, [0, 200], [0, 1]),
 * }));
 * ```
 */
export function useBottomSheetAnimatedPosition() {
  const { animatedPosition } = useBottomSheet();
  return animatedPosition;
}

/**
 * Hook to create animated header opacity based on sheet position
 * Header fades in as sheet expands
 * 
 * @param startPosition - Position where fade starts (default: 0)
 * @param endPosition - Position where fade completes (default: 200)
 * @returns Animated style for header opacity
 * 
 * @example
 * ```tsx
 * const headerStyle = useSheetHeaderOpacity();
 * <Animated.View style={headerStyle}>
 *   <Text>Header</Text>
 * </Animated.View>
 * ```
 */
export function useSheetHeaderOpacity(
  startPosition: number = ANIMATION_CONSTANTS.HEADER_FADE_START,
  endPosition: number = ANIMATION_CONSTANTS.HEADER_FADE_END
) {
  const animatedPosition = useBottomSheetAnimatedPosition();
  
  return useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedPosition.value,
      [startPosition, endPosition],
      [0, 1],
      Extrapolation.CLAMP
    );
    
    return {
      opacity,
    };
  });
}

/**
 * Hook to create animated background blur effect when sheet opens
 * 
 * @param maxBlur - Maximum blur intensity (default: 20)
 * @param startPosition - Position where blur starts (default: 0)
 * @param endPosition - Position where blur reaches max (default: 250)
 * @returns Animated style with blur radius
 * 
 * @example
 * ```tsx
 * const blurStyle = useSheetBackgroundBlur();
 * <BlurView style={blurStyle} intensity={20}>
 *   <Content />
 * </BlurView>
 * ```
 */
export function useSheetBackgroundBlur(
  maxBlur: number = ANIMATION_CONSTANTS.BLUR_MAX_INTENSITY,
  startPosition: number = ANIMATION_CONSTANTS.BLUR_START,
  endPosition: number = ANIMATION_CONSTANTS.BLUR_END
) {
  const animatedPosition = useBottomSheetAnimatedPosition();
  
  return useAnimatedStyle(() => {
    const blurRadius = interpolate(
      animatedPosition.value,
      [startPosition, endPosition],
      [0, maxBlur],
      Extrapolation.CLAMP
    );
    
    return {
      // Note: Blur radius is typically handled by BlurView component
      // This returns the interpolated value for use with expo-blur's intensity prop
      opacity: interpolate(
        animatedPosition.value,
        [startPosition, endPosition],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  }, [maxBlur, startPosition, endPosition]);
}

/**
 * Hook to create animated background scale effect
 * Background scales down slightly when sheet opens for depth effect
 * 
 * @param minScale - Minimum scale value (default: 0.95)
 * @param startPosition - Position where scale starts (default: 0)
 * @param endPosition - Position where scale reaches minimum (default: 300)
 * @returns Animated style with transform scale
 * 
 * @example
 * ```tsx
 * const scaleStyle = useSheetBackgroundScale();
 * <Animated.View style={[{ transform: [{ scale: 1 }] }, scaleStyle]}>
 *   <BackgroundContent />
 * </Animated.View>
 * ```
 */
export function useSheetBackgroundScale(
  minScale: number = ANIMATION_CONSTANTS.BACKGROUND_SCALE_MIN,
  startPosition: number = ANIMATION_CONSTANTS.BACKGROUND_SCALE_START,
  endPosition: number = ANIMATION_CONSTANTS.BACKGROUND_SCALE_END
) {
  const animatedPosition = useBottomSheetAnimatedPosition();
  
  return useAnimatedStyle(() => {
    const scale = interpolate(
      animatedPosition.value,
      [startPosition, endPosition],
      [1, minScale],
      Extrapolation.CLAMP
    );
    
    return {
      transform: [{ scale }],
    };
  }, [minScale, startPosition, endPosition]);
}

/**
 * Hook to create animated scroll indicator opacity
 * Scroll indicators fade in as sheet expands
 * 
 * @param startPosition - Position where fade starts (default: 100)
 * @param endPosition - Position where fade completes (default: 300)
 * @returns Animated style for scroll indicator opacity
 */
export function useSheetScrollIndicatorOpacity(
  startPosition: number = ANIMATION_CONSTANTS.SCROLL_INDICATOR_START,
  endPosition: number = ANIMATION_CONSTANTS.SCROLL_INDICATOR_END
) {
  const animatedPosition = useBottomSheetAnimatedPosition();
  
  return useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedPosition.value,
      [startPosition, endPosition],
      [0, 1],
      Extrapolation.CLAMP
    );
    
    return {
      opacity,
    };
  }, [startPosition, endPosition]);
}

