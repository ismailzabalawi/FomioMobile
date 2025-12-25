import { useMemo } from 'react';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import { getThemeColors } from '@/shared/theme-constants';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/shared/theme-constants';
import { typography } from '@/shared/design-system';

/**
 * useByteCardTokens - Combines all design token sources for ByteCard
 * 
 * Provides:
 * - Fluid design tokens (frosted surfaces, shadows, motion, radii)
 * - Theme colors (semantic colors)
 * - Spacing, border radius, shadows, typography tokens
 */
export function useByteCardTokens() {
  const { themeMode, isAmoled } = useTheme();
  
  const tokens = useMemo(() => {
    const mode = isAmoled ? 'darkAmoled' : (themeMode === 'dark' ? 'dark' : 'light');
    return getTokens(mode);
  }, [themeMode, isAmoled]);
  
  const colors = useMemo(() => getThemeColors(themeMode, isAmoled), [themeMode, isAmoled]);
  
  return {
    tokens, // Fluid design tokens
    colors, // Theme colors
    spacing: SPACING,
    borderRadius: BORDER_RADIUS,
    shadows: SHADOWS,
    typography: typography.styles,
  };
}

