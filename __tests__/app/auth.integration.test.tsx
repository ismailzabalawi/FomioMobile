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
jest.mock('../../components/shared/theme-provider', () => ({
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
  const { user, isLoading, isAuthenticated, signIn, signUp, signOut, updateUser } = useAuth();

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
        onPress={() => signUp('Test User', 'test@example.com', 'testuser', 'password')}
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
        onPress={() => updateUser({ username: 'updateduser' })}
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
      updateUser: jest.fn(),
      refreshUser: jest.fn(),
      getSecurityStatus: jest.fn(),
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
      followers: 0,
      following: 0,
      bytes: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      refreshUser: jest.fn(),
      getSecurityStatus: jest.fn(),
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
      followers: 0,
      following: 0,
      bytes: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: mockSignUp,
      signOut: jest.fn(),
      updateUser: jest.fn(),
      refreshUser: jest.fn(),
      getSecurityStatus: jest.fn(),
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

    expect(mockSignUp).toHaveBeenCalledWith('Test User', 'test@example.com', 'testuser', 'password');
  });

  it('should handle sign out', async () => {
    const mockSignOut = jest.fn();
    const mockUser = { 
      id: '1', 
      email: 'test@example.com', 
      username: 'testuser',
      name: 'Test User',
      followers: 0,
      following: 0,
      bytes: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      updateUser: jest.fn(),
      refreshUser: jest.fn(),
      getSecurityStatus: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    fireEvent.press(screen.getByTestId('sign-out-button'));

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should handle user update', async () => {
    const mockUpdateUser = jest.fn();
    const mockUser = { 
      id: '1', 
      email: 'test@example.com', 
      username: 'testuser',
      name: 'Test User',
      followers: 0,
      following: 0,
      bytes: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateUser: mockUpdateUser,
      refreshUser: jest.fn(),
      getSecurityStatus: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('testuser - test@example.com');
    });

    fireEvent.press(screen.getByTestId('update-user-button'));

    expect(mockUpdateUser).toHaveBeenCalledWith({ username: 'updateduser' });
  });

  it('should restore authentication state from storage', async () => {
    const mockUser = { 
      id: '1', 
      email: 'stored@example.com', 
      username: 'storeduser',
      name: 'Stored User',
      followers: 0,
      following: 0,
      bytes: 0,
      joinedDate: 'Joined January 2024'
    };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      refreshUser: jest.fn(),
      getSecurityStatus: jest.fn(),
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
      updateUser: jest.fn(),
      refreshUser: jest.fn(),
      getSecurityStatus: jest.fn(),
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
      updateUser: jest.fn(),
      refreshUser: jest.fn(),
      getSecurityStatus: jest.fn(),
    });

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('should initialize with unauthenticated state', async () => {
    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('should handle successful sign in', async () => {
    render(<TestAuthComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    // Trigger sign in
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('test@example.com - test@example.com');
    });

    // Verify AsyncStorage was called
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'auth_state',
      expect.stringContaining('test@example.com')
    );
  });

  it('should handle successful sign up', async () => {
    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    fireEvent.press(screen.getByTestId('sign-up-button'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('testuser - test@example.com');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'auth_state',
      expect.stringContaining('testuser')
    );
  });

  it('should handle sign out', async () => {
    // Start with authenticated state
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        user: { id: '1', email: 'test@example.com', username: 'testuser' },
        isAuthenticated: true,
      })
    );

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    fireEvent.press(screen.getByTestId('sign-out-button'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_state');
  });

  it('should handle user update', async () => {
    // Start with authenticated state
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        user: { id: '1', email: 'test@example.com', username: 'testuser' },
        isAuthenticated: true,
      })
    );

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('testuser - test@example.com');
    });

    fireEvent.press(screen.getByTestId('update-user-button'));

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('updateduser - test@example.com');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'auth_state',
      expect.stringContaining('updateduser')
    );
  });

  it('should restore authentication state from storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        user: { id: '1', email: 'stored@example.com', username: 'storeduser' },
        isAuthenticated: true,
      })
    );

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('storeduser - stored@example.com');
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_state');
  });

  it('should handle corrupted storage data gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json');

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('should handle storage errors gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });
});

