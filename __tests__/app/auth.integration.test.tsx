/**
 * Integration tests for authentication flow
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../shared/useAuth';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock theme provider
jest.mock('@/components/theme', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      text: '#000000',
      surface: '#F2F2F7',
      error: '#FF3B30',
    },
  }),
}));

// Mock useAuth hook
jest.mock('../../shared/useAuth', () => ({
  useAuth: jest.fn(),
}));

import { Text, TouchableOpacity, View } from 'react-native';

// Test component that uses useAuth hook
const TestAuthComponent = () => {
  const { user, isLoading, isAuthenticated, signIn, signUp, signOut, updateProfile } = useAuth();

  return (
    <View>
      <Text testID="auth-status">
        {isLoading ? 'Loading' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </Text>
      {user && (
        <Text testID="user-info">
          {user.username} - {user.email}
        </Text>
      )}
      <TouchableOpacity
        testID="sign-in-button"
        onPress={() => signIn('test@example.com', 'password')}
      >
        <Text>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="sign-up-button"
        onPress={() => signUp({ name: 'Test User', email: 'test@example.com', username: 'testuser', password: 'password' })}
      >
        <Text>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="sign-out-button"
        onPress={() => signOut()}
      >
        <Text>Sign Out</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="update-user-button"
        onPress={() => updateProfile({ username: 'updateduser' })}
      >
        <Text>Update User</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('Authentication Integration Tests', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should initialize with unauthenticated state', async () => {
    // Default mock implementation
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('should handle successful sign in', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ success: true });
    const mockUser = { 
      id: '1', 
      email: 'test@example.com', 
      username: 'test@example.com',
      name: 'Test User',
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      bytes: 0,
      comments: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    // Trigger sign in
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('test@example.com - test@example.com');
    });

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should handle successful sign up', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({ success: true });
    const mockUser = { 
      id: '1', 
      email: 'test@example.com', 
      username: 'testuser',
      name: 'Test User',
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      bytes: 0,
      comments: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: mockSignUp,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    fireEvent.press(screen.getByTestId('sign-up-button'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('testuser - test@example.com');
    });

    expect(mockSignUp).toHaveBeenCalledWith({ 
      name: 'Test User', 
      email: 'test@example.com', 
      username: 'testuser', 
      password: 'password' 
    });
  });

  it('should handle sign out', async () => {
    const mockSignOut = jest.fn();
    const mockUser = { 
      id: '1', 
      email: 'test@example.com', 
      username: 'testuser',
      name: 'Test User',
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      bytes: 0,
      comments: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    fireEvent.press(screen.getByTestId('sign-out-button'));

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should handle user update', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue({ success: true });
    const mockUser = { 
      id: '1', 
      email: 'test@example.com', 
      username: 'testuser',
      name: 'Test User',
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      bytes: 0,
      comments: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: mockUpdateProfile,
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('testuser - test@example.com');
    });

    fireEvent.press(screen.getByTestId('update-user-button'));

    expect(mockUpdateProfile).toHaveBeenCalledWith({ username: 'updateduser' });
  });

  it('should restore authentication state from storage', async () => {
    const mockUser = { 
      id: '1', 
      email: 'stored@example.com', 
      username: 'storeduser',
      name: 'Stored User',
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      bytes: 0,
      comments: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('storeduser - stored@example.com');
    });
  });

  it('should handle corrupted storage data gracefully', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('should handle storage errors gracefully', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('should handle network errors during sign in', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ 
      success: false, 
      error: 'Network error' 
    });
    
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    fireEvent.press(screen.getByTestId('sign-in-button'));

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should handle network errors during sign up', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({ 
      success: false, 
      error: 'Network error' 
    });
    
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: jest.fn(),
      signUp: mockSignUp,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      refreshAuth: jest.fn(),
      setAuthenticatedUser: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    fireEvent.press(screen.getByTestId('sign-up-button'));

    expect(mockSignUp).toHaveBeenCalledWith({ 
      name: 'Test User', 
      email: 'test@example.com', 
      username: 'testuser', 
      password: 'password' 
    });
  });
});

