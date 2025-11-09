import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { v4 as uuidv4 } from 'uuid';
import { generateRsaKeypair, decryptPayloadBase64ToUtf8 } from './crypto';
import forge from 'node-forge';
import { savePrivateKey, loadPrivateKey, saveUserApiKey, loadUserApiKey, saveClientId, loadClientId, clearAll } from './store';

// Complete web browser auth session
WebBrowser.maybeCompleteAuthSession();

const config = Constants.expoConfig?.extra || {};
const BASE_URL = config.DISCOURSE_BASE_URL || 'https://meta.techrebels.info';
const APPLICATION_NAME = config.APPLICATION_NAME || 'Fomio Mobile';
const SCOPES = config.SCOPES || 'read,write,session,notifications';

/**
 * Authorize with Discourse using User API Key flow
 * @returns Promise resolving to the user API key
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
        // Clear invalid key and continue with authorization
        await clearAll();
      }
    }
    
    // Ensure private key exists (generate if needed)
    let privateKeyPem = await loadPrivateKey();
    let publicKeyPem: string;
    
    if (!privateKeyPem) {
      console.log('🔐 Generating new RSA keypair...');
      const keypair = generateRsaKeypair(2048);
      privateKeyPem = keypair.privateKeyPem;
      publicKeyPem = keypair.publicKeyPem;
      await savePrivateKey(privateKeyPem);
    } else {
      // Extract public key from private key
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      publicKeyPem = forge.pki.publicKeyToPem(privateKey);
    }
    
    // Create client ID and nonce
    const clientId = uuidv4();
    const nonce = uuidv4();
    
    await saveClientId(clientId);
    
    // Build authorization URL
    const redirectUri = Linking.createURL('/');
    const authUrl = `${BASE_URL}/user-api-key/new?` +
      `application_name=${encodeURIComponent(APPLICATION_NAME)}&` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `scopes=${encodeURIComponent(SCOPES)}&` +
      `public_key=${encodeURIComponent(publicKeyPem)}&` +
      `auth_redirect=${encodeURIComponent(redirectUri)}&` +
      `nonce=${encodeURIComponent(nonce)}`;
    
    console.log('🔐 Starting Discourse authorization...');
    
    // Start auth session
    const result = await AuthSession.startAsync({
      authUrl,
      returnUrl: redirectUri,
    });
    
    if (result.type === 'success' && result.url) {
      // Extract payload from redirect URL
      const url = new URL(result.url);
      const payload = url.searchParams.get('payload');
      
      if (!payload) {
        throw new Error('No payload in redirect URL. Check Discourse redirect settings.');
      }
      
      // Decrypt payload
      const decrypted = decryptPayloadBase64ToUtf8(payload, privateKeyPem);
      const parsed = JSON.parse(decrypted);
      
      if (!parsed.key) {
        throw new Error('Invalid payload: missing API key');
      }
      
      // Verify nonce matches
      if (parsed.nonce !== nonce) {
        throw new Error('Nonce mismatch. Possible replay attack.');
      }
      
      // Save user API key
      await saveUserApiKey(parsed.key);
      console.log('✅ User API Key saved successfully');
      
      return parsed.key;
    } else if (result.type === 'cancel') {
      throw new Error('Authorization cancelled by user');
    } else if (result.type === 'error') {
      throw new Error(result.error?.message || 'Authorization failed');
    } else {
      throw new Error('Unknown authorization result');
    }
  } catch (error) {
    console.error('❌ Authorization error:', error);
    throw error;
  }
}

/**
 * Make authenticated API request to Discourse
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const userApiKey = await loadUserApiKey();
  const clientId = await loadClientId();
  
  if (!userApiKey) {
    throw new Error('Not authenticated. Please sign in.');
  }
  
  const headers: HeadersInit = {
    'User-Api-Key': userApiKey,
    'User-Api-Client-Id': clientId || APPLICATION_NAME,
    'Content-Type': 'application/json',
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
  const response = await apiFetch('/t.json', {
    method: 'POST',
    body: JSON.stringify({
      title: data.title,
      raw: data.raw,
      category: data.categoryId,
      archetype: 'regular',
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to create topic: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Revoke User API Key
 */
export async function revokeKey(): Promise<void> {
  try {
    await apiFetch('/user-api-key/revoke', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Failed to revoke key on server:', error);
    // Continue with local cleanup even if server call fails
  }
  
  // Always clear local storage
  await clearAll();
}
