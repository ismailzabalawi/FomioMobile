import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { WebBrowserRedirectResult } from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { UserApiKeyManager } from '../shared/userApiKeyManager';
import { emitAuthEvent } from '../shared/auth-events';
import { logger } from '../shared/logger';

// Complete auth session when browser closes
WebBrowser.maybeCompleteAuthSession();

const config = Constants.expoConfig?.extra || {};
const SITE = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info';
const STORAGE_KEY = 'disc_user_api_key';
const CLIENT_ID_KEY = 'disc_client_id';

/**
 * Generate RSA keypair for authentication
 * Uses UserApiKeyManager which handles multiple crypto backends
 */
async function getRsaKeypair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    // Check if we have a stored private key
    const storedPrivateKey = await UserApiKeyManager.getPrivateKey();
    const storedPublicKey = await UserApiKeyManager.getPublicKey();
    
    if (storedPrivateKey && storedPublicKey) {
      return {
        publicKey: storedPublicKey,
        privateKey: storedPrivateKey,
      };
    }
    
    // Generate new keypair
    const keyPair = await UserApiKeyManager.generateKeyPair();
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  } catch (error) {
    logger.error('Failed to get RSA keypair', error);
    throw new Error('Failed to generate encryption keys. Please try again.');
  }
}

/**
 * Decrypt payload from Discourse
 */
async function decryptPayload(encryptedPayload: string, privateKey: string): Promise<{ key: string; one_time_password?: string }> {
  try {
    // Store private key temporarily for decryption
    await UserApiKeyManager.storePrivateKey(privateKey);
    const decrypted = await UserApiKeyManager.decryptPayload(encryptedPayload);
    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt payload', error);
    throw new Error('Failed to decrypt authorization data. Please try again.');
  }
}

/**
 * Sign in using Discourse delegated authentication
 * Follows Discourse User API Keys specification
 */
export async function signIn(): Promise<boolean> {
  try {
    logger.info('Starting Discourse delegated authentication...');
    
    // Generate RSA keypair
    const { publicKey, privateKey } = await getRsaKeypair();
    
    // Generate or get client ID
    const clientId = await UserApiKeyManager.getOrGenerateClientId();
    
    // Create redirect URI - MUST start with / for proper routing on both iOS and Android
    const redirectUri = Linking.createURL('/auth/callback');
    
    // Build authorization URL
    const scopes = 'read,write,notifications,session_info,one_time_password';
    let nonce = await UserApiKeyManager.getNonce();
    if (!nonce) {
      nonce = await UserApiKeyManager.generateNonce();
      await UserApiKeyManager.storeNonce(nonce);
    }
    const params = new URLSearchParams({
      application_name: 'Fomio',
      client_id: clientId,
      scopes: scopes,
      public_key: publicKey,
      auth_redirect: redirectUri,
      nonce,
    });
    
    const authUrl = `${SITE}/user-api-key/new?${params.toString()}`;
    
    logger.info('Opening authorization URL', {
      url: authUrl.replace(publicKey, '[PUBLIC_KEY]'),
      redirectUri,
    });
    
    // Use WebBrowser to open the auth flow
    // This uses ASWebAuthenticationSession on iOS and Chrome Custom Tabs on Android
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    
    if (result.type !== 'success') {
      if (result.type === 'cancel') {
        logger.info('User cancelled authorization');
        throw new Error('Authorization cancelled');
      }
      logger.error('Authorization failed', { type: result.type });
      throw new Error('Authorization failed. Please try again.');
    }
    
    // Extract payload from the redirect URL
    // Parse the URL manually for React Native compatibility
    const redirectResult = result as WebBrowserRedirectResult;
    const urlString = redirectResult.url ?? '';
    const payloadMatch = urlString.match(/[?&]payload=([^&]+)/);
    const payload = payloadMatch ? decodeURIComponent(payloadMatch[1]) : null;
    
    if (!payload) {
      logger.error('No payload in redirect URL', { url: urlString });
      throw new Error('Invalid authorization response. Please try again.');
    }
    logger.info('Received authorization payload, decrypting...');
    
    // Decrypt payload
    const { key, one_time_password } = await decryptPayload(payload, privateKey);
    
    if (!key) {
      throw new Error('Invalid authorization response: API key not found');
    }
    
    // Store API key securely
    await SecureStore.setItemAsync(STORAGE_KEY, key);
    await SecureStore.setItemAsync(CLIENT_ID_KEY, clientId);

    await UserApiKeyManager.storeApiKey({
      key,
      clientId,
      oneTimePassword: one_time_password,
      createdAt: Date.now(),
    });

    if (one_time_password) {
      await UserApiKeyManager.storeOneTimePassword(one_time_password);
    }
    
    logger.info('API key stored successfully');
    
    // Warm browser cookies with OTP if provided (recommended)
    if (one_time_password) {
      try {
        logger.info('Warming browser cookies with OTP...');
        const otpUrl = `${SITE}/session/otp/${one_time_password}`;
        
        // Open OTP URL in browser to set logged-in cookie
        await WebBrowser.openAuthSessionAsync(otpUrl, redirectUri);
        
        logger.info('OTP cookie warming completed');
      } catch (otpError) {
        // OTP warming is optional, log but don't fail
        logger.warn('OTP cookie warming failed (non-critical)', otpError);
      }
    }

    emitAuthEvent('auth:signed-in');

    return true;
  } catch (error: any) {
    logger.error('Sign in failed', error);
    throw error;
  }
}

