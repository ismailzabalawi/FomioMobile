import * as WebBrowser from 'expo-web-browser';
import type { WebBrowserRedirectResult } from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { UserApiKeyManager } from '../shared/userApiKeyManager';
import { emitAuthEvent } from '../shared/auth-events';
import { logger } from '../shared/logger';
import { parseURLParameters } from './auth-utils';
import { setOnboardingCompleted } from '../shared/onboardingStorage';

// Complete auth session when browser closes
WebBrowser.maybeCompleteAuthSession();

const config = Constants.expoConfig?.extra || {};
const SITE = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.fomio.app';
const PUSH_URL = config.DISCOURSE_PUSH_URL || process.env.EXPO_PUBLIC_DISCOURSE_PUSH_URL;

/**
 * Build redirect URI using Discourse's official pattern
 * 
 * iOS: Uses makeRedirectUri for proper ASWebAuthenticationSession compatibility
 * Android: Uses fixed URI that matches intent filter in app.json
 * 
 * The redirect URI must match:
 * 1. The intent filter in app.json (scheme: fomio, host: auth_redirect)
 * 2. What Discourse sends back after authorization
 */
function getRedirectUri(): string {
  // Check if environment variable is set (allows configuration via .env)
  const envRedirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_SCHEME;
  if (envRedirect) {
    logger.info('Using redirect URI from EXPO_PUBLIC_AUTH_REDIRECT_SCHEME', { redirectUri: envRedirect });
    return envRedirect;
  }
  
  // iOS: Use makeRedirectUri for proper ASWebAuthenticationSession compatibility
  // This ensures the redirect is properly intercepted by the WebBrowser API
  if (Platform.OS === 'ios') {
    const redirectUri = makeRedirectUri({
      preferLocalhost: false,
      native: 'fomio://auth_redirect',
    });
    logger.info('iOS: Using makeRedirectUri', { redirectUri });
    return redirectUri;
  }
  
  // Android: Use fixed URI that matches intent filter in app.json
  // DO NOT use path segments like /callback - Android handles host-based schemes better
  return 'fomio://auth_redirect';
}

/**
 * Decrypt payload from Discourse
 */
async function decryptPayload(encryptedPayload: string, privateKey: string): Promise<{ key: string; one_time_password?: string; nonce?: string }> {
  try {
    logger.info('Decrypting payload...', { 
      payloadLength: encryptedPayload?.length,
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey?.length,
    });
    
    // Store private key temporarily for decryption
    await UserApiKeyManager.storePrivateKey(privateKey);
    logger.info('Private key stored, attempting decryption...');
    
    const decrypted = await UserApiKeyManager.decryptPayload(encryptedPayload);
    logger.info('Decryption successful', { hasKey: !!decrypted?.key });
    return decrypted;
  } catch (error: any) {
    // Handle null errors gracefully - crypto libraries sometimes throw null
    const errorMessage = error?.message || (error === null ? 'Null error from crypto operation' : String(error));
    logger.error('Failed to decrypt payload', { 
      errorMessage,
      errorType: error === null ? 'null' : typeof error,
      error,
    });
    throw new Error(`Failed to decrypt authorization data: ${errorMessage}. Please try again.`);
  }
}

/**
 * Sign in using Discourse delegated authentication
 * Follows Discourse User API Keys specification
 * 
 * Uses WebBrowser.openAuthSessionAsync for BOTH platforms:
 * - iOS: ASWebAuthenticationSession
 * - Android: Chrome Custom Tabs
 * 
 * This is the OAuth best practice approach that provides:
 * - Better security (app can't inspect credentials/cookies)
 * - Password manager / passkeys compatibility
 * - Consistent experience across platforms
 */
