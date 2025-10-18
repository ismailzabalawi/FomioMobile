import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { discourseApiService, AppUser } from './discourseApiService';
import { logger } from './logger';

const AUTH_STORAGE_KEY = '@fomio_auth';

export interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

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

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load stored authentication data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('📱 Loading stored authentication...');
      const storedData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const validatedUser = validateStoredAuth(parsedData);
        
        if (validatedUser) {
          console.log('✅ Valid stored auth found, user logged in');
          setAuthState({
            user: validatedUser,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        } else {
          console.log('❌ Invalid stored auth, clearing storage');
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      
      console.log('📱 No valid stored auth found');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      logger.error('Failed to load stored authentication', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const signIn = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Attempting sign in...');
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Use the Discourse API to authenticate with API key
      // For Discourse, we use API key authentication instead of username/password
      const response = await discourseApiService.authenticateWithApiKey();
      
      if (response.success && response.data) {
        // Store the user data securely
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.data));
        
        console.log('✅ Sign in successful');
        setAuthState({
          user: response.data,
          isLoading: false,
          isAuthenticated: true,
        });
        
        return { success: true };
      } else {
        console.log('❌ Sign in failed:', response.error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: response.error || 'Authentication failed. Please check your API credentials in the .env file.' 
        };
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      logger.error('Sign in failed', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
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
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Use the Discourse API to create account
      const response = await discourseApiService.createUser(userData);
      
      if (response.success && response.data) {
        // Store the user data securely
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.data));
        
        console.log('✅ Sign up successful');
        setAuthState({
          user: response.data,
          isLoading: false,
          isAuthenticated: true,
        });
        
        return { success: true };
      } else {
        console.log('❌ Sign up failed:', response.error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: response.error || 'Account creation failed' 
        };
      }
    } catch (error) {
      console.error('❌ Sign up error:', error);
      logger.error('Sign up failed', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Signing out...');
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Clear stored authentication data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      
      // Logout from Discourse API
      await discourseApiService.logout();
      
      console.log('✅ Sign out successful');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('❌ Sign out error:', error);
      logger.error('Sign out failed', error);
      // Still clear local state even if API call fails
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const updateProfile = async (updates: Partial<AppUser>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!authState.user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('👤 Updating profile...');
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // For now, just update local state since we don't have update profile endpoint implemented
      const updatedUser = { ...authState.user, ...updates };
      
      // Update stored data
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      
      console.log('✅ Profile update successful');
      setAuthState({
        user: updatedUser,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update error:', error);
      logger.error('Profile update failed', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      if (!authState.user) return;

      console.log('🔄 Refreshing authentication...');
      
      // Get current user data from Discourse
      const response = await discourseApiService.getCurrentUser();
      
      if (response.success && response.data) {
        // Update stored data
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.data));
        
        setAuthState(prev => ({
          ...prev,
          user: response.data || null,
        }));
        
        console.log('✅ Auth refresh successful');
      }
    } catch (error) {
      console.error('❌ Auth refresh error:', error);
      logger.error('Auth refresh failed', error);
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshAuth,
  };
};

