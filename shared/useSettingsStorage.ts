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
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle missing keys
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    logger.error('Failed to load settings from storage', error);
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.error('Failed to save settings to storage', error);
    throw error;
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
      .catch((error) => {
        logger.error('Failed to load settings in hook', error);
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
    } catch (error) {
      logger.error('Failed to update settings', error);
      throw error;
    }
  }, [settings]);

  return {
    settings,
    updateSettings,
    loading,
  };
}