export async function signIn(): Promise<boolean> {
  try {
    logger.info('Starting Discourse delegated authentication...', { platform: Platform.OS });
    
    // ALWAYS generate fresh RSA keypair for each auth attempt
    // This prevents key mismatch issues from stale/corrupted stored keys
    const keyPair = await UserApiKeyManager.generateKeyPair();
    const publicKey = keyPair.publicKey;
    const privateKey = keyPair.privateKey;
    
    // Persist keys so callback can decrypt payload
    await UserApiKeyManager.storePrivateKey(privateKey);
    await UserApiKeyManager.storePublicKey(publicKey);
    
    // Generate or get client ID
    const clientId = await UserApiKeyManager.getOrGenerateClientId();
    
    // Create redirect URI
    const redirectUri = getRedirectUri();
    
    logger.info('Auth setup complete', {
      redirectUri,
      platform: Platform.OS,
    });
    
    // Build authorization URL
    const scopes = 'read,write,notifications,session_info,one_time_password';
    
    // ALWAYS generate fresh nonce for each auth attempt
    const nonce = await UserApiKeyManager.generateNonce();
    await UserApiKeyManager.storeNonce(nonce);
    
    const params = new URLSearchParams({
      application_name: 'Fomio',
      client_id: clientId,
      scopes: scopes,
      public_key: publicKey,
      auth_redirect: redirectUri,
      nonce,
      discourse_app: '1',
    });
    if (PUSH_URL) {
      params.append('push_url', PUSH_URL);
    }
    
    const authUrl = `${SITE}/user-api-key/new?${params.toString()}`;
    
    logger.info('Opening authorization URL via system browser...', {
      platform: Platform.OS,
    });
    
    // UNIFIED APPROACH: Use WebBrowser.openAuthSessionAsync for both platforms
    // - iOS: Uses ASWebAuthenticationSession
    // - Android: Uses Chrome Custom Tabs
    let result;
    try {
      // Try to dismiss any existing browser session first (iOS fix)
      try {
        await WebBrowser.dismissBrowser();
      } catch {
        // Ignore - may not have been open
      }
      
      result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    } catch (browserError: any) {
      // Handle "Another web browser is already open" error
      const errorMessage = browserError?.message || String(browserError || 'Unknown browser error');
      if (errorMessage.toLowerCase().includes('another web browser') || 
          errorMessage.toLowerCase().includes('already open')) {
        logger.warn('Browser session conflict, user may need to retry', { errorMessage });
        throw new Error('Please close any open browser windows and try again.');
      }
      // Re-throw other browser errors
      throw new Error(errorMessage || 'Failed to open browser. Please try again.');
    }
    
    if (result.type !== 'success') {
      // Handle user-initiated cancellations (cancel/dismiss) as info, not errors
      if (result.type === 'cancel' || result.type === 'dismiss') {
        logger.info('User cancelled authorization', { type: result.type });
        throw new Error('Authorization cancelled');
      }
      // Only log as error for actual failures (locked, etc.)
      logger.error('Authorization failed', { type: result.type });
      throw new Error('Authorization failed. Please try again.');
    }
    
    // Extract payload from the redirect URL
    const redirectResult = result as WebBrowserRedirectResult;
    const urlString = redirectResult.url ?? '';
    const urlParams = parseURLParameters(urlString);
    const payload = urlParams.payload || null;
    
    if (!payload) {
      logger.error('No payload in redirect URL', { url: urlString.substring(0, 100) });
      throw new Error('Invalid authorization response. Please try again.');
    }
    
    logger.info('Received authorization payload, decrypting...');
    
    // Decrypt payload
    const { key, one_time_password, nonce: decryptedNonce } = await decryptPayload(payload, privateKey);
    
    if (!key) {
      throw new Error('Invalid authorization response: API key not found');
    }
    
    // Verify nonce matches stored nonce (security check to prevent replay attacks)
    const storedNonce = await UserApiKeyManager.getNonce();
    if (decryptedNonce && storedNonce) {
      if (decryptedNonce !== storedNonce) {
        logger.error('Nonce mismatch - possible replay attack');
        throw new Error('Security verification failed. Please try again.');
      }
      logger.info('Nonce verification successful');
    }
    
    // Clear nonce after successful verification (prevents reuse)
    await UserApiKeyManager.clearNonce();
    
    // Get username from API after storing the key temporarily
    let username: string | undefined;
    try {
      // Temporarily store key so API call works
      await SecureStore.setItemAsync("fomio_user_api_key", key);
      
      const discourseApi = require('../shared/discourseApi').discourseApi;
      const userResponse = await discourseApi.getCurrentUser();
      if (userResponse.success && userResponse.data?.username) {
        username = userResponse.data.username;
        logger.info('Username retrieved during sign in', { username });
      }
    } catch (error) {
      logger.warn('Failed to get username during sign in (non-critical)', error);
    }

    // Store complete auth using unified storage
    await UserApiKeyManager.storeCompleteAuth(key, username, clientId, one_time_password);
    
    logger.info('API key stored successfully');
    
    // Warm browser cookies with OTP if provided (recommended)
    if (one_time_password) {
      try {
        logger.info('Warming browser cookies with OTP...');
        const otpUrl = `${SITE}/session/otp/${one_time_password}`;
        await WebBrowser.openBrowserAsync(otpUrl);
        logger.info('OTP cookie warming completed');
      } catch (otpError) {
        logger.warn('OTP cookie warming failed (non-critical)', otpError);
      }
    }

    emitAuthEvent('auth:signed-in');
    await setOnboardingCompleted();

    return true;
  } catch (error: any) {
    // Handle null/undefined errors gracefully
    if (!error) {
      logger.error('Sign in failed', new Error('Unknown error (null/undefined)'));
      throw new Error('Sign in failed. Please try again.');
    }

    // Don't log cancellations as errors - they're expected user actions
    const isCancellation = error?.message?.toLowerCase().includes('cancel') || 
                          error?.message?.toLowerCase().includes('cancelled');
    if (isCancellation) {
      // Cancellation already logged as info above, just re-throw
      throw error;
    }
    
    // Ensure error is a proper Error object before logging
    const errorToLog = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
    logger.error('Sign in failed', errorToLog);
    throw errorToLog;
  }
}

