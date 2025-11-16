/**
 * Centralized theme constants for consistent styling across the app
 * Provides color palettes, spacing, typography, and component tokens
 */

export const COLORS = {
  light: {
    // Primary colors
    background: '#FFFFFF', // Pure white
    foreground: '#17131B',
    card: '#FFFFFF', // Pure white
    cardForeground: '#17131B',
    
    // Secondary colors
    secondary: '#5C5D67',
    secondaryForeground: '#ffffff',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    
    // Accent colors
    accent: '#3b82f6',
    accentForeground: '#ffffff',
    
    // Destructive colors
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    
    // Border and input colors
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#3b82f6',
    
    // Status colors
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',
    
    // Social colors
    like: '#ef4444',
    bookmark: '#f59e0b',
    comment: '#64748b',
  },
  dark: {
    // Primary colors
    background: '#000000', // AMOLED true black
    foreground: '#f4f4f5',
    card: '#000000', // AMOLED true black
    cardForeground: '#f4f4f5',
    
    // Secondary colors
    secondary: '#a1a1aa',
    secondaryForeground: '#18181b',
    muted: '#27272a',
    mutedForeground: '#a1a1aa',
    
    // Accent colors
    accent: '#60a5fa',
    accentForeground: '#18181b',
    
    // Destructive colors
    destructive: '#f87171',
    destructiveForeground: '#18181b',
    
    // Border and input colors
    border: '#3f3f46',
    input: '#3f3f46',
    ring: '#60a5fa',
    
    // Status colors
    success: '#4ade80',
    warning: '#fbbf24',
    info: '#60a5fa',
    
    // Social colors
    like: '#f87171',
    bookmark: '#fbbf24',
    comment: '#a1a1aa',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const TYPOGRAPHY = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
} as const;

export const COMPONENT_TOKENS = {
  button: {
    height: {
      sm: 32,
      default: 40,
      lg: 48,
    },
    padding: {
      sm: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
      default: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
      lg: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    },
  },
  input: {
    height: 40,
    padding: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    borderRadius: BORDER_RADIUS.md,
  },
  card: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadow: SHADOWS.sm,
  },
} as const;

/**
 * Get theme colors based on current theme mode
 */
export const getThemeColors = (isDark: boolean) => {
  return isDark ? COLORS.dark : COLORS.light;
};

/**
 * Common style utilities
 */
export const createThemedStyles = (isDark: boolean) => {
  const colors = getThemeColors(isDark);
  
  return {
    container: {
      backgroundColor: colors.background,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      ...SHADOWS.sm,
    },
    text: {
      color: colors.foreground,
      fontSize: TYPOGRAPHY.fontSize.base,
      lineHeight: TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal,
    },
    secondaryText: {
      color: colors.secondary,
      fontSize: TYPOGRAPHY.fontSize.sm,
      lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
    },
    border: {
      borderColor: colors.border,
      borderWidth: 1,
    },
  };
};

