import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { v4 as uuidv4 } from 'uuid';
import { generateRsaKeypair, decryptPayloadBase64ToUtf8, derivePublicKeyFromPrivate } from './crypto';
import { savePrivateKey, loadPrivateKey, saveUserApiKey, loadUserApiKey, saveClientId, loadClientId, clearAll } from './store';
import { authHeaders, signOut as authSignOut } from './auth';

// Complete web browser auth session
WebBrowser.maybeCompleteAuthSession();

const config = Constants.expoConfig?.extra || {};
const BASE_URL = config.DISCOURSE_BASE_URL || 'https://meta.fomio.app';
const APPLICATION_NAME = config.APPLICATION_NAME || 'Fomio';
const SCOPES = config.SCOPES || 'read,write,session,notifications';

function buildRedirectUri() {
  // Works in Expo Go, dev clients, and production
  return makeRedirectUri({
    preferLocalhost: true,
    native: 'fomio://auth',
  });
}

/**
 * Process authorization callback payload from Discourse redirect
 * This should be called from the deep link handler (auth/callback.tsx)
 * @param payload Base64-encoded encrypted payload from redirect URL
 * @returns Promise resolving to the user API key
 */
export async function processAuthorizationCallback(payload: string): Promise<string> {
  try {
    if (!payload) {
      throw new Error('No payload in redirect URL. Check Discourse redirect settings.');
    }

    // Load private key and client ID
    const privateKeyPem = await loadPrivateKey();
    if (!privateKeyPem) {
      throw new Error('Private key not found. Please restart authorization.');
    }

    const clientId = await loadClientId();
    if (!clientId) {
      throw new Error('Client ID not found. Please restart authorization.');
    }
    
    // Decrypt payload
    const decrypted = decryptPayloadBase64ToUtf8(payload, privateKeyPem);
    const parsed = JSON.parse(decrypted);
    
    if (!parsed.key) {
      throw new Error('Invalid payload: missing API key');
    }
    
    // Save user API key
    await saveUserApiKey(parsed.key);
    console.log('✅ User API Key saved successfully');
    
    return parsed.key;
  } catch (error) {
    console.error('❌ Authorization callback processing error:', error);
    throw error;
  }
}

/**
 * Authorize with Discourse using User API Key flow
 * 
 * NOTE: This function is deprecated. The authorization flow now uses deep linking
 * and must be initiated through the sign-in screen (/(auth)/signin).
 * 
 * This function checks for an existing valid API key, but cannot complete
 * new authorizations synchronously. Use signIn() from lib/auth.ts instead.
 * 
 * @returns Promise resolving to existing API key if valid, otherwise throws error
 * @deprecated Use signIn() from lib/auth.ts for new authorizations
 */
export async function authorizeWithDiscourse(): Promise<string> {
  try {
    // Check if we already have an API key
    const existingKey = await loadUserApiKey();
    if (existingKey) {
      // Verify it's still valid by trying to make an API call
      try {
        const response = await apiFetch('/session/current.json');
        if (response.ok) {
          console.log('✅ Existing API key is valid');
          return existingKey;
        } else {
          throw new Error('API key invalid');
        }
      } catch (error) {
        console.log('⚠️ Existing API key invalid, re-authorizing...');
        // Clear invalid key
        await clearAll();
      }
    }
    
    // If no valid key exists, throw error directing to new flow
    throw new Error(
      'Authorization must be completed through the sign-in screen. ' +
      'Please navigate to /(auth)/signin to complete authorization. ' +
      'The new flow uses deep linking and cannot be completed synchronously.'
    );
  } catch (error) {
    console.error('❌ Authorization error:', error);
    throw error;
  }
}

/**
 * Make authenticated API request to Discourse
 * Uses the new auth system from lib/auth.ts
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  // Get auth headers from the new auth system
  const authHeadersObj = await authHeaders();
  
  if (!authHeadersObj['User-Api-Key']) {
    throw new Error('Not authenticated. Please sign in.');
  }
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...authHeadersObj,
    ...(init?.headers || {}),
  };
  
  const url = `${BASE_URL}${path}`;
  console.log(`🌐 API Request: ${init?.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...init,
    headers,
  });
  
  if (response.status === 401 || response.status === 403) {
    // Don't clear credentials here - let the caller handle it
    // This prevents clearing during authorization check
    throw new Error(response.status === 401 
      ? 'Authentication failed. Please sign in again.'
      : 'Insufficient permissions. Check your API key scopes.');
  }
  
  return response;
}

/**
 * Get current session/user info
 */
export async function getSession(): Promise<any> {
  const response = await apiFetch('/session/current.json');
  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get latest topics
 */
export async function getLatest(): Promise<any> {
  const response = await apiFetch('/latest.json');
  if (!response.ok) {
    throw new Error(`Failed to get latest: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Search topics
 */
export async function searchTopics(term: string): Promise<any> {
  const response = await apiFetch(`/search.json?q=${encodeURIComponent(term)}`);
  if (!response.ok) {
    throw new Error(`Failed to search: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get notifications
 */
export async function getNotifications(): Promise<any> {
  const response = await apiFetch('/notifications.json');
  if (!response.ok) {
    throw new Error(`Failed to get notifications: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a new topic/post
 */
export async function createTopic(data: {
  title: string;
  raw: string;
  categoryId?: number;
}): Promise<any> {
  const response = await apiFetch('/posts.json', {
    method: 'POST',
    body: JSON.stringify({
      title: data.title,
      raw: data.raw,
      ...(data.categoryId ? { category: data.categoryId } : {}),
      archetype: 'regular',
    }),
  });

  if (!response.ok) {
    // Prefer text first; Discourse may return HTML or JSON depending on error
    const text = await response.text().catch(() => '');
    let message = text;
    try {
      const j = JSON.parse(text);
      message = (j && (j.error || j.errors?.join(', '))) || message;
    } catch {}
    throw new Error(message || `Failed to create topic: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Revoke User API Key
 * Uses the new auth system from lib/auth.ts
 */
export async function revokeKey(): Promise<void> {
  try {
    await authSignOut();
  } catch (error) {
    console.error('Failed to revoke key:', error);
    throw error;
  }
}
