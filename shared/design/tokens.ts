import { Platform } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'darkAmoled';
type PlatformKey = 'ios' | 'android';

type SurfaceBg = Record<PlatformKey, string>;

interface PaletteEntry {
  background: string;
  surfaceFrost: string;
  surfaceMuted: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  shadow: string;
  badgeBg: string;
  badgeText: string;
  surfaceBgLight?: SurfaceBg;
  surfaceBgDark?: SurfaceBg;
  surfaceBgAmoled?: SurfaceBg;
}

export const palette = {
  light: {
    background: '#FFFFFF',
    surfaceFrost: 'rgba(255,255,255,0.72)',
    surfaceMuted: 'rgba(255,255,255,0.55)',
    text: '#0F172A',
    muted: '#64748B',
    border: 'rgba(15, 23, 42, 0.08)',
    accent: '#4F9CF9',
    accentSoft: 'rgba(79,156,249,0.14)',
    onAccent: '#FFFFFF',
    danger: '#DC2626',
    dangerSoft: 'rgba(220,38,38,0.12)',
    shadow: 'rgba(0,0,0,0.14)',
    badgeBg: '#EF4444',
    badgeText: '#FFFFFF',
    surfaceBgLight: {
      ios: 'rgba(255,255,255,0.68)',
      android: 'rgba(0,0,0,0.38)',
    },
  },
  dark: {
    background: '#000000',
    surfaceFrost: 'rgba(17,24,39,0.4)',
    surfaceMuted: 'rgba(17,24,39,0.3)',
    text: '#E5E7EB',
    muted: '#9CA3AF',
    border: 'rgba(255,255,255,0.08)',
    accent: '#7CC4FF',
    accentSoft: 'rgba(124,196,255,0.18)',
    onAccent: '#000000',
    danger: '#EF4444',
    dangerSoft: 'rgba(239,68,68,0.16)',
    shadow: 'rgba(0,0,0,0.5)',
    badgeBg: '#F87171',
    badgeText: '#18181B',
    surfaceBgDark: {
      ios: 'rgba(17,24,39,0.48)',
      android: 'rgba(255,255,255,0.26)',
    },
  },
  darkAmoled: {
    background: '#000000',
    surfaceFrost: 'rgba(0,0,0,0.72)',
    surfaceMuted: 'rgba(0,0,0,0.6)',
    text: '#E5E7EB',
    muted: '#9CA3AF',
    border: 'rgba(255,255,255,0.08)',
    accent: '#7CC4FF',
    accentSoft: 'rgba(124,196,255,0.18)',
    onAccent: '#000000',
    danger: '#EF4444',
    dangerSoft: 'rgba(239,68,68,0.16)',
    shadow: 'rgba(96, 165, 250, 0.28)', // Stronger blue glow for AMOLED
    badgeBg: '#F87171',
    badgeText: '#18181B',
    surfaceBgAmoled: {
      ios: 'rgba(255,255,255,0.15)',
      android: 'rgba(255,255,255,0.22)',
    },
  },
} satisfies Record<ThemeMode, PaletteEntry>;

export function getTokens(mode: ThemeMode) {
  const c = palette[mode] ?? palette.light;
  const isAmoled = mode === 'darkAmoled';
  const isDark = mode === 'dark' || isAmoled;

  // Platform-specific blur intensities (needed for tab bar blur)
  const blurIntensity = {
    ios: {
      light: 68,
      dark: 56,
      amoled: 60, // Even stronger blur on AMOLED for clearer separation
    },
    android: {
      light: 105,
      dark: 96,
      amoled: 100, // Even stronger blur on AMOLED for clearer separation
    },
  };

  const platform: PlatformKey = Platform.OS === 'ios' ? 'ios' : 'android';
  const themeKey = isAmoled ? 'amoled' : isDark ? 'dark' : 'light';

  // Surface background per theme/platform (safe fallback to light values)
  const surfaceBg = isAmoled
    ? c.surfaceBgAmoled?.[platform] ?? palette.darkAmoled.surfaceBgAmoled[platform]
    : isDark
    ? c.surfaceBgDark?.[platform] ?? palette.dark.surfaceBgDark[platform]
    : c.surfaceBgLight?.[platform] ?? palette.light.surfaceBgLight[platform];

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
    },
    motion: {
      liquidSpring: { damping: 16, stiffness: 220 },
      snapSpring: { damping: 14, stiffness: 260 },
      durations: { short: 160, medium: 240 },
      stagger: 40,
    },
    // Surface background for blur effects
    surfaceBg,
  };
}

export type Tokens = ReturnType<typeof getTokens>;
