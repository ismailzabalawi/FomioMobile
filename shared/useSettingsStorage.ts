import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

const STORAGE_KEY = 'fomio-settings';

export interface UserSettings {
  showNSFW: boolean;
  offlineMode: boolean;
  autoSave: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  showNSFW: false,
  offlineMode: false,
  autoSave: true,
};

/**
 * Load settings from AsyncStorage
 */
async function loadSettings(): Promise<UserSettings> {
  try {
    let stored: string | null = null;
    try {
      stored = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (storageError: any) {
      // Handle AsyncStorage errors gracefully (e.g., file system corruption in simulator)
      console.warn('useSettingsStorage: AsyncStorage error, using default settings:', storageError?.message || storageError);
      // Return defaults on storage error
      return DEFAULT_SETTINGS;
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle missing keys
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (parseError) {
        // Invalid JSON, use defaults
        console.warn('useSettingsStorage: Invalid stored settings JSON, using defaults:', parseError);
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  } catch (error: any) {
    // Final fallback - only log if there's an actual error message
    if (error && error?.message) {
      console.warn('useSettingsStorage: Error loading settings:', error.message);
    }
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to AsyncStorage
 */
async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  try {
    const current = await loadSettings();
    const updated = { ...current, ...settings };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (storageError: any) {
      // Handle AsyncStorage errors gracefully (e.g., file system corruption)
      console.warn('useSettingsStorage: Failed to save settings to storage:', storageError?.message || storageError);
      // Settings are still in memory, so app continues to function
      // Don't throw - allow app to continue with in-memory settings
    }
  } catch (error: any) {
    // Only log if there's an actual error message (not null/undefined)
    if (error && error?.message) {
      console.warn('useSettingsStorage: Error saving settings:', error.message);
    }
    // Don't throw - allow app to continue
  }
}

/**
 * Hook to manage user settings with persistence
 */
export function useSettingsStorage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    let mounted = true;
    
    loadSettings()
      .then((loaded) => {
        if (mounted) {
          setSettings(loaded);
          setLoading(false);
        }
      })
      .catch((error: any) => {
        // Handle errors gracefully - only log if there's an actual error message
        if (error && error?.message) {
          console.warn('useSettingsStorage: Error loading settings in hook:', error.message);
        }
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Update settings (partial updates supported)
   */
  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      await saveSettings(updates);
      setSettings(newSettings);
    } catch (error: any) {
      // Only log if there's an actual error message
      if (error && error?.message) {
        console.warn('useSettingsStorage: Failed to update settings:', error.message);
      }
      // Don't throw - settings are updated in memory
    }
  }, [settings]);

  return {
    settings,
    updateSettings,
    loading,
  };
}
