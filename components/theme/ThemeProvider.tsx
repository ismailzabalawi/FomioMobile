import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Theme as NavigationTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { logger } from '@/shared/logger';

export type ThemeMode = 'system' | 'light' | 'dark';

// Legacy type for backward compatibility
export type Theme = ThemeMode;

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
};

type ThemeProviderState = {
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
  isAmoled: boolean; // Always equals isDark - dark mode is always AMOLED
  colorScheme: 'light' | 'dark';
  navigationTheme: NavigationTheme;
  // Legacy compatibility
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
};

const initialState: ThemeProviderState = {
  themeMode: 'system',
  setThemeMode: async () => {},
  toggleTheme: async () => {},
  isDark: false,
  isAmoled: false,
  setAmoled: async () => {},
  colorScheme: 'light',
  navigationTheme: DefaultTheme,
  theme: 'system',
  setTheme: async () => {},
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'fomio-theme',
}: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(defaultTheme);
  const systemColorScheme = useRNColorScheme();
  const { setColorScheme: setNativeWindColorScheme } = useNativeWindColorScheme();

  // Load theme from storage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(storageKey);
        if (storedTheme) {
          // Handle migration from old 'amoled' values to 'dark'
          if (storedTheme === 'amoled') {
            setThemeModeState('dark');
            await AsyncStorage.setItem(storageKey, 'dark');
          } else if (['light', 'dark', 'system'].includes(storedTheme)) {
            setThemeModeState(storedTheme as ThemeMode);
          }
        }
        // Clean up old AMOLED preference - no longer needed
        await AsyncStorage.removeItem('fomio-amoled');
      } catch (error) {
        logger.error('Failed to load theme preferences from storage', error);
      }
    };

    loadPreferences();
  }, [storageKey]);

  // Compute resolved color scheme
  const colorScheme = useMemo<'light' | 'dark'>(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode === 'dark' ? 'dark' : 'light';
  }, [themeMode, systemColorScheme]);

  const isDark = colorScheme === 'dark';
  // Dark mode is always AMOLED
  const isAmoled = isDark;

  // SYNC: ThemeProvider → NativeWind
  // This ensures `dark:` classes follow our theme choice, not just system preference
  useEffect(() => {
    setNativeWindColorScheme(colorScheme);
  }, [colorScheme, setNativeWindColorScheme]);

  // Create navigation theme object
  // Dark mode always uses true black (#000000)
  const navigationTheme = useMemo<NavigationTheme>(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        background: isDark ? '#000000' : baseTheme.colors.background,
        card: isDark ? '#000000' : baseTheme.colors.card,
      },
    };
  }, [isDark]);

  const setThemeMode = async (newThemeMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(storageKey, newThemeMode);
      setThemeModeState(newThemeMode);
      // NativeWind color scheme will be updated via useEffect when colorScheme changes
    } catch (error: any) {
      // Handle storage directory errors gracefully (Expo development issue)
      if (error?.message?.includes('directory') || error?.code === 512 || error?.message?.includes('@anonymous')) {
        logger.warn('ThemeProvider: Storage directory issue, theme set in memory only');
        setThemeModeState(newThemeMode);
        return;
      }
      logger.error('Failed to save theme to storage', error);
      setThemeModeState(newThemeMode);
    }
  };

  const toggleTheme = async () => {
    const newThemeMode = isDark ? 'light' : 'dark';
    await setThemeMode(newThemeMode);
  };

  // Legacy compatibility: map themeMode to theme
  const theme = themeMode;
  const setTheme = setThemeMode;

  const value: ThemeProviderState = {
    themeMode,
    setThemeMode,
    toggleTheme,
    isDark,
    isAmoled, // Always equals isDark
    setAmoled: async () => {}, // No-op for backward compatibility
    colorScheme,
    navigationTheme,
    // Legacy compatibility
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

