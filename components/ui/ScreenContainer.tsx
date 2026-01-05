// UI Spec: ScreenContainer
// - Safe area wrapper for all screens
// - Uses Fomio semantic tokens: bg-fomio-bg, bg-fomio-bg-dark (AMOLED #000)
// - Accepts className for customization
// - Zero-layer navigation compatible
// - variant='card' paints safe-area to match header (white/black seamless)

import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/components/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  className?: string;
  // 'bg' = page background, 'card' = surface/white (matches AppHeader)
  variant?: 'bg' | 'card';
}

export function ScreenContainer({ children, className, variant = 'bg' }: ScreenContainerProps) {
  const { navigationTheme, isDark } = useTheme();

  // Paint the safe-area background using navigation theme (AMOLED-safe).
  // This ensures the status bar area matches the header/screen background.
  const safeBg =
    variant === 'card'
      ? navigationTheme.colors.card // white in light, true black in dark
      : navigationTheme.colors.background; // page bg (true black in dark)

  // Use semantic tokens for the inner container so NativeWind themes flow through.
  const innerBgClass =
    variant === 'card'
      ? 'bg-fomio-card dark:bg-fomio-card-dark'
      : 'bg-fomio-bg dark:bg-fomio-bg-dark';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: safeBg }}>
      <View
        className={cn(
          'flex-1',
          innerBgClass,
          className
        )}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

