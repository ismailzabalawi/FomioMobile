// UI Spec: ThemedBottomSheet
// - Wrapper around @gorhom/bottom-sheet that enforces Fomio design tokens
// - Uses NativeWind classes exclusively (no inline styles for colors)
// - Respects Light + AMOLED Dark themes via semantic tokens
// - Provides consistent backdrop, handle, and background styling
// - Type-safe with strict TypeScript
// - Supports advanced features: detached mode, gesture config, dynamic sizing

import 'react-native-reanimated';
import React, { useCallback, useMemo } from 'react';
import { Platform, ViewStyle, AnimatedStyleProp } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/components/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Type for BottomSheetModal ref - use ElementRef for type safety
type BottomSheetModalRef = React.ElementRef<typeof BottomSheetModal>;

interface ThemedBottomSheetProps extends Omit<BottomSheetModalProps, 'backgroundStyle' | 'handleIndicatorStyle'> {
  /**
   * Enable backdrop (default: true)
   */
  enableBackdrop?: boolean;
  
  /**
   * Backdrop opacity (default: 0.5)
   */
  backdropOpacity?: number;

  /**
   * Enable detached mode for Instagram-style floating sheets
   * When enabled, sheet appears with margins and rounded corners
   */
  detached?: boolean;

  /**
   * Enable over-drag resistance (default: false)
   * Prevents over-dragging beyond snap points for smoother feel
   */
  enableOverDrag?: boolean;

  /**
   * Active offset Y for gesture detection
   * Controls sensitivity of vertical drag gestures
   */
  activeOffsetY?: number[];

  /**
   * Fail offset X for gesture detection
   * Prevents horizontal gestures from interfering with vertical drag
   */
  failOffsetX?: number[];

  /**
   * Over-drag resistance factor (default: 2)
   * Higher values = more resistance when over-dragging
   */
  overDragResistanceFactor?: number;

  /**
   * Enable dynamic sizing based on content height
   * When enabled, snap points adapt to content size
   */
  enableDynamicSizing?: boolean;

  /**
   * Animated handle style for custom handle animations
   */
  animatedHandleStyle?: AnimatedStyleProp<ViewStyle>;
}

/**
 * ThemedBottomSheet - A bottom sheet component that strictly adheres to Fomio design tokens
 * 
 * Usage:
 * ```tsx
 * const sheetRef = useRef<BottomSheetModal>(null);
 * 
 * <ThemedBottomSheet
 *   ref={sheetRef}
 *   snapPoints={['50%', '90%']}
 *   index={0}
 * >
 *   <View className="p-4">
 *     <Text className="text-title text-fomio-foreground dark:text-fomio-foreground-dark">
 *       Content here
 *     </Text>
 *   </View>
 * </ThemedBottomSheet>
 * ```
 */
export const ThemedBottomSheet = React.forwardRef<BottomSheetModalRef, ThemedBottomSheetProps>(
  (
    {
      enableBackdrop = true,
      backdropOpacity = 0.5,
      backdropComponent,
      children,
      topInset,
      detached = false,
      enableOverDrag = false,
      activeOffsetY,
      failOffsetX,
      overDragResistanceFactor = 2,
      animatedHandleStyle,
      style,
      ...props
    },
    ref
  ) => {
    const { isDark, isAmoled } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Calculate top inset to account for header height
    // Header: 44px (iOS) or 48px (Android) + 8px (iOS) or 4px (Android) padding
    const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 48;
    const HEADER_PADDING = Platform.OS === 'ios' ? 8 : 4;
    const headerHeight = BASE_BAR_HEIGHT + HEADER_PADDING;
    
    // Use provided topInset or calculate from header + safe area
    const calculatedTopInset = topInset !== undefined 
      ? topInset 
      : insets.top + headerHeight;

    // Render backdrop with theme-aware styling, animated opacity, and tap-to-dismiss
    const renderBackdrop = useCallback(
      (backdropProps: BottomSheetBackdropProps) => {
        if (!enableBackdrop) {
          return null;
        }

        return (
          <BottomSheetBackdrop
            {...backdropProps}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={backdropOpacity}
            enableTouchThrough={false}
            // Backdrop color respects theme with proper opacity
            // Uses higher opacity for dark mode for better contrast
            style={[
              backdropProps.style,
              {
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
              },
            ]}
          />
        );
      },
      [enableBackdrop, backdropOpacity, isDark]
    );

    // Theme-aware background color
    // Note: @gorhom/bottom-sheet requires style object for backgroundStyle
    // This is the only exception where we use style prop, as required by the library
    const backgroundStyle = useMemo(
      () => ({
        backgroundColor: isAmoled
          ? '#000000' // bg-fomio-bg-dark - AMOLED true black
          : isDark
          ? '#050505' // bg-fomio-card-dark - subtle grey above black
          : '#FFFFFF', // bg-fomio-card - white
      }),
      [isDark, isAmoled]
    );

    // Enhanced handle indicator style with theme-aware colors and optional animated style
    const handleIndicatorStyle = useMemo(
      () => {
        const baseStyle: ViewStyle = {
          backgroundColor: isDark ? '#1C1C1E' : '#E3E3E6', // border-fomio-border-soft tokens
          width: 40,
          height: 4,
          borderRadius: 2,
        };
        
        // Merge with animated style if provided
        if (animatedHandleStyle) {
          return [baseStyle, animatedHandleStyle];
        }
        
        return baseStyle;
      },
      [isDark, animatedHandleStyle]
    );

    // Detached mode styling for Instagram-style floating sheets
    const detachedStyle = useMemo(
      () => {
        if (!detached) return undefined;
        
        return {
          marginHorizontal: 8,
          borderRadius: 24,
        };
      },
      [detached]
    );

    // Merge detached style with provided style
    const mergedStyle = useMemo(
      () => {
        if (detachedStyle && style) {
          return [detachedStyle, style];
        }
        return detachedStyle || style;
      },
      [detachedStyle, style]
    );

    // Gesture configuration with sensible defaults
    const gestureConfig = useMemo(
      () => ({
        enableOverDrag: enableOverDrag,
        activeOffsetY: activeOffsetY || [10, -10],
        failOffsetX: failOffsetX || [-5, 5],
        overDragResistanceFactor: overDragResistanceFactor,
      }),
      [enableOverDrag, activeOffsetY, failOffsetX, overDragResistanceFactor]
    );

    return (
      <BottomSheetModal
        ref={ref}
        {...props}
        {...gestureConfig}
        topInset={calculatedTopInset}
        backdropComponent={backdropComponent || renderBackdrop}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={handleIndicatorStyle}
        style={mergedStyle}
      >
        {children}
      </BottomSheetModal>
    );
  }
);

ThemedBottomSheet.displayName = 'ThemedBottomSheet';

// Re-export commonly used components and hooks
export {
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetView,
  useBottomSheetModal,
  useBottomSheet,
  useBottomSheetDynamicSnapPoints,
  useBottomSheetAnimatedPosition,
} from '@gorhom/bottom-sheet';

// Try to export BottomSheetFlashList if available (requires @shopify/flash-list)
// This will be undefined if flash-list is not installed, but won't break the build
let BottomSheetFlashList: any;
try {
  // Dynamic import to avoid breaking if flash-list is not installed
  BottomSheetFlashList = require('@gorhom/bottom-sheet').BottomSheetFlashList;
} catch {
  // FlashList not available, will be undefined
}

export { BottomSheetFlashList };

// Export the ref type
export type { BottomSheetModalRef };

