import { useState, useEffect, useCallback } from 'react';
import { discourseApi, DiscourseUser, UserSettings, DiscourseApiResponse } from './discourseApi';
import { useAuth } from './useAuth';
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
  uploadAvatar: (imageFile: File) => Promise<boolean>;
  
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
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let response: DiscourseApiResponse<DiscourseUser>;
      
      if (username) {
        response = await discourseApi.getUserProfile(username);
      } else {
        response = await discourseApi.getCurrentUser();
      }
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setError(response.error || 'Failed to load user data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
  const uploadAvatar = useCallback(async (imageFile: File): Promise<boolean> => {
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

  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    } else {
      // Clear user data when not authenticated
      setUser(null);
      setSettings(null);
      setError(null);
      setSettingsError(null);
    }
  }, [isAuthenticated, refreshUser]);

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
    
    // Utility
    isAuthenticated,
    avatarUrl,
  };
}

export default useDiscourseUser;

