import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { onAuthEvent } from './auth-events';
import { discourseApi } from './discourseApi';

// Environment-aware storage import (matches pattern from discourseApi.ts)
let AsyncStorage: any;

// Check if we're in a Node.js environment
const isNode = typeof window === 'undefined';

if (isNode) {
  // Node.js environment - use mock storage
  AsyncStorage = {
    getItem: async (key: string) => null,
    setItem: async (key: string, value: string) => {},
    removeItem: async (key: string) => {},
  };
} else {
  // React Native environment - use real AsyncStorage
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (error) {
    // Fallback if AsyncStorage is not available
    AsyncStorage = {
      getItem: async (key: string) => null,
      setItem: async (key: string, value: string) => {},
      removeItem: async (key: string) => {},
    };
  }
}

export interface NotificationPreferences {
  version: number; // For future migration support (start at 1)
  
  // Category toggles
  replies: boolean;
  mentions: boolean;
  likes: boolean;
  privateMessages: boolean;
  badges: boolean;
  system: boolean;
  following: boolean;
  
  // Like frequency (maps to Discourse like_notification_frequency)
  likeFrequency: 'always' | 'daily' | 'weekly' | 'never';
  
  // Push settings (future - stored but not functional yet)
  pushEnabled: boolean;
  pushSound: boolean;
  pushAlert: boolean;
}

const STORAGE_KEY = 'fomio_notification_preferences';

const defaultPreferences: NotificationPreferences = {
  version: 1,
  replies: true,
  mentions: true,
  likes: true,
  privateMessages: true,
  badges: true,
  system: true,
  following: true,
  likeFrequency: 'always',
  pushEnabled: false,
  pushSound: false,
  pushAlert: false,
};

/**
 * Load notification preferences from Discourse API
 * Returns ONLY likeFrequency (Discourse does not provide push settings)
 */
async function loadPreferencesFromDiscourse(
  username: string
): Promise<{ likeFrequency: 'always' | 'daily' | 'weekly' | 'never' } | null> {
  try {
    const response = await discourseApi.getUserPreferences(username);
    if (response.success && response.data) {
      return response.data;
    }
    console.log('Failed to load Discourse preferences:', response.error);
    return null;
  } catch (error) {
    console.log('Error loading preferences from Discourse:', error);
    return null;
  }
}

/**
 * Sync notification preferences to Discourse API
 * Only syncs Discourse-supported settings (likeFrequency)
 */
async function syncPreferencesToDiscourse(
  preferences: NotificationPreferences,
  username: string
): Promise<boolean> {
  try {
    const response = await discourseApi.updateUserPreferences(username, {
      likeFrequency: preferences.likeFrequency,
    });
    if (response.success) {
      return true;
    }
    console.log('Failed to sync preferences to Discourse:', response.error);
    return false;
  } catch (error) {
    console.log('Error syncing preferences to Discourse:', error);
    return false;
  }
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  setPreference: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  isLoading: boolean;
  isSyncing: boolean;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Load preferences from AsyncStorage on mount, then sync from Discourse if authenticated
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Step 1: Load from AsyncStorage first (fast, instant UI)
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        let localPreferences: NotificationPreferences;
        
        if (stored) {
          const parsed = JSON.parse(stored) as NotificationPreferences;
          
          // Migration support: check version
          if (!parsed.version || parsed.version < 1) {
            // Migrate old preferences or reset to defaults
            // For now, merge with defaults to preserve any existing values
            localPreferences = { ...defaultPreferences, ...parsed, version: 1 };
          } else {
            localPreferences = parsed;
          }
        } else {
          // No stored preferences, use defaults
          localPreferences = defaultPreferences;
        }
        
        // Set local preferences immediately (optimistic)
        setPreferences(localPreferences);
        setIsLoading(false);

        // Step 2: If authenticated, load from Discourse and merge
        if (isAuthenticated && user?.username) {
          setIsSyncing(true);
          try {
            const remotePreferences = await loadPreferencesFromDiscourse(user.username);
            
            if (remotePreferences) {
              // Merge: Remote likeFrequency overrides local
              const merged = {
                ...localPreferences,
                likeFrequency: remotePreferences.likeFrequency,
              };
              
              // Save merged result to AsyncStorage
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              setPreferences(merged);
            }
          } catch (error) {
            console.error('Error syncing preferences from Discourse:', error);
            // Keep local preferences on error
          } finally {
            setIsSyncing(false);
          }
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
        setPreferences(defaultPreferences);
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [isAuthenticated, user?.username]);

  // Save preferences to AsyncStorage
  const savePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }, []);

  // Set a single preference and auto-save
  const setPreference = useCallback(
    async <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K]
    ) => {
      const newPreferences = { ...preferences, [key]: value };
      
      // Optimistic update: Save locally immediately
      setPreferences(newPreferences);
      await savePreferences(newPreferences);

      // If setting is likeFrequency and user is authenticated, sync to Discourse
      if (key === 'likeFrequency' && isAuthenticated && user?.username) {
        setIsSyncing(true);
        try {
          const syncSuccess = await syncPreferencesToDiscourse(newPreferences, user.username);
          if (!syncSuccess) {
            // Log error but don't revert local change (optimistic update stays)
            console.log('Failed to sync likeFrequency to Discourse, keeping local change');
          }
        } catch (error) {
          console.error('Error syncing preference to Discourse:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [preferences, savePreferences, isAuthenticated, user?.username]
  );

  // Reset to default preferences
  const resetToDefaults = useCallback(async () => {
    setPreferences(defaultPreferences);
    await savePreferences(defaultPreferences);
  }, [savePreferences]);

  // Listen to auth events to re-sync preferences on sign-in/refresh
  useEffect(() => {
    const unsubscribe = onAuthEvent((event) => {
      if ((event === 'auth:signed-in' || event === 'auth:refreshed') && user?.username) {
        // Re-sync preferences from Discourse on sign-in
        const syncFromDiscourse = async () => {
          setIsSyncing(true);
          try {
            const remotePreferences = await loadPreferencesFromDiscourse(user.username);
            
            if (remotePreferences) {
              // Merge: Remote likeFrequency overrides local
              const merged = {
                ...preferences,
                likeFrequency: remotePreferences.likeFrequency,
              };
              
              // Save merged result to AsyncStorage
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              setPreferences(merged);
            }
          } catch (error) {
            console.error('Error syncing preferences from Discourse on auth event:', error);
          } finally {
            setIsSyncing(false);
          }
        };

        syncFromDiscourse();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.username, preferences]);

  return {
    preferences,
    setPreference,
    resetToDefaults,
    isLoading,
    isSyncing,
  };
}

