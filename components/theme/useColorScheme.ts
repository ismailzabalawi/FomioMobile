import { useColorScheme as useRNColorScheme, ColorSchemeName } from 'react-native';
import { useTheme } from './ThemeProvider';

/**
 * Hook to get the current color scheme
 * Uses the theme provider's resolved color scheme when available,
 * otherwise falls back to React Native's system color scheme
 */
export function useColorScheme(): ColorSchemeName {
  try {
    const { colorScheme } = useTheme();
    return colorScheme;
  } catch {
    // If ThemeProvider is not available, fall back to system color scheme
    return useRNColorScheme();
  }
}

