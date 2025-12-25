// UI Spec: Enhanced BottomSheetBackdrop
// - Blur backdrop with animated opacity
// - Theme-aware blur intensity
// - Tap-to-dismiss with haptic feedback
// - Smooth animations on sheet open/close

import 'react-native-reanimated';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableWithoutFeedback, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/components/theme';
import * as Haptics from 'expo-haptics';

export interface EnhancedBottomSheetBackdropProps extends BottomSheetBackdropProps {
  /**
   * Enable blur effect (default: false)
   * When enabled, uses expo-blur for frosted glass effect
   */
  enableBlur?: boolean;
  
  /**
   * Blur intensity (default: 20)
   * Higher values = more blur
   */
  blurIntensity?: number;
  
  /**
   * Enable haptic feedback on tap (default: true)
   */
  enableHaptics?: boolean;
  
  /**
   * Custom opacity override
   */
  customOpacity?: number;
}

/**
 * Enhanced backdrop component with optional blur and haptic feedback
 * 
 * Features:
 * - Optional blur effect using expo-blur
 * - Theme-aware blur intensity (darker themes use less blur)
 * - Haptic feedback on tap-to-dismiss
 * - Smooth opacity animations
 * 
 * @example
 * ```tsx
 * <EnhancedBottomSheetBackdrop
 *   enableBlur
 *   blurIntensity={30}
 *   disappearsOnIndex={-1}
 *   appearsOnIndex={0}
 * />
 * ```
 */
export function EnhancedBottomSheetBackdrop({
  enableBlur = false,
  blurIntensity = 20,
  enableHaptics = true,
  customOpacity,
  style,
  ...props
}: EnhancedBottomSheetBackdropProps) {
  const { isDark } = useTheme();
  
  // Theme-aware blur intensity (darker themes need less blur for visibility)
  const themeBlurIntensity = useMemo(
    () => (isDark ? blurIntensity * 0.8 : blurIntensity),
    [isDark, blurIntensity]
  );
  
  // Handle tap with haptic feedback
  const handlePress = useCallback(() => {
    if (enableHaptics && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [enableHaptics]);
  
  // Base backdrop style with opacity
  const backdropStyle = useMemo(
    () => [
      styles.backdrop,
      style,
      customOpacity !== undefined && {
        opacity: customOpacity,
      },
    ],
    [style, customOpacity]
  );
  
  if (enableBlur) {
    // Blur backdrop with tint
    return (
      <BottomSheetBackdrop
        {...props}
        style={backdropStyle}
      >
        <TouchableWithoutFeedback onPress={handlePress}>
          <BlurView
            intensity={themeBlurIntensity}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </TouchableWithoutFeedback>
      </BottomSheetBackdrop>
    );
  }
  
  // Standard backdrop with opacity
  return (
    <BottomSheetBackdrop
      {...props}
      style={backdropStyle}
      enableTouchThrough={false}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
});

