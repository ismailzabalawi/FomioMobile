import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { discourseApi, DiscourseUser } from './discourseApi';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  bytes: number;
  joinedDate: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = 'fomio_auth';

// Security validation for stored auth data
const validateStoredAuth = (storedData: any): User | null => {
  try {
    console.log('🔍 Validating stored auth data:', storedData);
    
    if (!storedData || typeof storedData !== 'object') {
      console.log('❌ Invalid stored data type');
      return null;
    }
    
    const requiredFields = ['id', 'name', 'username'];
    for (const field of requiredFields) {
      if (!storedData[field] || typeof storedData[field] !== 'string') {
        console.log(`❌ Missing or invalid required field: ${field}`);
        return null;
      }
    }
    
    // Email is optional for Discourse users
    if (storedData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(storedData.email)) {
        console.log('❌ Invalid email format');
        return null;
      }
    }
    
    // Username validation is more flexible for Discourse
    if (storedData.username.length < 1) {
      console.log('❌ Username too short');
      return null;
    }
    
    console.log('✅ Stored auth data is valid');
    return storedData as User;
  } catch (error) {
    console.log('❌ Error validating stored auth data:', error);
    logger.error('Failed to validate stored auth data', error);
    return null;
  }
};

// Transform Discourse user to app user format
const transformDiscourseUser = (discourseUser: DiscourseUser): User => {
  return {
    id: discourseUser.id.toString(),
    name: discourseUser.name || discourseUser.username,
    username: discourseUser.username,
    email: discourseUser.email || '',
    avatar: discourseApi.getAvatarUrl(discourseUser.avatar_template, 120),
    bio: discourseUser.bio_raw || '',
    followers: 0, // Not available in Discourse
    following: 0, // Not available in Discourse
    bytes: discourseUser.post_count,
    joinedDate: `Joined ${new Date(discourseUser.created_at).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })}`,
  };
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    loadAuthState();
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('🔐 Auth State Debug:', {
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.isLoading,
      user: authState.user ? 'present' : 'null',
      userDetails: authState.user ? {
        id: authState.user.id,
        username: authState.user.username,
        name: authState.user.name
      } : null
    });
  }, [authState]);

  const loadAuthState = async () => {
    try {
      console.log('🔄 Loading auth state from AsyncStorage');
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      console.log('📦 Retrieved stored auth:', storedAuth ? 'present' : 'null');
      
      if (storedAuth) {
        const parsedData = JSON.parse(storedAuth);
        console.log('🔍 Parsed stored data:', parsedData);
        const user = validateStoredAuth(parsedData);
        
        if (user) {
          console.log('✅ Valid user found, setting authenticated state');
          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          console.log('❌ Invalid stored data, clearing it');
          // Invalid stored data, clear it
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } else {
        console.log('📭 No stored auth data found');
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.log('🚨 Error loading auth state:', error);
      logger.error('Failed to load auth state', error);
      // Clear potentially corrupted data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const signIn = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Starting sign in process for:', identifier);
      
      // Validate inputs
      if (!identifier || !password) {
        return { success: false, error: 'Email/username and password are required' };
      }

      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      // Attempt login with Discourse API
      const response = await discourseApi.login(identifier, password);
      
      if (response.success && response.data) {
        console.log('✅ Discourse login successful, transforming user data');
        const discourseUser = response.data.user;
        const user = transformDiscourseUser(discourseUser);
        
        console.log('💾 Saving user data to AsyncStorage');
        // Securely store user data
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        
        console.log('🔄 Updating auth state');
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });

        logger.auth('sign-in', true, { identifier, userId: user.id });
        console.log('✅ Sign in process completed successfully');
        return { success: true };
      } else {
        console.log('❌ Discourse login failed:', response.error);
        logger.auth('sign-in', false, { identifier, error: response.error });
        return { success: false, error: response.error || 'Authentication failed' };
      }
    } catch (error) {
      console.log('🚨 Sign in error:', error);
      logger.auth('sign-in', false, { identifier, error });
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signUp = async (name: string, email: string, username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate inputs
      if (!name || !email || !username || !password) {
        return { success: false, error: 'All fields are required' };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }

      if (name.length < 2) {
        return { success: false, error: 'Name must be at least 2 characters' };
      }

      if (username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' };
      }

      // For now, we'll simulate signup since Discourse registration might require additional setup
      // In a real implementation, you'd call discourseApi.register() or similar
      const mockUser: User = {
        id: Date.now().toString(),
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        bio: '',
        followers: 0,
        following: 0,
        bytes: 0,
        joinedDate: `Joined ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
      setAuthState({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      logger.auth('sign-up', true, { email, username, userId: mockUser.id });
      return { success: true };
    } catch (error) {
      logger.auth('sign-up', false, { email, username, error });
      return { success: false, error: 'Failed to create account' };
    }
  };

  const signOut = async () => {
    try {
      // Logout from Discourse API
      await discourseApi.logout();
      
      // Clear local storage
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      logger.auth('sign-out', true);
    } catch (error) {
      logger.error('Sign out error', error);
      // Even if logout fails, clear local state
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!authState.user) return;

    try {
      const updatedUser = { ...authState.user, ...updates };
      
      // Validate updated user data
      const validatedUser = validateStoredAuth(updatedUser);
      if (!validatedUser) {
        throw new Error('Invalid user data');
      }
      
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(validatedUser));
      setAuthState(prev => ({
        ...prev,
        user: validatedUser,
      }));
      
      logger.userAction('update-profile', { userId: validatedUser.id, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Update user error', error);
    }
  };

  // Refresh user data from Discourse API
  const refreshUser = async () => {
    if (!authState.user) return;

    try {
      const response = await discourseApi.getCurrentUser();
      if (response.success && response.data) {
        const user = transformDiscourseUser(response.data);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        setAuthState(prev => ({
          ...prev,
          user,
        }));
      }
    } catch (error) {
      logger.error('Failed to refresh user data', error);
    }
  };

  // Get security status
  const getSecurityStatus = () => {
    return discourseApi.getSecurityStatus();
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    updateUser,
    refreshUser,
    getSecurityStatus,
  };
}

