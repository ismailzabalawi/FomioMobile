/**
 * FomioMobile Design System
 * Comprehensive design tokens for visual consistency and professional polish
 */

import { TextStyle, ViewStyle } from 'react-native';

// =============================================================================
// TYPOGRAPHY SYSTEM
// =============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // Font Sizes
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

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Typography Styles
  styles: {
    display: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    } as TextStyle,
    
    headline: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    } as TextStyle,
    
    title: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    } as TextStyle,
    
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    } as TextStyle,
    
    bodyMedium: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
    } as TextStyle,
    
    caption: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    } as TextStyle,
    
    label: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
    } as TextStyle,
  },
};

// =============================================================================
// SPACING SYSTEM
// =============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

// =============================================================================
// COLOR SYSTEM
// =============================================================================

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#E0F2F1',
    100: '#B2DFDB',
    200: '#80CBC4',
    300: '#4DB6AC',
    400: '#26A69A',
    500: '#009688',
    600: '#00897B',
    700: '#00796B',
    800: '#00695C',
    900: '#004D40',
  },

  // Accent Colors
  accent: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral Colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// =============================================================================
// THEME TOKENS
// =============================================================================

export const lightTheme = {
  background: colors.gray[50],
  surface: '#ffffff',
  surfaceVariant: colors.gray[100],
  primary: colors.primary[500],
  primaryVariant: colors.primary[700],
  secondary: colors.accent[800],
  accent: colors.accent[600],
  
  // Text Colors
  text: colors.gray[900],
  textSecondary: colors.gray[600],
  textTertiary: colors.gray[500],
  textInverse: '#ffffff',
  
  // Border Colors
  border: colors.gray[200],
  borderFocus: colors.primary[400],
  
  // State Colors
  success: colors.success[600],
  warning: colors.warning[500],
  error: colors.error[500],
  
  // Interactive Colors
  interactive: colors.primary[500],
  interactiveHover: colors.primary[600],
  interactivePressed: colors.primary[700],
};

export const darkTheme = {
  background: colors.gray[900],
  surface: colors.gray[800],
  surfaceVariant: colors.gray[700],
  primary: colors.primary[400],
  primaryVariant: colors.primary[300],
  secondary: colors.accent[300],
  accent: colors.accent[200],
  
  // Text Colors
  text: colors.gray[50],
  textSecondary: colors.gray[300],
  textTertiary: colors.gray[400],
  textInverse: colors.gray[900],
  
  // Border Colors
  border: colors.gray[600],
  borderFocus: colors.primary[300],
  
  // State Colors
  success: colors.success[400],
  warning: colors.warning[400],
  error: colors.error[400],
  
  // Interactive Colors
  interactive: colors.primary[400],
  interactiveHover: colors.primary[300],
  interactivePressed: colors.primary[200],
};

// =============================================================================
// ELEVATION & SHADOWS
// =============================================================================

export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// =============================================================================
// ANIMATION TIMING
// =============================================================================

export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },
  
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
};

// =============================================================================
// COMPONENT TOKENS
// =============================================================================

export const components = {
  button: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    padding: {
      sm: { horizontal: 12, vertical: 8 },
      md: { horizontal: 16, vertical: 12 },
      lg: { horizontal: 24, vertical: 16 },
    },
    borderRadius: borderRadius.md,
  },
  
  input: {
    height: 44,
    padding: { horizontal: 12, vertical: 8 },
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    elevation: elevation.sm,
  },
  
  avatar: {
    size: {
      xs: 24,
      sm: 32,
      md: 40,
      lg: 56,
      xl: 80,
    },
  },
  
  touchTarget: {
    minSize: 44, // WCAG AA minimum touch target
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export const getThemeColors = (isDark: boolean) => isDark ? darkTheme : lightTheme;

export const createTextStyle = (
  variant: keyof typeof typography.styles,
  color?: string,
  additionalStyles?: TextStyle
): TextStyle => ({
  ...typography.styles[variant],
  ...(color && { color }),
  ...additionalStyles,
});

export const createShadowStyle = (
  level: keyof typeof elevation,
  isDark: boolean = false
): ViewStyle => ({
  ...elevation[level],
  ...(isDark && {
    shadowColor: '#000000',
    shadowOpacity: elevation[level].shadowOpacity * 1.5,
  }),
});

// =============================================================================
// ACCESSIBILITY HELPERS
// =============================================================================

export const accessibility = {
  minTouchTarget: 44,
  
  // WCAG AA contrast ratios
  contrast: {
    normal: 4.5,
    large: 3,
  },
  
  // Screen reader labels
  labels: {
    like: 'Like this post',
    unlike: 'Unlike this post',
    comment: 'Comment on this post',
    bookmark: 'Bookmark this post',
    share: 'Share this post',
    profile: 'View profile',
    settings: 'Open settings',
    back: 'Go back',
    close: 'Close',
    menu: 'Open menu',
  },
};
