/**
 * Intent Replay Hook
 * 
 * Listens for auth success and replays any pending deep link intent.
 * Should be used in the root layout to ensure it runs globally.
 */

import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { onAuthEvent } from '../auth-events';
import { getPendingIntent, clearPendingIntent } from '@/lib/pending-intent';
import { logger } from '../logger';

/**
 * Hook to replay pending deep link intent after successful auth.
 * 
 * Call this once in your root layout. It will:
 * 1. Listen for 'auth:signed-in' events
 * 2. Check for pending intent
 * 3. Navigate to the intended destination (using replace for clean back stack)
 */
export function useIntentReplay(): void {
  const hasReplayedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthEvent(async (event) => {
      // Only replay on successful sign-in, not refresh
      if (event !== 'auth:signed-in') return;

      // Prevent double replay in case of rapid events
      if (hasReplayedRef.current) return;

      try {
        const intent = await getPendingIntent();
        
        if (!intent) {
          logger.info('No pending intent to replay after auth');
          return;
        }

        // CRITICAL: Clear BEFORE navigating to prevent loops
        hasReplayedRef.current = true;
        await clearPendingIntent();

        logger.info('Replaying pending intent after auth', {
          url: intent.url,
          resolvedPath: intent.resolvedPath,
        });

        // Use replace so back doesn't go to auth screen
        // Small delay to let auth state propagate
        setTimeout(() => {
          router.replace(intent.resolvedPath as any);
          
          // Reset flag after navigation completes
          setTimeout(() => {
            hasReplayedRef.current = false;
          }, 1000);
        }, 100);

      } catch (error) {
        logger.error('Failed to replay pending intent', error);
        hasReplayedRef.current = false;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
}

