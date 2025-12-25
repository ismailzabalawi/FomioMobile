import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import Constants from 'expo-constants';
import { discourseApi, AppUser } from './discourseApi';
import { logger } from './logger';
import { emitAuthEvent, onAuthEvent } from './auth-events';
import { UserApiKeyManager } from './userApiKeyManager';
import { resetOnboarding } from './onboardingStorage';

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
      
      // CRITICAL FIX: Always try API call first, regardless of hasApiKey() check
      // This handles both legacy ('disc_user_api_key') and new ('fomio_user_api_key') storage
      // The authHeaders() function checks both locations, so if API works, we have valid auth
      // hasApiKey() only checks new storage, but keys might exist in legacy location
      let userResponse = await discourseApi.getCurrentUser();
      const hasValidAuth = userResponse.success && !!userResponse.data;
      
      if (hasValidAuth) {
        console.log('✅ Valid API key found (verified via API call)');
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
        
        // If no stored user data, use the API response we already fetched
        // No need to make another API call - we already have the data
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
      
      // Handle different failure scenarios based on response status
      const responseStatus = userResponse.status;
      const is404NoSession = responseStatus === 404 && userResponse.error === 'No active session';
      const isAuthError = responseStatus === 401 || responseStatus === 403;
      
      if (is404NoSession) {
        // 404 is expected when user is not authenticated - don't treat as error
        console.log('📱 No active session (user not authenticated)');
        // Clear stored user data since API confirms no session, but keep API keys
        // (they might be valid but user just needs to authorize)
        try {
          await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
        } catch (storageError: any) {
          console.warn('Failed to clear auth storage:', storageError?.message || storageError);
        }
      } else if (isAuthError) {
        // 401/403 means API key is invalid/expired - clear everything
        console.log('🔒 API key invalid or expired (401/403), clearing authentication');
        try {
          await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
          // Clear API keys since they're invalid
          await UserApiKeyManager.clearApiKey();
        } catch (storageError: any) {
          console.warn('Failed to clear auth storage:', storageError?.message || storageError);
        }
      } else {
        // Other errors (network, server, etc.) - don't clear storage
        console.log('⚠️ API call failed (non-auth error), keeping stored data');
        // Don't clear storage on network/server errors - might be temporary
      }
      
      set({ user: null, isLoading: false, isAuthenticated: false });
      // CRITICAL: Reset flags BEFORE returning to prevent loops
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
  const DISCOURSE_URL = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.fomio.app';
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
    let reloadTimeout: ReturnType<typeof setTimeout> | null = null;
    let isProcessingEvent = false;

    const unsubscribe = onAuthEvent((event) => {
      // CRITICAL: Prevent loops by checking if we're already loading or processing
      if (isLoadingAuth || isProcessingEvent) {
        console.log('⚠️ Auth event received while loading/processing, skipping to prevent loop', {
          event,
          isLoadingAuth,
          isProcessingEvent,
        });
        return;
      }

      if (event === 'auth:signed-in' || event === 'auth:refreshed') {
        // Only reload if we haven't loaded recently and aren't currently loading
        // Use debouncing to prevent rapid-fire reloads
        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
        }

        isProcessingEvent = true;
        hasLoadedAuth = false;

        // Use setTimeout with longer delay to prevent immediate recursive calls
        reloadTimeout = setTimeout(() => {
          if (!isLoadingAuth) {
            loadStoredAuth().finally(() => {
              isProcessingEvent = false;
            });
          } else {
            isProcessingEvent = false;
          }
        }, 300); // Increased delay to prevent race conditions
      } else if (event === 'auth:signed-out') {
        // Clear any pending reload
        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
          reloadTimeout = null;
        }

        isProcessingEvent = true;
        reset();
        hasLoadedAuth = true; // Mark as loaded (even though it's empty)
        isLoadingAuth = false; // Reset loading flag on sign out
        isProcessingEvent = false;
      }
    });

    return () => {
      unsubscribe();
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
    };
  }, [loadStoredAuth, reset]);

  const signIn = async (identifier?: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Checking authentication status...');
      setLoading(true);

      // CRITICAL FIX: Always try API call first, regardless of hasApiKey() check
      // This handles both legacy ('disc_user_api_key') and new ('fomio_user_api_key') storage
      // The authHeaders() function checks both locations, so if API works, we have valid auth
      const userResponse = await discourseApi.getCurrentUser();
      const isValid = userResponse.success && !!userResponse.data;
      
      if (isValid && userResponse.data) {
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
          
          // Mark as loaded BEFORE emitting event to prevent loop
          hasLoadedAuth = true;
          isLoadingAuth = false;
          
          // Small delay before emitting to let state settle
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Only emit if not currently loading (guard against loops)
          if (!isLoadingAuth) {
            emitAuthEvent('auth:signed-in');
          }
          return { success: true };
      }
      
      // Check response status to provide better error messages
      const responseStatus = userResponse.status;
      const is404NoSession = responseStatus === 404 && userResponse.error === 'No active session';
      
      if (is404NoSession) {
        console.log('📱 No active session - user needs to authorize');
      } else {
        console.log('❌ Authentication check failed:', userResponse.error);
      }
      
      setLoading(false);
      return { 
        success: false, 
        error: is404NoSession 
          ? 'Please authorize the app to access your account'
          : userResponse.error || 'Authentication failed. Please try again.'
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
      
      // CRITICAL: Mark as loaded BEFORE emitting event to prevent loop
      hasLoadedAuth = true;
      isLoadingAuth = false;
      
      // Small delay before emitting to let state settle
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Only emit if not currently loading (guard against loops)
      if (!isLoadingAuth) {
        emitAuthEvent('auth:signed-in');
        logger.info('useAuth: User authenticated via API key', { username: user.username });
      }
    } catch (error) {
      logger.error('useAuth: Failed to set authenticated user', error);
      
      // Update state even on error
      useAuthStore.setState({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      // Mark as loaded BEFORE emitting event
      hasLoadedAuth = true;
      isLoadingAuth = false;
      
      // Small delay before emitting
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Only emit if not currently loading
      if (!isLoadingAuth) {
        emitAuthEvent('auth:signed-in');
      }
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
      
      // Revoke User API Key using new auth system
      try {
        const { signOut: authSignOut } = require('../lib/auth');
        await authSignOut();
      } catch (apiKeyError: any) {
        logger.warn('useAuth: Failed to revoke API key:', apiKeyError?.message || apiKeyError);
        // Still clear local key even if revocation fails
        try {
          await UserApiKeyManager.clearApiKey();
        } catch {
          // Ignore cleanup errors
        }
      }
      
      console.log('✅ Sign out successful');
      reset();
      try {
        await resetOnboarding();
      } catch (resetError: any) {
        logger.warn('useAuth: Failed to reset onboarding state:', resetError?.message || resetError);
      }
      
      emitAuthEvent('auth:signed-out');
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
      try {
        await resetOnboarding();
      } catch {
        // Ignore onboarding reset errors on failure path
      }
      emitAuthEvent('auth:signed-out');
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
      
      // CRITICAL FIX: Always try API call first, regardless of hasApiKey() check
      // This handles both legacy ('disc_user_api_key') and new ('fomio_user_api_key') storage
      // The authHeaders() function checks both locations, so if API works, we have valid auth
      const userResponse = await discourseApi.getCurrentUser();
      const isValid = userResponse.success && !!userResponse.data;
      
      if (!isValid) {
        const responseStatus = userResponse.status;
        const is404NoSession = responseStatus === 404 && userResponse.error === 'No active session';
        const isAuthError = responseStatus === 401 || responseStatus === 403;
        
        if (isAuthError) {
          // API key invalid - clear everything
          console.log('🔒 API key invalid during refresh, clearing authentication');
          try {
            await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
            await UserApiKeyManager.clearApiKey();
          } catch {
            // Ignore storage errors
          }
        } else if (is404NoSession) {
          // Just no session - clear user data but keep API key
          console.log('📱 No active session during refresh');
          try {
            await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
          } catch {
            // Ignore storage errors
          }
        } else {
          // Other errors (network, etc.) - don't clear storage
          console.log('⚠️ Refresh failed (non-auth error), keeping stored data');
        }
        
        reset();
        emitAuthEvent('auth:signed-out');
        return;
      }
      
      // Use the API response we already fetched - no need for another call
      if (userResponse.success && userResponse.data) {
        const appUser = mapDiscourseUserToAppUser(userResponse.data);
        try {
          await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(appUser));
        } catch (storageError: any) {
          logger.warn('useAuth: SecureStore error, auth not persisted:', storageError?.message || storageError);
        }
        
        setUser(appUser);
        setAuthenticated(true);
        
        // Mark as loaded before emitting
        hasLoadedAuth = true;
        isLoadingAuth = false;
        
        console.log('✅ Auth refresh successful');
        
        // Small delay before emitting to prevent loops
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Only emit if not currently loading
        if (!isLoadingAuth) {
          emitAuthEvent('auth:refreshed');
        }
      } else {
        // Shouldn't reach here if isValid check passed, but handle anyway
        console.log('⚠️ Unexpected state in refreshAuth - clearing auth');
        try {
          await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
        } catch {
          // Ignore storage errors
        }
        reset();
        emitAuthEvent('auth:signed-out');
      }
    } catch (error) {
      console.error('❌ Auth refresh error:', error);
      logger.error('Auth refresh failed', error);
      // Don't clear storage on network errors - might be temporary
      // Only reset state, keep stored data for retry
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
