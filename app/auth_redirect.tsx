import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { parseURLParameters } from '@/lib/auth-utils';

export default function AuthRedirectScreen(): React.ReactElement | null {
  const params = useLocalSearchParams();

  useEffect(() => {
    const normalizePayload = (value: string): string => value.replace(/ /g, '+');
    const payloadParam = typeof params.payload === 'string'
      ? params.payload
      : Array.isArray(params.payload) && typeof params.payload[0] === 'string'
        ? params.payload[0]
        : null;
    const urlParam = typeof params.url === 'string' ? params.url : null;

    let payload = payloadParam;
    if (!payload && urlParam) {
      const parsed = parseURLParameters(urlParam);
      payload = parsed.payload || null;
    }

    if (payload) {
      const normalized = normalizePayload(payload);
      router.replace(`/auth/callback?payload=${encodeURIComponent(normalized)}`);
    } else {
      router.replace('/(auth)/signin');
    }
  }, [params.payload, params.url]);

  return null;
}
