// UI Spec: BottomSheetContent
// - Consistent padding and spacing for bottom sheet content
// - Uses Fomio spacing tokens (fomio-xs, fomio-sm, fomio-md, fomio-lg, fomio-xl)
// - Theme-aware background and text colors via NativeWind

import React from 'react';
import { View, ViewProps, Text } from 'react-native';
import { cn } from '@/lib/utils/cn';

interface BottomSheetContentProps extends ViewProps {
  /**
   * Padding variant (default: 'md')
   */
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Show header separator (default: false)
   */
  showHeader?: boolean;
  
  /**
   * Header title
   */
  title?: string;
}

/**
 * BottomSheetContent - Consistent content wrapper for bottom sheets
 * 
 * Usage:
 * ```tsx
 * <BottomSheetContent padding="lg" showHeader title="Settings">
 *   <Text>Content here</Text>
 * </BottomSheetContent>
 * ```
 */
export function BottomSheetContent({
  children,
  className,
  padding = 'md',
  showHeader = false,
  title,
  ...props
}: BottomSheetContentProps) {
  const paddingMap = {
    xs: 'p-fomio-xs',
    sm: 'p-fomio-sm',
    md: 'p-fomio-md',
    lg: 'p-fomio-lg',
    xl: 'p-fomio-xl',
  };

  return (
    <View
      className={cn(
        paddingMap[padding],
        'bg-fomio-bg dark:bg-fomio-bg-dark',
        className
      )}
      {...props}
    >
      {showHeader && title && (
        <View className="mb-4 pb-4 border-b border-fomio-border-soft dark:border-fomio-border-soft-dark">
          <Text className="text-title font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
            {title}
          </Text>
        </View>
      )}
      {children}
    </View>
  );
}

