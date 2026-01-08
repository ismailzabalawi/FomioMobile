import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Redirect shim for activation links that arrive as /u/activate-account/{token}
 * Routes to the public activation screen in the auth stack.
 */
export default function ActivateAccountRedirect(): React.ReactElement | null {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : undefined;

  useEffect(() => {
    if (token) {
      router.replace(`/(auth)/activate-account?token=${encodeURIComponent(token)}` as any);
    } else {
      router.replace('/(auth)/activate-account' as any);
    }
  }, [token]);

  return null;
}
