import { useState, useEffect, useCallback } from 'react';
import { authorizeWithDiscourse, revokeKey, getSession } from './discourse';
import { loadUserApiKey } from './store';

export interface AuthState {
  authed: boolean;
  ready: boolean;
  user: any | null;
}

/**
 * Authentication hook for Discourse User API Key
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authed: false,
    ready: false,
    user: null,
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const apiKey = await loadUserApiKey();
      if (apiKey) {
        // Try to get session to verify key is valid
        try {
          const session = await getSession();
          setState({
            authed: true,
            ready: true,
            user: session.user || null,
          });
        } catch (error) {
          // Key exists but invalid
          console.log('⚠️ API key exists but invalid, clearing...');
          setState({
            authed: false,
            ready: true,
            user: null,
          });
        }
      } else {
        setState({
          authed: false,
          ready: true,
          user: null,
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setState({
        authed: false,
        ready: true,
        user: null,
      });
    }
  }, []);

  const connect = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, ready: false }));
      const apiKey = await authorizeWithDiscourse();
      
      // Get user session after successful auth
      const session = await getSession();
      
      setState({
        authed: true,
        ready: true,
        user: session.user || null,
      });
    } catch (error) {
      console.error('Connect error:', error);
      setState(prev => ({
        ...prev,
        ready: true,
        authed: false,
      }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await revokeKey();
      setState({
        authed: false,
        ready: true,
        user: null,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local state even if revoke fails
      setState({
        authed: false,
        ready: true,
        user: null,
      });
    }
  }, []);

  return {
    authed: state.authed,
    ready: state.ready,
    user: state.user,
    connect,
    signOut,
    refresh: checkAuth,
  };
}
