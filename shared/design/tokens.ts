import { Platform } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'darkAmoled';

export const palette = {
  light: {
    surfaceFrost: 'rgba(255,255,255,0.72)',
    surfaceMuted: 'rgba(255,255,255,0.55)',
    text: '#0F172A',
    muted: '#64748B',
    border: 'rgba(15, 23, 42, 0.08)',
    accent: '#4F9CF9',
    accentSoft: 'rgba(79,156,249,0.14)',
    shadow: 'rgba(0,0,0,0.14)',
    // Badge colors
    badgeBg: '#EF4444',
    badgeText: '#FFFFFF',
    // Surface backgrounds for blur effects (platform-specific)
    surfaceBgLight: {
      ios: 'rgba(255,255,255,0.68)',
      android: 'rgba(0,0,0,0.38)',
    },
  },
  dark: {
    surfaceFrost: 'rgba(17,24,39,0.4)',
    surfaceMuted: 'rgba(17,24,39,0.3)',
    text: '#E5E7EB',
    muted: '#9CA3AF',
    border: 'rgba(255,255,255,0.08)',
    accent: '#7CC4FF',
    accentSoft: 'rgba(124,196,255,0.18)',
    shadow: 'rgba(0,0,0,0.5)',
    // Badge colors
    badgeBg: '#F87171',
    badgeText: '#18181B',
    // Surface backgrounds for blur effects (platform-specific)
    surfaceBgDark: {
      ios: 'rgba(17,24,39,0.48)',
      android: 'rgba(255,255,255,0.26)',
    },
  },
  darkAmoled: {
    surfaceFrost: 'rgba(0,0,0,0.6)',
    surfaceMuted: 'rgba(0,0,0,0.5)',
    text: '#F4F4F5',
    muted: '#A1A1AA',
    border: 'rgba(255,255,255,0.08)',
    accent: '#26A69A',
    accentSoft: 'rgba(38,166,154,0.18)',
    shadow: 'rgba(96, 165, 250, 0.1)', // Subtle blue glow for AMOLED
    // Badge colors
    badgeBg: '#F87171',
    badgeText: '#18181B',
    // Surface backgrounds for blur effects (platform-specific)
    surfaceBgAmoled: {
      ios: 'rgba(255,255,255,0.15)',
      android: 'rgba(255,255,255,0.22)',
    },
  },
};

export function getTokens(mode: ThemeMode) {
  const c = palette[mode];
  const isAmoled = mode === 'darkAmoled';
  const isDark = mode === 'dark' || isAmoled;
  
  // Platform-specific blur intensities
  // Android needs higher intensity due to weaker blur effect
  const blurIntensity = {
    ios: {
      light: 68,
      dark: 56,
      amoled: 46,
    },
    android: {
      light: 105,
      dark: 96,
      amoled: 80,
    },
  };
  
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const themeKey = isAmoled ? 'amoled' : isDark ? 'dark' : 'light';
  
  return {
    colors: c,
    radii: {
      sm: 8,
      md: 12,
      lg: 16,
      pill: 999,
    },
    blur: {
      frost: Platform.OS === 'ios' ? 28 : 18,
      // Platform and theme-specific blur intensities for tab bar
      tabBar: blurIntensity[platform][themeKey],
    },
    shadows: {
      soft: {
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 22,
        elevation: 10,
      },
      // Tab bar main bar shadow
      tabBarMain: {
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
      },
      // Tab bar drop buttons shadow (compose, scroll-to-top)
      tabBarDrop: {
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      },
    },
    motion: {
      liquidSpring: { damping: 16, stiffness: 220 },
      snapSpring: { damping: 14, stiffness: 260 },
      durations: { short: 160, medium: 240 },
      stagger: 40,
    },
    // Surface background for blur effects
    surfaceBg: isAmoled 
      ? c.surfaceBgAmoled[platform]
      : isDark 
      ? c.surfaceBgDark[platform]
      : c.surfaceBgLight[platform],
  };
}

export type Tokens = ReturnType<typeof getTokens>;
