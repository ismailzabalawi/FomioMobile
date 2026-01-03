import * as Linking from 'expo-linking';
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
const STORAGE_KEY = 'disc_user_api_key';
const CLIENT_ID_KEY = 'disc_client_id';

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
 * Build auth URL for WebView-based flow (Android shell)
 * Ensures RSA keys + nonce are ready and private key is stored for callback decryption.
 */
export async function buildAuthUrlForWebView(): Promise<string> {
  // ALWAYS generate fresh RSA keypair for each auth attempt
  // This prevents key mismatch issues from stale/corrupted stored keys
  logger.info('Generating fresh RSA keypair for WebView auth...');
  const keyPair = await UserApiKeyManager.generateKeyPair();
  const publicKey = keyPair.publicKey;
  const privateKey = keyPair.privateKey;

  // Persist private key so callback can decrypt payload
  await UserApiKeyManager.storePrivateKey(privateKey);
  await UserApiKeyManager.storePublicKey(publicKey);

  // Generate or get client ID
  const clientId = await UserApiKeyManager.getOrGenerateClientId();

  // Create redirect URI
  const redirectUri = getRedirectUri();

  // Build authorization URL
  const scopes = 'read,write,notifications,session_info,one_time_password';
  // ALWAYS generate fresh nonce for each auth attempt
  const nonce = await UserApiKeyManager.generateNonce();
  await UserApiKeyManager.storeNonce(nonce);

  const params = new URLSearchParams({
    application_name: 'Fomio',
    client_id: clientId,
    scopes,
    public_key: publicKey,
    auth_redirect: redirectUri,
    nonce,
    discourse_app: '1',
  });
  if (PUSH_URL) {
    params.append('push_url', PUSH_URL);
  }

  const authUrl = `${SITE}/user-api-key/new?${params.toString()}`;

  logger.info('Built WebView auth URL', {
    url: authUrl.substring(0, 200),
    redirectUri,
    platform: Platform.OS,
    noncePreview: nonce.substring(0, 20),
    publicKeyPreview: publicKey.substring(0, 50),
  });

  return authUrl;
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
    
    // Create redirect URI - Force fomio:// scheme even in development
    // In Expo Go, Linking.createURL returns exp://, but Discourse needs fomio://
    const redirectUri = getRedirectUri();
    
    // Log redirect URI format for debugging
    logger.info('Generated redirect URI for auth', {
      redirectUri,
      platform: require('react-native').Platform.OS,
      scheme: 'fomio',
      path: '/auth/callback',
    });
    
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
      discourse_app: '1',
    });
    if (PUSH_URL) {
      params.append('push_url', PUSH_URL);
    }
    
    const authUrl = `${SITE}/user-api-key/new?${params.toString()}`;
    
    logger.info('Opening authorization URL', {
      url: authUrl.replace(publicKey, '[PUBLIC_KEY]'),
      redirectUri,
      platform: Platform.OS,
    });
    
    // Platform-specific handling
    if (Platform.OS === 'ios') {
      // iOS: Use existing working flow (100% UNCHANGED - exact same code)
      // This uses ASWebAuthenticationSession which properly intercepts redirects
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
      // Parse the URL using utility function
      const redirectResult = result as WebBrowserRedirectResult;
      const urlString = redirectResult.url ?? '';
      const urlParams = parseURLParameters(urlString);
      const payload = urlParams.payload || null;
      
      if (!payload) {
        logger.error('No payload in redirect URL', { url: urlString });
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
          logger.error('Nonce mismatch - possible replay attack', {
            storedNonce: storedNonce.substring(0, 10) + '...',
            decryptedNonce: decryptedNonce.substring(0, 10) + '...',
          });
          throw new Error('Security verification failed. Please try again.');
        }
        logger.info('Nonce verification successful');
      } else if (decryptedNonce || storedNonce) {
        // If only one is present, log warning but don't fail (for backward compatibility)
        logger.warn('Partial nonce data - one missing', {
          hasDecryptedNonce: !!decryptedNonce,
          hasStoredNonce: !!storedNonce,
        });
      }
      
      // Clear nonce after successful verification (prevents reuse)
      await UserApiKeyManager.clearNonce();
      
      // Get username from API after storing the key temporarily
      // This is needed for the Api-Username header required by Discourse API
      let username: string | undefined;
      try {
        // Temporarily store key so API call works
        await SecureStore.setItemAsync("fomio_user_api_key", key);
        
        // CRITICAL FIX: Set memory cache immediately so it's available for any API calls
        // This prevents race conditions where write operations happen before storeCompleteAuth
        const clientId = await UserApiKeyManager.getOrGenerateClientId();
        UserApiKeyManager.setMemoryCache(key, undefined, clientId);
        
        const discourseApi = require('../shared/discourseApi').discourseApi;
        const userResponse = await discourseApi.getCurrentUser();
        if (userResponse.success && userResponse.data?.username) {
          username = userResponse.data.username;
          logger.info('Username retrieved during sign in', { username });
        }
      } catch (error) {
        logger.warn('Failed to get username during sign in (non-critical)', error);
        // Don't fail sign in if username fetch fails - we can get it later
      }

      // Store complete auth using unified storage
      await UserApiKeyManager.storeCompleteAuth(key, username, clientId, one_time_password);
      
      logger.info('API key stored successfully');
      
      // Warm browser cookies with OTP if provided (recommended)
      if (one_time_password) {
        try {
          logger.info('Warming browser cookies with OTP...');
          const otpUrl = `${SITE}/session/otp/${one_time_password}`;
          
          // Open OTP URL in system browser to set logged-in cookie
          // Using openBrowserAsync ensures cookies are set in the user's default browser
          await WebBrowser.openBrowserAsync(otpUrl);
          
          logger.info('OTP cookie warming completed');
        } catch (otpError) {
          // OTP warming is optional, log but don't fail
          logger.warn('OTP cookie warming failed (non-critical)', otpError);
        }
      }

      emitAuthEvent('auth:signed-in');
      await setOnboardingCompleted();

      return true;
    } else {
      // Android: Use Linking.openURL() which works reliably with any browser
      // The deep link redirect will be handled by app/auth/callback.tsx via Expo Router
      // This approach works with Chrome, Firefox, Samsung Internet, Edge, etc.
      logger.info('Android: Opening auth URL, redirect will be handled via deep link');
      
      const canOpen = await Linking.canOpenURL(authUrl);
      if (!canOpen) {
        logger.error('Cannot open authorization URL', { authUrl });
        throw new Error('Cannot open authorization URL. Please check your browser settings.');
      }
      
      await Linking.openURL(authUrl);
      
      // Return true immediately - the callback screen will complete the auth flow
      // When Discourse redirects to fomio://auth/callback?payload=..., Android's intent system
      // will open the app and route to app/auth/callback.tsx, which handles the full flow
      logger.info('Android: Auth URL opened, waiting for deep link redirect...');
      return true;
    }
  } catch (error: any) {
    logger.error('Sign in failed', error);
    throw error;
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
  // #region agent log
  const logData11 = {location:'lib/auth.ts:358',message:'authHeaders ENTRY',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'};
  console.log('🔍 DEBUG:', JSON.stringify(logData11));
  fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData11)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
  // #endregion
  try {
    // Use unified storage via UserApiKeyManager
    const credentials = await UserApiKeyManager.getAuthCredentials();
    // #region agent log
    const logData12 = {location:'lib/auth.ts:361',message:'authHeaders AFTER getAuthCredentials',data:{hasCredentials:!!credentials,hasKey:!!credentials?.key,keyLength:credentials?.key?.length||0,hasUsername:!!credentials?.username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'};
    console.log('🔍 DEBUG:', JSON.stringify(logData12));
    fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData12)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
    // #endregion

    if (!credentials?.key) {
      console.warn("⚠️ Missing User-Api-Key");
      console.log("⚠️ User API Key not found, request may fail");
      logger.error('🔍 DEBUG: authHeaders - NO CREDENTIALS', {
        hasCredentials: !!credentials,
        timestamp: new Date().toISOString(),
      });
      // #region agent log
      const logData13 = {location:'lib/auth.ts:363',message:'authHeaders EXIT - NO KEY',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'};
      console.log('🔍 DEBUG:', JSON.stringify(logData13));
      fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData13)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
      // #endregion
      return {};
    }

    // Return headers - username is optional for GET requests
    // Api-Username is required for write operations, but GET requests work with just User-Api-Key
    const headers: Record<string, string> = {
      "User-Api-Key": credentials.key,
      ...(credentials.clientId ? { "User-Api-Client-Id": credentials.clientId } : {}),
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    if (credentials.username) {
      headers["Api-Username"] = credentials.username;
    } else {
      console.log("⚠️ Api-Username not available yet, some operations may fail");
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
 */
export async function signOut(): Promise<void> {
  try {
    logger.info('Signing out...');
    
    // Get API key from either storage location for revocation
    let key: string | null = null;
    const apiKeyData = await UserApiKeyManager.getApiKey();
    if (apiKeyData?.key) {
      key = apiKeyData.key;
    }
    
    if (!key) {
      key = await SecureStore.getItemAsync(STORAGE_KEY);
    }
    
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
    
    // Clear local storage (both new and legacy locations)
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    await SecureStore.deleteItemAsync(CLIENT_ID_KEY);
    
    // Clear keypair and API key data (optional, but good for security)
    await UserApiKeyManager.clearApiKey();
    
    logger.info('Sign out completed');
  } catch (error) {
    logger.error('Sign out failed', error);
    // Still clear local storage even if revocation fails
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      await SecureStore.deleteItemAsync(CLIENT_ID_KEY);
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
