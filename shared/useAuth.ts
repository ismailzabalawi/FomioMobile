import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { create } from 'zustand';
import Constants from 'expo-constants';
import { discourseApi, AppUser } from './discourseApi';
import { logger } from './logger';
import { emitAuthEvent, onAuthEvent } from './auth-events';
import { UserApiKeyManager } from './userApiKeyManager';
import { UserApiKeyAuth } from './userApiKeyAuth';
import { isAuthenticated as checkAuth, signOut as authSignOut } from '../lib/auth';

const config = Constants.expoConfig?.extra || {};

const AUTH_STORAGE_KEY = 'auth-token-v1';

export interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Global auth store using Zustand
interface AuthStore extends AuthState {
  setUser: (user: AppUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  reset: () => void;
  loadStoredAuth: () => Promise<void>;
}

// Global flag to prevent multiple concurrent loads
let isLoadingAuth = false;
let hasLoadedAuth = false;

const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  reset: () => set({ user: null, isLoading: false, isAuthenticated: false }),
  loadStoredAuth: async () => {
    // Prevent concurrent calls
    if (isLoadingAuth) {
      return;
    }

    try {
      isLoadingAuth = true;
      console.log('📱 Loading stored authentication...');
      set({ isLoading: true });
      
      // Check for User API Key using new auth system
      let hasValidAuth = false;
      const hasApiKey = await checkAuth();
      if (hasApiKey) {
        // Verify API key is still valid by making a test request
        const userResponse = await discourseApi.getCurrentUser();
        hasValidAuth = userResponse.success && !!userResponse.data;
      }
      
      if (hasValidAuth) {
        // Try to load user data from storage first
        try {
          const storedData = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
          
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            const validatedUser = validateStoredAuth(parsedData);
            
            if (validatedUser) {
              console.log('✅ Valid authorization and stored user found');
              set({ 
                user: validatedUser, 
                isAuthenticated: true, 
                isLoading: false 
              });
              isLoadingAuth = false;
              hasLoadedAuth = true;
              return;
            }
          }
        } catch (storageError: any) {
          console.warn('Failed to read stored auth:', storageError?.message || storageError);
        }
        
        // If no stored user data, fetch from API
        const userResponse = await discourseApi.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          const appUser = mapDiscourseUserToAppUser(userResponse.data);
          try {
            await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(appUser));
          } catch (storageError: any) {
            console.warn('SecureStore error, auth not persisted:', storageError?.message || storageError);
          }
          
          set({ 
            user: appUser, 
            isAuthenticated: true, 
            isLoading: false 
          });
          isLoadingAuth = false;
          hasLoadedAuth = true;
          return;
        }
      }
      
      // Clear invalid auth data
      try {
        await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
      } catch (storageError: any) {
        console.warn('Failed to clear auth storage:', storageError?.message || storageError);
      }
      
      try {
        await UserApiKeyManager.clearApiKey();
      } catch (apiKeyError: any) {
        console.warn('Failed to clear API key:', apiKeyError?.message || apiKeyError);
      }
      
      console.log('📱 No valid authorization found');
      set({ user: null, isLoading: false, isAuthenticated: false });
      isLoadingAuth = false;
      hasLoadedAuth = true;
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      logger.error('Failed to load stored authentication', error);
      set({ user: null, isLoading: false, isAuthenticated: false });
      isLoadingAuth = false;
      hasLoadedAuth = true;
    }
  },
}));

// Validate stored authentication data
const validateStoredAuth = (data: any): AppUser | null => {
  try {
    if (data && typeof data === 'object' && data.id && data.username) {
      return data as AppUser;
    }
    return null;
  } catch (error) {
    console.error('Auth validation error:', error);
    return null;
  }
};