/**
 * Get authentication headers for API requests
 * Returns headers with User-Api-Key and Api-Username if available
 * Api-Username is required by Discourse API for write operations
 * 
 * Uses UserApiKeyManager.getAuthCredentials() as the single source of truth.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const credentials = await UserApiKeyManager.getAuthCredentials();

    if (!credentials?.key) {
      logger.debug('authHeaders: No API key available');
      return {};
    }

    const headers: Record<string, string> = {
      "User-Api-Key": credentials.key,
      ...(credentials.clientId ? { "User-Api-Client-Id": credentials.clientId } : {}),
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    if (credentials.username) {
      headers["Api-Username"] = credentials.username;
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
    return await UserApiKeyManager.isAuthenticated();
  } catch (error) {
    logger.error('Failed to check API key', error);
    return false;
  }
}

/**
 * Process the encrypted auth payload from Discourse callback
 * This decrypts the payload, verifies the nonce, and stores the API key
 * 
 * @param encryptedPayload - The encrypted payload from Discourse callback (base64 encoded)
 * @returns Object with success status and optional user data or error message
 */
export async function processAuthPayload(encryptedPayload: string): Promise<{
  success: boolean;
  username?: string;
  error?: string;
}> {
  try {
    logger.info('processAuthPayload: Starting payload processing...');
    
    // Normalize the payload (replace spaces with +, URL decode if needed)
    let payload = encryptedPayload.replace(/ /g, '+');
    
    // URL decode if encoded
    try {
      payload = decodeURIComponent(payload);
    } catch {
      // Already decoded
    }
    
    // Decrypt payload
    logger.info('processAuthPayload: Decrypting payload...');
    const decrypted = await UserApiKeyManager.decryptPayload(payload);
    
    if (!decrypted.key) {
      throw new Error('Invalid payload: API key not found after decryption');
    }
    
    // Verify nonce matches stored nonce (security check to prevent replay attacks)
    const storedNonce = await UserApiKeyManager.getNonce();
    if (decrypted.nonce && storedNonce) {
      if (decrypted.nonce !== storedNonce) {
        logger.error('processAuthPayload: Nonce mismatch - possible replay attack', {
          storedNonce: storedNonce.substring(0, 10) + '...',
          decryptedNonce: decrypted.nonce.substring(0, 10) + '...',
        });
        throw new Error('Security verification failed. Please try again.');
      }
      logger.info('processAuthPayload: Nonce verification successful');
    } else if (decrypted.nonce || storedNonce) {
      // If only one is present, log warning but don't fail (for backward compatibility)
      logger.warn('processAuthPayload: Partial nonce data - one missing', {
        hasDecryptedNonce: !!decrypted.nonce,
        hasStoredNonce: !!storedNonce,
      });
    }
    
    // Clear nonce after successful verification (prevents reuse)
    await UserApiKeyManager.clearNonce();
    
    // Store one-time password if provided
    if (decrypted.one_time_password) {
      await UserApiKeyManager.storeOneTimePassword(decrypted.one_time_password);
    }
    
    // Temporarily store key so API call works
    await SecureStore.setItemAsync("fomio_user_api_key", decrypted.key);
    
    // Fetch username for API operations that require it
    let username: string | undefined;
    try {
      // Dynamic import to avoid circular dependency
      const { discourseApi } = await import('../shared/discourseApi');
      const userResponse = await discourseApi.getCurrentUser();
      if (userResponse.success && userResponse.data?.username) {
        username = userResponse.data.username;
        logger.info('processAuthPayload: Username retrieved', { username });
      }
    } catch (error) {
      logger.warn('processAuthPayload: Failed to fetch username (non-critical)', error);
      // Don't fail auth if username fetch fails - we can get it later
    }
    
    // Store complete auth using unified storage
    const clientId = await UserApiKeyManager.getOrGenerateClientId();
    await UserApiKeyManager.storeCompleteAuth(
      decrypted.key,
      username,
      clientId,
      decrypted.one_time_password
    );
    
    // CRITICAL: Add a small delay to ensure SecureStore has flushed on Android
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the key was stored correctly
    const verifyCredentials = await UserApiKeyManager.getAuthCredentials();
    if (!verifyCredentials?.key) {
      logger.warn('processAuthPayload: Key not immediately available, retrying...');
      await new Promise(resolve => setTimeout(resolve, 300));
      const retryCredentials = await UserApiKeyManager.getAuthCredentials();
      if (!retryCredentials?.key) {
        throw new Error('API key storage verification failed');
      }
      logger.info('processAuthPayload: API key found on retry');
    } else {
      logger.info('processAuthPayload: API key storage verified', {
        hasUsername: !!verifyCredentials.username,
      });
    }
    
    // Mark onboarding as completed
    await setOnboardingCompleted();
    
    logger.info('processAuthPayload: Authentication successful');
    
    return {
      success: true,
      username: username,
    };
  } catch (error: any) {
    logger.error('processAuthPayload: Failed', error);
    return {
      success: false,
      error: error?.message || 'Failed to process authentication',
    };
  }
}

