import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { parseURLParameters } from '@/lib/auth-utils';

export default function AuthRedirectScreen(): React.ReactElement | null {
  const params = useLocalSearchParams();

  useEffect(() => {
    const payloadParam = typeof params.payload === 'string' ? params.payload : null;
    const urlParam = typeof params.url === 'string' ? params.url : null;

    let payload = payloadParam;
    if (!payload && urlParam) {
      const parsed = parseURLParameters(urlParam);
      payload = parsed.payload || null;
    }

    if (payload) {
      router.replace(`/auth/callback?payload=${encodeURIComponent(payload)}`);
    } else {
      router.replace('/(auth)/signin');
    }
  }, [params.payload, params.url]);

  return null;
}