/**
 * Get authentication headers for API requests
 * Returns headers with User-Api-Key if available
 */
export async function authHeaders(): Promise<Record<string, string>> {
  try {
    let key: string | null = null;
    let clientId: string | null = null;

    const apiKeyData = await UserApiKeyManager.getApiKey();
    if (apiKeyData?.key) {
      key = apiKeyData.key;
      clientId = apiKeyData.clientId;
    }

    if (!key) {
      key = await SecureStore.getItemAsync(STORAGE_KEY);
    }

    if (!clientId) {
      clientId = await SecureStore.getItemAsync(CLIENT_ID_KEY);
    }
    
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
  } catch (error) {
    logger.error('Failed to get auth headers', error);
    return {};
  }
}

/**
 * Check if user has a valid API key
 */
export async function hasUserApiKey(): Promise<boolean> {
  try {
    const apiKeyData = await UserApiKeyManager.getApiKey();
    if (apiKeyData?.key) {
      return true;
    }

    const key = await SecureStore.getItemAsync(STORAGE_KEY);
    return !!key;
  } catch (error) {
    logger.error('Failed to check API key', error);
    return false;
  }
}

/**
 * Sign out and revoke API key
 */
export async function signOut(): Promise<void> {
  try {
    logger.info('Signing out...');
    
    const key = await SecureStore.getItemAsync(STORAGE_KEY);
    
    if (key) {
      try {
        // Revoke API key on server
        const response = await fetch(`${SITE}/user-api-key/revoke`, {
          method: 'POST',
          headers: {
            'User-Api-Key': key,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          logger.warn('API key revocation failed', {
            status: response.status,
            statusText: response.statusText,
          });
        } else {
          logger.info('API key revoked successfully');
        }
      } catch (revokeError) {
        logger.warn('Failed to revoke API key (non-critical)', revokeError);
      }
    }
    
    // Clear local storage
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    await SecureStore.deleteItemAsync(CLIENT_ID_KEY);
    
    // Clear keypair (optional, but good for security)
    await UserApiKeyManager.clearApiKey();
    
    logger.info('Sign out completed');
  } catch (error) {
    logger.error('Sign out failed', error);
    // Still clear local storage even if revocation fails
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      await SecureStore.deleteItemAsync(CLIENT_ID_KEY);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Check API version from Discourse instance
 * HEAD request to /user-api-key/new returns Auth-Api-Version header
 */
export async function checkApiVersion(): Promise<number | null> {
  try {
    const response = await fetch(`${SITE}/user-api-key/new`, {
      method: 'HEAD',
    });
    
    const versionHeader = response.headers.get('Auth-Api-Version');
    if (versionHeader) {
      const version = parseInt(versionHeader, 10);
      logger.info('Discourse API version detected', { version });
      return version;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to check API version', error);
    return null;
  }
}
