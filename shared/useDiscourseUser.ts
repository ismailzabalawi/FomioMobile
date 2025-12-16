import { useState, useEffect, useCallback } from 'react';
import { discourseApi, DiscourseUser, UserSettings, DiscourseApiResponse } from './discourseApi';
import { useAuth } from '@/shared/auth-context';
import { onAuthEvent } from './auth-events';

export interface UseDiscourseUserReturn {
  // User Data
  user: DiscourseUser | null;
  settings: UserSettings | null;
  
  // Loading States
  loading: boolean;
  settingsLoading: boolean;
  updating: boolean;
  
  // Error States
  error: string | null;
  settingsError: string | null;
  
  // Actions
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateProfile: (updates: Partial<DiscourseUser>) => Promise<boolean>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  changeEmail: (newEmail: string) => Promise<boolean>;
  uploadAvatar: (imageFile: { uri: string; type?: string; name?: string; fileSize?: number }) => Promise<boolean>;
  
  // Utility
  isAuthenticated: boolean;
  avatarUrl: string | null;
}

export function useDiscourseUser(username?: string): UseDiscourseUserReturn {
  // Use reactive auth state from useAuth hook
  const { isAuthenticated } = useAuth();
  
  // State
  const [user, setUser] = useState<DiscourseUser | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Computed values
  const avatarUrl = user?.avatar_template 
    ? discourseApi.getAvatarUrl(user.avatar_template, 120)
    : null;

  // Load user data
  const refreshUser = useCallback(async () => {
    // If username is provided, allow fetching public profile without auth
    // Only require auth when fetching current user (no username provided)
    if (!username && !isAuthenticated) {
      console.log('⚠️ refreshUser: Not authenticated and no username, skipping');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let response: DiscourseApiResponse<DiscourseUser>;
      
      console.log('📤 refreshUser: Fetching user data', {
        hasUsername: !!username,
        username: username || 'undefined',
        willUse: username ? 'getUserProfile' : 'getCurrentUser',
      });
      
      if (username) {
        // Public profile - no auth required
        response = await discourseApi.getUserProfile(username);
      } else {
        // Current user - requires auth
        response = await discourseApi.getCurrentUser();
      }
      
      console.log('📥 refreshUser: API response received', {
        success: response.success,
        hasData: !!response.data,
        hasError: !!response.error,
        error: response.error,
        username: response.data?.username,
        status: response.status,
        responseDataType: typeof response.data,
        responseDataKeys: response.data ? Object.keys(response.data) : [],
      });
      
      if (response.success && response.data) {
        // CRITICAL: response.data should already be the extracted user from getCurrentUser()
        // But if it's the full response object (cached), we need to extract the user
        let userData: DiscourseUser | null = response.data as any;
        
        // Check if we got the full response object instead of the user
        // Type assertion needed because TypeScript doesn't know about these properties
        const dataAsAny = userData as any;
        if (dataAsAny && (dataAsAny.user_badges || dataAsAny.badges || dataAsAny.badge_types || dataAsAny.users)) {
          // This is the full response - extract the user
          // Check current_user first (standard Discourse), then user (your API)
          userData = (dataAsAny.current_user || dataAsAny.user || null) as DiscourseUser | null;
          console.log('⚠️ refreshUser: Detected full response object, extracting user', {
            extractedFrom: dataAsAny.current_user ? 'current_user' : (dataAsAny.user ? 'user' : 'none'),
            hasUserData: !!userData,
            userDataKeys: userData ? Object.keys(userData) : [],
            hasUsername: userData ? !!userData.username : false,
            username: userData ? userData.username : undefined,
          });
        }
        
        // Validate we have valid user data
        // If extraction failed but response.data has user fields, try using it directly
        if (!userData || (!userData.id && !userData.username)) {
          // Last resort: check if response.data itself has user fields
          const responseAsAny = response.data as any;
          if (responseAsAny && (responseAsAny.id || responseAsAny.username)) {
            console.log('⚠️ refreshUser: Extraction failed but response.data has user fields, using directly');
            userData = responseAsAny as DiscourseUser;
          } else {
            console.error('❌ refreshUser: Invalid user data after extraction', {
              hasUserData: !!userData,
              userDataKeys: userData ? Object.keys(userData) : [],
              responseDataKeys: response.data ? Object.keys(response.data) : [],
              responseDataType: typeof response.data,
            });
            setError('Invalid user data structure');
            setUser(null);
            setLoading(false);
            return;
          }
        }
        
        // Log the full user object structure for debugging
        console.log('✅ refreshUser: User data set successfully', {
          username: userData.username,
          id: userData.id,
          name: userData.name,
          hasUsername: !!userData.username,
          usernameType: typeof userData.username,
          userKeys: Object.keys(userData),
        });
        
        setUser(userData);
        
        // Update stored username in API key data if available
        // This ensures Api-Username header is always available for write operations
        if (userData.username) {
          try {
            const UserApiKeyManager = require('./userApiKeyManager').UserApiKeyManager;
            const apiKeyData = await UserApiKeyManager.getApiKey();
            if (apiKeyData && apiKeyData.key && !apiKeyData.username) {
              // Only update if username is missing to avoid unnecessary writes
              await UserApiKeyManager.storeApiKey({
                ...apiKeyData,
                username: userData.username,
              });
              console.log('✅ Updated stored username in API key data');
            }
          } catch (updateError) {
            // Non-critical - log but don't fail
            console.warn('Failed to update username in API key data', updateError);
          }
        }
      } else {
        const errorMessage = response.error || 'Failed to load user data';
        console.error('❌ refreshUser: Failed to load user data', {
          error: errorMessage,
          success: response.success,
          hasData: !!response.data,
          status: response.status,
        });
        setError(errorMessage);
        // Clear user data on error to prevent stale state
        setUser(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ refreshUser: Exception occurred', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(errorMessage);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [username, isAuthenticated]);

  // Load user settings
  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated || !user?.username) return;
    
    setSettingsLoading(true);
    setSettingsError(null);
    
    try {
      const response = await discourseApi.getUserSettings(user.username);
      
      if (response.success && response.data) {
        setSettings(response.data);
      } else {
        setSettingsError(response.error || 'Failed to load settings');
      }
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSettingsLoading(false);
    }
  }, [user?.username, isAuthenticated]);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<DiscourseUser>): Promise<boolean> => {
    if (!user?.username) return false;
    
    setUpdating(true);
    setError(null);
    
    try {
      const response = await discourseApi.updateUserProfile(user.username, updates);
      
      if (response.success && response.data) {
        setUser(response.data);
        return true;
      } else {
        setError(response.error || 'Failed to update profile');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.username]);

  // Update user settings
  const updateSettings = useCallback(async (updates: Partial<UserSettings>): Promise<boolean> => {
    if (!user?.username) return false;
    
    setUpdating(true);
    setSettingsError(null);
    
    try {
      const response = await discourseApi.updateUserSettings(user.username, updates);
      
      if (response.success && response.data) {
        setSettings(response.data);
        return true;
      } else {
        setSettingsError(response.error || 'Failed to update settings');
        return false;
      }
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.username]);

  // Change password
  const changePassword = useCallback(async (
    currentPassword: string, 
    newPassword: string
  ): Promise<boolean> => {
    if (!user?.username) return false;
    
    setUpdating(true);
    setError(null);
    
    try {
      const response = await discourseApi.changePassword(
        user.username, 
        currentPassword, 
        newPassword
      );
      
      if (response.success) {
        return true;
      } else {
        setError(response.error || 'Failed to change password');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.username]);

  // Change email
  const changeEmail = useCallback(async (newEmail: string): Promise<boolean> => {
    if (!user?.username) return false;
    
    setUpdating(true);
    setError(null);
    
    try {
      const response = await discourseApi.changeEmail(user.username, newEmail);
      
      if (response.success) {
        // Refresh user data to get updated email
        await refreshUser();
        return true;
      } else {
        setError(response.error || 'Failed to change email');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.username, refreshUser]);

  // Upload avatar
  const uploadAvatar = useCallback(async (imageFile: { uri: string; type?: string; name?: string; fileSize?: number }): Promise<boolean> => {
    if (!user?.username) return false;
    
    setUpdating(true);
    setError(null);
    
    try {
      const response = await discourseApi.uploadAvatar(user.username, imageFile);
      
      if (response.success) {
        // Refresh user data to get updated avatar
        await refreshUser();
        return true;
      } else {
        setError(response.error || 'Failed to upload avatar');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.username, refreshUser]);

  // Upload profile/hero header
  const uploadProfileHeader = useCallback(async (imageFile: { uri: string; type?: string; name?: string; fileSize?: number }): Promise<boolean> => {
    if (!user?.username) return false;
    
    setUpdating(true);
    setError(null);
    
    try {
      const response = await discourseApi.uploadProfileHeader(user.username, imageFile);
      
      if (response.success) {
        await refreshUser();
        return true;
      } else {
        setError(response.error || 'Failed to upload cover image');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.username, refreshUser]);

  // Load initial data when authenticated
  useEffect(() => {
    console.log('🔄 useDiscourseUser effect: Checking auth state', {
      isAuthenticated,
      username: username || 'undefined',
      hasUser: !!user,
      loading,
      userUsername: user?.username,
    });
    
    if (isAuthenticated) {
      // Only refresh if we don't have user data or if username changed
      if (!user || (username && user.username !== username)) {
        console.log('🔄 useDiscourseUser: Triggering refreshUser', {
          reason: !user ? 'no user data' : 'username mismatch',
          currentUsername: user?.username,
          requestedUsername: username,
        });
        refreshUser();
      } else {
        console.log('⏭️ useDiscourseUser: Skipping refreshUser - user data already loaded', {
          userUsername: user.username,
          requestedUsername: username,
        });
      }
    } else {
      // Clear user data when not authenticated
      console.log('🧹 useDiscourseUser: Clearing user data - not authenticated');
      setUser(null);
      setSettings(null);
      setError(null);
      setSettingsError(null);
    }
  }, [isAuthenticated, refreshUser, username, user?.username]); // Add user?.username to prevent unnecessary refreshes

  // Listen to auth events to refresh user data when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthEvent((event) => {
      if ((event === 'auth:signed-in' || event === 'auth:refreshed') && isAuthenticated) {
        // Refresh user data when signed in or auth is refreshed
        refreshUser();
      } else if (event === 'auth:signed-out') {
        // Clear user data when signed out
        setUser(null);
        setSettings(null);
        setError(null);
        setSettingsError(null);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, refreshUser]);

  // Load settings when user is loaded
  useEffect(() => {
    if (user && isAuthenticated) {
      refreshSettings();
    }
  }, [user, isAuthenticated, refreshSettings]);

  return {
    // User Data
    user,
    settings,
    
    // Loading States
    loading,
    settingsLoading,
    updating,
    
    // Error States
    error,
    settingsError,
    
    // Actions
    refreshUser,
    refreshSettings,
    updateProfile,
    updateSettings,
    changePassword,
    changeEmail,
    uploadAvatar,
    uploadProfileHeader,
    
    // Utility
    isAuthenticated,
    avatarUrl,
  };
}

export default useDiscourseUser;
