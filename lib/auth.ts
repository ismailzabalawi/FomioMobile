import * as Linking from 'expo-linking';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { v4 as uuidv4 } from 'uuid';
import { UserApiKeyManager } from '../shared/userApiKeyManager';
import { logger } from '../shared/logger';

const config = Constants.expoConfig?.extra || {};
const SITE = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info';

const API_KEY_STORAGE_KEY = 'disc_user_api_key';
const CLIENT_ID_STORAGE_KEY = 'disc_client_id';

export interface AuthState {
  authed: boolean;
  ready: boolean;
  user: any | null;
}

/**
 * Generate RSA keypair for this login session
 * Uses UserApiKeyManager which handles multiple crypto backends
 */
async function getRsaKeypair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await UserApiKeyManager.generateKeyPair();
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Decrypt payload from Discourse redirect
 */
async function decryptPayload(
  encryptedPayload: string,
  privateKey: string
): Promise<{ key: string; one_time_password?: string }> {
  // Store private key temporarily for decryption
  await UserApiKeyManager.storePrivateKey(privateKey);
  
  try {
    const decrypted = await UserApiKeyManager.decryptPayload(encryptedPayload);
    return decrypted;
  } finally {
    // Clean up temporary private key after decryption
    // (We don't need to keep it since we have the API key now)
    try {
      await SecureStore.deleteItemAsync('fomio_user_api_private_key');
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Sign in using Discourse User API Key delegated auth flow
 * 
 * Flow:
 * 1. Generate RSA keypair and client_id
 * 2. Open Discourse authorization page with expo-auth-session
 * 3. User authorizes → Discourse redirects to fomio://auth/callback?payload=...
 * 4. Decrypt payload → get API key and OTP
 * 5. Store API key in SecureStore
 * 6. Warm browser cookies using OTP
 */
export async function signIn(): Promise<boolean> {
  try {
    logger.info('Auth: Starting sign-in flow...');

    // Step 1: Generate RSA keypair and client_id
    const { publicKey, privateKey } = await getRsaKeypair();
    const clientId = uuidv4();
    const redirectUri = Linking.createURL('auth/callback');

    // Step 2: Build authorization URL
    const scopes = 'read,write,notifications,session_info,one_time_password';
    const authUrl = `${SITE}/user-api-key/new?` +
      `application_name=Fomio&` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `scopes=${encodeURIComponent(scopes)}&` +
      `public_key=${encodeURIComponent(publicKey)}&` +
      `auth_redirect=${encodeURIComponent(redirectUri)}`;

    logger.info('Auth: Opening authorization page...', {
      url: authUrl.replace(publicKey, '[PUBLIC_KEY]'),
      redirectUri,
    });

    // Step 3: Open authorization page using expo-auth-session
    // This uses ASWebAuthenticationSession on iOS and Chrome Custom Tabs on Android
    const result = await AuthSession.startAsync({
      authUrl,
      returnUrl: redirectUri,
    });

    if (result.type !== 'success' || !result.params?.payload) {
      if (result.type === 'cancel') {
        logger.info('Auth: User cancelled authorization');
        throw new Error('Authorization cancelled');
      }
      logger.error('Auth: Authorization failed', { type: result.type });
      throw new Error('Authorization failed. Please try again.');
    }

    const payload = result.params.payload as string;
    logger.info('Auth: Received authorization payload, decrypting...');

    // Step 4: Decrypt payload
    const { key, one_time_password } = await decryptPayload(payload, privateKey);

    if (!key) {
      throw new Error('Invalid payload: API key not found');
    }

    // Step 5: Store API key and client ID
    await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key);
    await SecureStore.setItemAsync(CLIENT_ID_STORAGE_KEY, clientId);

    logger.info('Auth: API key stored successfully');

    // Step 6: Warm browser cookies using OTP (optional but recommended)
    if (one_time_password) {
      try {
        logger.info('Auth: Warming browser cookies with OTP...');
        const otpUrl = `${SITE}/session/otp/${one_time_password}`;
        
        // Open OTP URL in browser to set logged-in cookie
        await AuthSession.startAsync({
          authUrl: otpUrl,
          returnUrl: redirectUri,
        });
        
        logger.info('Auth: Browser cookies warmed successfully');
      } catch (otpError) {
        // OTP warming is optional - log but don't fail
        logger.warn('Auth: OTP warming failed (non-critical)', otpError);
      }
    }

    logger.info('Auth: Sign-in completed successfully');
    return true;
  } catch (error: any) {
    logger.error('Auth: Sign-in failed', error);
    throw error;
  }
}

/**
 * Get authentication headers for API requests
 * Returns headers with User-Api-Key if available
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
  const clientId = await SecureStore.getItemAsync(CLIENT_ID_STORAGE_KEY);

  if (!key) {
    return {};
  }

  const headers: Record<string, string> = {
    'User-Api-Key': key,
  };

  if (clientId) {
    headers['User-Api-Client-Id'] = clientId;
  }

  return headers;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
  return !!key;
}

/**
 * Sign out and revoke API key
 */
export async function signOut(): Promise<void> {
  try {
    logger.info('Auth: Starting sign-out...');

    const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);

    if (key) {
      // Revoke API key on server
      try {
        const response = await fetch(`${SITE}/user-api-key/revoke`, {
          method: 'POST',
          headers: {
            'User-Api-Key': key,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          logger.info('Auth: API key revoked on server');
        } else {
          logger.warn('Auth: Failed to revoke API key on server', {
            status: response.status,
          });
        }
      } catch (error) {
        logger.warn('Auth: Error revoking API key (non-critical)', error);
      }
    }

    // Clear local storage
    await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
    await SecureStore.deleteItemAsync(CLIENT_ID_STORAGE_KEY);

    logger.info('Auth: Sign-out completed');
  } catch (error) {
    logger.error('Auth: Sign-out error', error);
    // Still clear local storage even if revocation fails
    try {
      await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(CLIENT_ID_STORAGE_KEY);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get stored API key (for compatibility with existing code)
 */
export async function getApiKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
}
