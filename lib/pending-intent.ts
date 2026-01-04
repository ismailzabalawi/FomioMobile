/**
 * Pending Intent Storage for Deep Link Replay
 * 
 * Stores the intended deep link destination when a user lands on
 * an auth-required route while logged out. After successful auth,
 * the intent is replayed exactly once.
 * 
 * Storage: AsyncStorage (persists if app killed during login)
 * TTL: 15 minutes (configurable)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/shared/logger';

const PENDING_INTENT_KEY = 'fomio_pending_intent';
const INTENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface PendingIntent {
  /** Original deep link URL (e.g., fomio://notifications) */
  url: string;
  /** Resolved Expo Router path (e.g., /(tabs)/notifications) */
  resolvedPath: string;
  /** Timestamp for TTL check */
  createdAt: number;
}

// In-memory cache for faster access
let cachedIntent: PendingIntent | null = null;

/**
 * Store a pending intent for replay after auth.
 * Replaces any existing intent.
 */
export async function storePendingIntent(intent: PendingIntent): Promise<void> {
  try {
    cachedIntent = intent;
    await AsyncStorage.setItem(PENDING_INTENT_KEY, JSON.stringify(intent));
    logger.info('Stored pending intent for replay after auth', {
      url: intent.url,
      resolvedPath: intent.resolvedPath,
    });
  } catch (error) {
    logger.error('Failed to store pending intent', error);
    // Still keep in-memory cache even if storage fails
  }
}

/**
 * Get the pending intent if it exists and is not expired.
 * Does NOT clear it — call clearPendingIntent() after using.
 */
export async function getPendingIntent(): Promise<PendingIntent | null> {
  try {
    // Check in-memory cache first
    if (cachedIntent) {
      if (isIntentValid(cachedIntent)) {
        return cachedIntent;
      } else {
        // Expired — clear it
        await clearPendingIntent();
        return null;
      }
    }

    // Load from storage
    const stored = await AsyncStorage.getItem(PENDING_INTENT_KEY);
    if (!stored) return null;

    const intent: PendingIntent = JSON.parse(stored);
    
    if (isIntentValid(intent)) {
      cachedIntent = intent;
      return intent;
    } else {
      // Expired — clear it
      await clearPendingIntent();
      return null;
    }
  } catch (error) {
    logger.error('Failed to get pending intent', error);
    return null;
  }
}

/**
 * Clear the pending intent. Call this BEFORE replaying to prevent loops.
 */
export async function clearPendingIntent(): Promise<void> {
  try {
    cachedIntent = null;
    await AsyncStorage.removeItem(PENDING_INTENT_KEY);
    logger.info('Cleared pending intent');
  } catch (error) {
    logger.error('Failed to clear pending intent', error);
    // Clear in-memory cache anyway
    cachedIntent = null;
  }
}

/**
 * Check if an intent is still valid (not expired).
 */
function isIntentValid(intent: PendingIntent): boolean {
  const age = Date.now() - intent.createdAt;
  return age < INTENT_TTL_MS;
}

/**
 * Check if there's a pending intent waiting to be replayed.
 * Quick check without loading full intent.
 */
export async function hasPendingIntent(): Promise<boolean> {
  const intent = await getPendingIntent();
  return intent !== null;
}

