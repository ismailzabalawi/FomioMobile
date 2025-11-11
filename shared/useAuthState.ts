import { useState, useEffect } from 'react';
import { hasUserApiKey } from '../../lib/auth';
import { discourseApi } from '../discourseApi';

/**
 * Simple auth state hook for route guards
 * Returns ready state and signedIn status
 */
export function useAuthState() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const hasKey = await hasUserApiKey();
      
      if (!hasKey) {
        setReady(true);
        setSignedIn(false);
        return;
      }

      // Verify key is valid by making a test request
      const userResponse = await discourseApi.getCurrentUser();
      const isValid = userResponse.success && !!userResponse.data;
      
      setReady(true);
      setSignedIn(isValid);
    } catch (error) {
      console.error('Auth check error:', error);
      setReady(true);
      setSignedIn(false);
    }
  }

  return { ready, signedIn };
}
