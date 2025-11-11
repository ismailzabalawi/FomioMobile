import { useMemo } from 'react';
import { useTheme } from '@/components/theme';
import { getThemeColors, createThemedStyles, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from './theme-constants';

/**
 * Custom hook for consistent theming across components
 * Provides theme colors, common styles, and utility functions
 */
export const useThemedStyles = () => {
  const { isDark } = useTheme();
  
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);
  const commonStyles = useMemo(() => createThemedStyles(isDark), [isDark]);
  
  return {
    colors,
    commonStyles,
    spacing: SPACING,
    typography: TYPOGRAPHY,
    borderRadius: BORDER_RADIUS,
    shadows: SHADOWS,
    isDark,
  };
};

/**
 * Hook for component-specific themed styles
 * Reduces boilerplate in component styling
 */
export const useComponentStyles = () => {
  const { colors, spacing, typography, borderRadius, shadows, isDark } = useThemedStyles();
  
  return {
    // Button styles
    button: {
      base: {
        borderRadius: borderRadius.md,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        flexDirection: 'row' as const,
      },
      primary: {
        backgroundColor: colors.accent,
      },
      secondary: {
        backgroundColor: colors.secondary,
      },
      outline: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'transparent',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    },
    
    // Input styles
    input: {
      base: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.fontSize.base,
        color: colors.foreground,
        backgroundColor: colors.background,
      },
      focused: {
        borderColor: colors.ring,
      },
      error: {
        borderColor: colors.destructive,
      },
    },
    
    // Card styles
    card: {
      base: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
      },
      elevated: {
        ...shadows.md,
      },
    },
    
    // Text styles
    text: {
      primary: {
        color: colors.foreground,
        fontSize: typography.fontSize.base,
      },
      secondary: {
        color: colors.secondary,
        fontSize: typography.fontSize.sm,
      },
      muted: {
        color: colors.mutedForeground,
        fontSize: typography.fontSize.sm,
      },
      heading: {
        color: colors.foreground,
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.semibold,
      },
    },
  };
};
