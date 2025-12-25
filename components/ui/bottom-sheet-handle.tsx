// UI Spec: BottomSheetHandle
// - Customizable, animated handle indicator for bottom sheets
// - Theme-aware colors (Light + AMOLED Dark)
// - Animated width/height based on drag state
// - Smooth animations on gesture start/end

import React, { useMemo } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/components/theme';

export interface BottomSheetHandleProps {
  /**
   * Handle width (default: 40)
   */
  width?: number;
  
  /**
   * Handle height (default: 4)
   */
  height?: number;
  
  /**
   * Border radius (default: 2)
   */
  borderRadius?: number;
  
  /**
   * Custom color override (optional, defaults to theme-aware color)
   */
  color?: string;
  
  /**
   * Enable animated width on drag (deprecated - use handleIndicatorStyle on ThemedBottomSheet instead)
   * @deprecated Animation is handled via ThemedBottomSheet's handleIndicatorStyle prop
   */
  enableAnimatedWidth?: boolean;
  
  /**
   * Additional style
   */
  style?: ViewStyle;
}

/**
 * Custom handle component for bottom sheets
 * 
 * Features:
 * - Theme-aware colors (adapts to Light/Dark/AMOLED)
 * - Customizable size and styling
 * 
 * Note: For animated handles, use ThemedBottomSheet's handleIndicatorStyle prop instead.
 * 
 * @example
 * ```tsx
 * <BottomSheetHandle width={48} height={5} />
 * ```
 */
export function BottomSheetHandle({
  width = 40,
  height = 4,
  borderRadius = 2,
  color,
  enableAnimatedWidth, // Deprecated - ignored
  style,
}: BottomSheetHandleProps) {
  const { isDark } = useTheme();
  
  // Default theme-aware handle color
  const defaultColor = useMemo(
    () => (isDark ? '#1C1C1E' : '#E3E3E6'),
    [isDark]
  );
  
  const handleColor = color || defaultColor;
  
  // Static style for the handle
  const handleStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius,
      backgroundColor: handleColor,
    }),
    [width, height, borderRadius, handleColor]
  );
  
  return (
    <View
      style={[
        styles.container,
        handleStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
});

