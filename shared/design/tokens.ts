import { Platform } from 'react-native';

type ThemeMode = 'light' | 'dark';

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
  },
};

export function getTokens(mode: ThemeMode) {
  const c = palette[mode];
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
  };
}

export type Tokens = ReturnType<typeof getTokens>;
