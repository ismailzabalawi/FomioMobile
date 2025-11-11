import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Theme as NavigationTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/shared/logger';

export type Theme = 'light' | 'dark' | 'amoled' | 'system';

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

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(storageKey);
        if (storedTheme && ['light', 'dark', 'amoled', 'system'].includes(storedTheme)) {
          setThemeState(storedTheme as Theme);
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
    if (theme === 'amoled' || theme === 'dark') {
      return 'dark';
    }
    return 'light';
  }, [theme, systemColorScheme]);

  const isDark = colorScheme === 'dark';
  const isAmoled = theme === 'amoled';

  // Create navigation theme object
  const navigationTheme = useMemo<NavigationTheme>(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        background: isAmoled ? '#000000' : baseTheme.colors.background,
        card: isAmoled ? '#000000' : baseTheme.colors.card,
      },
    };
  }, [isDark, isAmoled]);

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
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
    isAmoled,
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

