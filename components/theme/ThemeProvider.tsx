import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Theme as NavigationTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { logger } from '@/shared/logger';

export type Theme = 'light' | 'dark' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
  /** @deprecated Dark mode is always AMOLED. Use `isDark` instead. */
  isAmoled: boolean;
  colorScheme: 'light' | 'dark';
  navigationTheme: NavigationTheme;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: async () => {},
  toggleTheme: async () => {},
  isDark: false,
  isAmoled: false,
  colorScheme: 'light',
  navigationTheme: DefaultTheme,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'fomio-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const systemColorScheme = useRNColorScheme();
  const { setColorScheme: setNativeWindColorScheme } = useNativeWindColorScheme();

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(storageKey);
        if (storedTheme) {
          // Handle migration from old 'amoled' values to 'dark'
          if (storedTheme === 'amoled') {
            setThemeState('dark');
            await AsyncStorage.setItem(storageKey, 'dark');
          } else if (['light', 'dark', 'system'].includes(storedTheme)) {
            setThemeState(storedTheme as Theme);
          }
        }
      } catch (error) {
        logger.error('Failed to load theme from storage', error);
      }
    };

    loadTheme();
  }, [storageKey]);

  // Compute resolved color scheme
  const colorScheme = useMemo<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  }, [theme, systemColorScheme]);

  const isDark = colorScheme === 'dark';

  // SYNC: ThemeProvider → NativeWind
  // This ensures `dark:` classes follow our theme choice, not just system preference
  useEffect(() => {
    setNativeWindColorScheme(colorScheme);
  }, [colorScheme, setNativeWindColorScheme]);

  // Create navigation theme object
  // Dark mode IS AMOLED (true black)
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

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
      // NativeWind color scheme will be updated via useEffect when colorScheme changes
    } catch (error: any) {
      // Handle storage directory errors gracefully (Expo development issue)
      if (error?.message?.includes('directory') || error?.code === 512 || error?.message?.includes('@anonymous')) {
        logger.warn('ThemeProvider: Storage directory issue, theme set in memory only');
        setThemeState(newTheme);
        return;
      }
      logger.error('Failed to save theme to storage', error);
      setThemeState(newTheme);
    }
  };

  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    await setTheme(newTheme);
  };

  const value: ThemeProviderState = {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    isAmoled: isDark, // Dark mode is always AMOLED (true black)
    colorScheme,
    navigationTheme,
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