// Helper function to map DiscourseUser to AppUser
const mapDiscourseUserToAppUser = (discourseUser: any): AppUser => {
  const DISCOURSE_URL = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info';
  return {
    id: discourseUser.id?.toString() || '0',
    username: discourseUser.username || 'unknown',
    name: discourseUser.name || discourseUser.username || 'Unknown User',
    email: discourseUser.email || '',
    avatar: discourseUser.avatar_template
      ? `${DISCOURSE_URL}${discourseUser.avatar_template.replace('{size}', '120')}`
      : '',
    bio: discourseUser.bio_raw || '',
    followers: 0,
    following: 0,
    bytes: discourseUser.topic_count || 0,
    comments: discourseUser.post_count || 0,
    joinedDate: discourseUser.created_at
      ? new Date(discourseUser.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      : 'Unknown',
  };
};

/**
 * Manages authentication state using Discourse User API Keys.
 * - Persists the authenticated user in SecureStore.
 * - Validates stored API keys by fetching the current user.
 * - Emits auth events for other hooks to react to sign-in/out changes.
 * There is no cookie/session fallback; all authentication relies on User API Keys.
 */
export const useAuth = () => {
  const { user, isLoading, isAuthenticated, setUser, setLoading, setAuthenticated, reset, loadStoredAuth } = useAuthStore();

  // Load stored authentication data on app start (only once globally)
  useEffect(() => {
    // Only load if we haven't loaded yet and aren't currently loading
    // The isLoadingAuth flag inside loadStoredAuth prevents concurrent calls
    if (!hasLoadedAuth && !isLoadingAuth) {
      loadStoredAuth();
    }
  }, []); // Empty deps - only run once on mount

  // Listen to auth events to sync state across components
  useEffect(() => {
    const unsubscribe = onAuthEvent((event) => {
      if (event === 'auth:signed-in' || event === 'auth:refreshed') {
        // Refresh auth state when events are emitted
        // Reset the flag so we can reload
        hasLoadedAuth = false;
        loadStoredAuth();
      } else if (event === 'auth:signed-out') {
        reset();
        hasLoadedAuth = true; // Mark as loaded (even though it's empty)
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadStoredAuth, reset]);

  const signIn = async (identifier?: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Checking authentication status...');
      setLoading(true);

      // Check for User API Key using new auth system
      let isValid = false;
      const hasApiKey = await checkAuth();
      if (hasApiKey) {
        const userResponse = await discourseApi.getCurrentUser();
        isValid = userResponse.success && !!userResponse.data;
      }
      
      if (isValid) {
        const userResponse = await discourseApi.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
          const appUser = mapDiscourseUserToAppUser(userResponse.data);
          try {
            await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(appUser));
          } catch (storageError: any) {
            console.warn('SecureStore error:', storageError?.message || storageError);
          }
          
          console.log('✅ Valid authentication found');
          setUser(appUser);
          setAuthenticated(true);
          setLoading(false);
          
          emitAuthEvent('auth:signed-in');
          return { success: true };
        }
      }
      
      console.log('❌ No valid authentication found');
      setLoading(false);
      return { 
        success: false, 
        error: 'Please authorize the app to access your account'
      };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      logger.error('Sign in failed', error);
      setLoading(false);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  const setAuthenticatedUser = async (user: AppUser): Promise<void> => {
    try {
      try {
        await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(user));
      } catch (storageError: any) {
        logger.warn('useAuth: Failed to save auth to SecureStore:', storageError?.message || storageError);
      }
      
      // Update global state atomically - this will trigger re-renders in all components
      useAuthStore.setState({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      // Mark as loaded so we don't reload unnecessarily
      hasLoadedAuth = true;
      isLoadingAuth = false;
      
      emitAuthEvent('auth:signed-in');
      logger.info('useAuth: User authenticated via API key', { username: user.username });
      
      // Small delay to ensure state propagates
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      logger.error('useAuth: Failed to set authenticated user', error);
      
      // Update state even on error
      useAuthStore.setState({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      hasLoadedAuth = true;
      isLoadingAuth = false;
      emitAuthEvent('auth:signed-in');
    }
  };

  const signUp = async (userData: {
    name: string;
    username: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('📝 Attempting sign up...');
      setLoading(true);

      console.log('❌ Sign up failed: User creation must be done through web interface');
      setLoading(false);
      return { 
        success: false, 
        error: 'User creation must be done through web interface. Please use the webview signup.' 
      };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      logger.error('Sign up failed', error);
      setLoading(false);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Signing out...');
      setLoading(true);

      try {
        await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
      } catch (storageError: any) {
        logger.warn('useAuth: Failed to clear auth storage:', storageError?.message || storageError);
      }
      
      // Sign out using new auth system (handles revocation)
      try {
        await authSignOut();
      } catch (apiKeyError: any) {
        logger.warn('useAuth: Failed to sign out:', apiKeyError?.message || apiKeyError);
        // Still clear local key even if revocation fails
        await UserApiKeyManager.clearApiKey();
      }
      
      console.log('✅ Sign out successful');
      reset();
      
      emitAuthEvent('auth:signed-out');
      router.replace('/(tabs)' as any);
      
      Alert.alert('Signed out', 'You have been signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      logger.error('Sign out failed', error);
      try {
        await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
      
      try {
        await UserApiKeyManager.clearApiKey();
      } catch {
        // Ignore API key errors
      }
      reset();
      emitAuthEvent('auth:signed-out');
      router.replace('/(tabs)' as any);
      
      Alert.alert('Signed out', 'You have been signed out successfully');
    }
  };

  const updateProfile = async (updates: Partial<AppUser>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('👤 Updating profile...');
      setLoading(true);

      const updatedUser = { ...user, ...updates };
      
      try {
        await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      } catch (storageError: any) {
        logger.warn('useAuth: Failed to save profile to SecureStore:', storageError?.message || storageError);
      }
      
      console.log('✅ Profile update successful');
      setUser(updatedUser);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update error:', error);
      logger.error('Profile update failed', error);
      setLoading(false);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing authentication...');
      
      // Check for User API Key using new auth system
      let isValid = false;
      const hasApiKey = await checkAuth();
      if (hasApiKey) {
        // Verify by making API call
        const userResponse = await discourseApi.getCurrentUser();
        isValid = userResponse.success && !!userResponse.data;
      }
      
      if (!isValid) {
        try {
          await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
        } catch {
          // Ignore storage errors
        }
        reset();
        emitAuthEvent('auth:signed-out');
        return;
      }
      
      const userResponse = await discourseApi.getCurrentUser();
      
      if (userResponse.success && userResponse.data) {
        const appUser = mapDiscourseUserToAppUser(userResponse.data);
        try {
          await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(appUser));
        } catch (storageError: any) {
          logger.warn('useAuth: SecureStore error, auth not persisted:', storageError?.message || storageError);
        }
        
        setUser(appUser);
        setAuthenticated(true);
        
        console.log('✅ Auth refresh successful');
        emitAuthEvent('auth:refreshed');
      } else {
        try {
          await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
        } catch {
          // Ignore storage errors
        }
        
        try {
          await UserApiKeyManager.clearApiKey();
        } catch {
          // Ignore API key errors
        }
        reset();
        emitAuthEvent('auth:signed-out');
      }
    } catch (error) {
      console.error('❌ Auth refresh error:', error);
      logger.error('Auth refresh failed', error);
      try {
        await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
      
      try {
        await UserApiKeyManager.clearApiKey();
      } catch {
        // Ignore API key errors
      }
      reset();
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshAuth,
    setAuthenticatedUser,
  };
};