/**
 * Sign out and revoke API key
 * Clears all authentication state from storage
 */
export async function signOut(): Promise<void> {
  try {
    logger.info('Signing out...');
    
    // Get API key for server revocation
    const credentials = await UserApiKeyManager.getAuthCredentials();
    
    if (credentials?.key) {
      try {
        // Revoke API key on server (best effort)
        const response = await fetch(`${SITE}/user-api-key/revoke`, {
          method: 'POST',
          headers: {
            'User-Api-Key': credentials.key,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          logger.info('API key revoked on server');
        } else {
          logger.warn('API key revocation failed on server', { status: response.status });
        }
      } catch (revokeError) {
        logger.warn('Failed to revoke API key on server (non-critical)', revokeError);
      }
    }
    
    // Clear all authentication data
    await UserApiKeyManager.clearApiKey();
    
    // Clear any legacy keys that might still exist
    const legacyKeys = ['disc_user_api_key', 'disc_client_id', 'fomio_user_api_key', 'fomio_user_api_username'];
    for (const key of legacyKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore individual deletion failures
      }
    }
    
    // Emit sign out event for React Query cache invalidation
    emitAuthEvent('auth:signed-out');
    
    logger.info('Sign out completed');
  } catch (error) {
    logger.error('Sign out failed', error);
    
    // Still try to clear local storage even if something failed
    try {
      await UserApiKeyManager.clearApiKey();
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
