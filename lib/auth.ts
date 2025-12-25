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

// Complete auth session when browser closes
WebBrowser.maybeCompleteAuthSession();

const config = Constants.expoConfig?.extra || {};
const SITE = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.fomio.app';
const STORAGE_KEY = 'disc_user_api_key';
const CLIENT_ID_KEY = 'disc_client_id';

/**
 * Build redirect URI using expo-auth-session's makeRedirectUri
 * This follows the official Discourse Mobile app pattern
 * Forces fomio:// scheme even in Expo Go development
 * 
 * Respects EXPO_PUBLIC_AUTH_REDIRECT_SCHEME environment variable if set,
 * otherwise uses makeRedirectUri with fomio://auth/callback
 */
function getRedirectUri(): string {
  // Check if environment variable is set (allows configuration via .env)
  const envRedirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_SCHEME;
  if (envRedirect) {
    logger.info('Using redirect URI from EXPO_PUBLIC_AUTH_REDIRECT_SCHEME', { redirectUri: envRedirect });
    return envRedirect;
  }
  
  // Use makeRedirectUri to ensure proper scheme handling
  // Following Discourse's official pattern: discourse://auth_redirect -> fomio://auth_redirect
  const baseUri = makeRedirectUri({
    preferLocalhost: false,
    native: 'fomio://auth_redirect',
  });
  
  // makeRedirectUri might return with or without path, ensure we have the correct format
  if (baseUri.includes('fomio://')) {
    // If it already has the correct scheme, use it
    return baseUri;
  }
  
  // Fallback: use Discourse's official pattern
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
 * Build auth URL for WebView-based flow (Android shell)
 * Ensures RSA keys + nonce are ready and private key is stored for callback decryption.
 */
export async function buildAuthUrlForWebView(): Promise<string> {
  // Generate RSA keypair
  const { publicKey, privateKey } = await getRsaKeypair();

  // Persist private key so callback can decrypt payload
  await UserApiKeyManager.storePrivateKey(privateKey);

  // Generate or get client ID
  const clientId = await UserApiKeyManager.getOrGenerateClientId();

  // Create redirect URI
  const redirectUri = getRedirectUri();

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
    scopes,
    public_key: publicKey,
    auth_redirect: redirectUri,
    nonce,
  });

  const authUrl = `${SITE}/user-api-key/new?${params.toString()}`;

  logger.info('Built WebView auth URL', {
    url: authUrl.replace(publicKey, '[PUBLIC_KEY]'),
    redirectUri,
    platform: Platform.OS,
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
    });
    
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
  try {
    // Use unified storage via UserApiKeyManager
    const credentials = await UserApiKeyManager.getAuthCredentials();

    if (!credentials?.key) {
      console.warn("⚠️ Missing User-Api-Key");
      console.log("⚠️ User API Key not found, request may fail");
      return {};
    }

    // Return headers - username is optional for GET requests
    // Api-Username is required for write operations, but GET requests work with just User-Api-Key
    const headers: Record<string, string> = {
      "User-Api-Key": credentials.key,
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
