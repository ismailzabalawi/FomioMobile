// UI Spec: ThemedBottomSheet
// - Wrapper around @gorhom/bottom-sheet that enforces Fomio design tokens
// - Uses NativeWind classes exclusively (no inline styles for colors)
// - Respects Light + AMOLED Dark themes via semantic tokens
// - Provides consistent backdrop, handle, and background styling
// - Type-safe with strict TypeScript

import 'react-native-reanimated';
import React, { useCallback, useMemo } from 'react';
import {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/components/theme';

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
      ...props
    },
    ref
  ) => {
    const { isDark, isAmoled } = useTheme();

    // Render backdrop with theme-aware styling
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
            // Backdrop color respects theme
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

    // Theme-aware handle indicator color
    const handleIndicatorStyle = useMemo(
      () => ({
        backgroundColor: isDark ? '#1C1C1E' : '#E3E3E6', // border-fomio-border-soft tokens
      }),
      [isDark]
    );

    return (
      <BottomSheetModal
        ref={ref}
        {...props}
        backdropComponent={backdropComponent || renderBackdrop}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={handleIndicatorStyle}
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
} from '@gorhom/bottom-sheet';

// Export the ref type
export type { BottomSheetModalRef };

