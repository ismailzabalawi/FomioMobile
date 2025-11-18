/**
 * @deprecated This class is deprecated. Use the unified authentication flow in lib/auth.ts instead.
 * 
 * The UserApiKeyAuth class has been replaced by the signIn() function in lib/auth.ts,
 * which provides a complete, unified authentication flow following the official
 * Discourse User API Keys specification.
 * 
 * Migration guide:
 * - Replace UserApiKeyAuth.initiateAuthorization() with signIn() from lib/auth.ts
 * - The signIn() function handles: RSA key generation, browser session, payload
 *   decryption, storage, and OTP warming automatically
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import { UserApiKeyManager, UserApiKeyData } from './userApiKeyManager';
import { discourseApi } from './discourseApi';
import { logger } from './logger';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';

/**
 * Build redirect URI using expo-auth-session's makeRedirectUri
 * This follows the official Discourse Mobile app pattern
 * Forces fomio:// scheme even in Expo Go development
 * @deprecated Use getRedirectUri() from lib/auth.ts instead
 */
function getRedirectUri(): string {
  // Use makeRedirectUri to ensure proper scheme handling
  // native parameter forces the fomio:// scheme even in development
  const baseUri = makeRedirectUri({
    preferLocalhost: false,
    native: 'fomio://auth/callback',
  });
  
  // makeRedirectUri might return with or without path, ensure we have /auth/callback
  if (baseUri.includes('fomio://')) {
    // If it already has the correct scheme, use it
    return baseUri;
  }
  
  // Fallback: construct manually if makeRedirectUri doesn't work as expected
  try {
    const Platform = require('react-native').Platform;
    if (Platform.OS === 'ios') {
      return 'fomio:///auth/callback';
    }
  } catch {
    // Fallback
  }
  
  return 'fomio://auth/callback';
}

const config = Constants.expoConfig?.extra || {};
const DISCOURSE_URL = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info';
const DEFAULT_AUTH_REDIRECT = getRedirectUri();
const AUTH_REDIRECT_SCHEME = process.env.EXPO_PUBLIC_AUTH_REDIRECT_SCHEME || DEFAULT_AUTH_REDIRECT;

export interface AuthorizationResult {
  success: boolean;
  apiKey?: string;
  clientId?: string;
  oneTimePassword?: string;
  error?: string;
}

export interface AuthorizationOptions {
  scopes?: string[];
  applicationName?: string;
  pushUrl?: string;
}

/**
 * User API Key Authentication Service
 * Handles the complete authorization flow for Discourse User API Keys
 * Following Discourse User API Keys specification
 * 
 * @deprecated Use signIn() from lib/auth.ts instead. This class is kept for
 * backward compatibility only and will be removed in a future version.
 */
export class UserApiKeyAuth {
  /**
   * Build authorization URL for /user-api-key/new endpoint
   * @param options - Authorization options (scopes, application name, etc.)
   * @returns Authorization URL string
   */
  static async buildAuthorizationUrl(options: AuthorizationOptions = {}): Promise<string> {
    try {
      // Generate or get client ID
      const clientId = await UserApiKeyManager.getOrGenerateClientId();
      
      // Get or generate key pair
      let publicKey: string;
      const storedPublicKey = await UserApiKeyManager.getPublicKey();
      const storedPrivateKey = await UserApiKeyManager.getPrivateKey();
      
      if (storedPublicKey) {
        // Use stored public key
        publicKey = storedPublicKey;
        logger.info('UserApiKeyAuth: Using stored public key');
      } else if (storedPrivateKey) {
        // Try to extract public key from private key
        try {
          publicKey = await UserApiKeyManager.extractPublicKeyFromPrivate(storedPrivateKey);
          await UserApiKeyManager.storePublicKey(publicKey);
          logger.info('UserApiKeyAuth: Extracted and stored public key from private key');
        } catch (extractError) {
          // If extraction fails, generate new key pair
          logger.warn('UserApiKeyAuth: Failed to extract public key, generating new key pair', extractError);
          const keyPair = await UserApiKeyManager.generateKeyPair();
          publicKey = keyPair.publicKey;
        }
      } else {
        // Generate new key pair
        const keyPair = await UserApiKeyManager.generateKeyPair();
        publicKey = keyPair.publicKey;
        logger.info('UserApiKeyAuth: Generated new key pair');
      }

      // Generate or get nonce
      let nonce = await UserApiKeyManager.getNonce();
      if (!nonce) {
        nonce = await UserApiKeyManager.generateNonce();
        await UserApiKeyManager.storeNonce(nonce);
      }

      // Build authorization URL
      const defaultScopes = [
        'read',
        'write',
        'message_bus',
        'notifications',
        'one_time_password',
      ];
      const scopes: string = Array.isArray(options.scopes)
        ? options.scopes.join(',')
        : (options.scopes || defaultScopes.join(','));
      
      const applicationName = options.applicationName || 'Fomio';
      const hasQuery = AUTH_REDIRECT_SCHEME.includes('?');
      const separator = hasQuery ? '&' : '?';
      const authRedirect = `${AUTH_REDIRECT_SCHEME}${separator}client_id=${encodeURIComponent(clientId)}`;
      
      // URLSearchParams will handle encoding, but base64 strings need special handling
      // Use encodeURIComponent to ensure proper encoding of +, /, = characters
      const params = new URLSearchParams();
      params.append('auth_redirect', authRedirect);
      params.append('application_name', applicationName);
      params.append('client_id', clientId);
      params.append('scopes', scopes);
      params.append('public_key', publicKey); // URLSearchParams will encode this properly
      params.append('nonce', nonce);

      if (options.pushUrl) {
        params.append('push_url', options.pushUrl);
      }

      const url = `${DISCOURSE_URL}/user-api-key/new?${params.toString()}`;
      
      logger.info('UserApiKeyAuth: Authorization URL built', {
        url: url.replace(publicKey, '[PUBLIC_KEY]').replace(nonce, '[NONCE]'), // Don't log sensitive data
        clientId,
        scopes,
      });

      return url;
    } catch (error) {
      logger.error('UserApiKeyAuth: Failed to build authorization URL', error);
      throw new Error('Failed to build authorization URL');
    }
  }

  /**
   * Initiate API key authorization flow
   * Opens Discourse authorization page in WebView
   * @param options - Authorization options
   * @returns Authorization URL to open in WebView
   */
  static async initiateAuthorization(options: AuthorizationOptions = {}): Promise<string> {
    try {
      logger.info('UserApiKeyAuth: Initiating API key authorization...');
      const url = await this.buildAuthorizationUrl(options);
      return url;
    } catch (error) {
      logger.error('UserApiKeyAuth: Failed to initiate authorization', error);
      throw error;
    }
  }

  /**
   * Handle authorization callback with encrypted payload
   * Called when Discourse redirects back with encrypted payload
   * @param payload - Encrypted payload from Discourse redirect
   * @returns Authorization result with decrypted API key
   */
  static async handleAuthorizationCallback(payload: string): Promise<AuthorizationResult> {
    try {
      logger.info('UserApiKeyAuth: Handling authorization callback...');

      if (!payload) {
        return {
          success: false,
          error: 'No payload received from authorization',
        };
      }

      // Decrypt payload
      const decrypted = await UserApiKeyManager.decryptPayload(payload);
      
      if (!decrypted.key) {
        return {
          success: false,
          error: 'Invalid payload: API key not found',
        };
      }

      // Get client ID
      const clientId = await UserApiKeyManager.getOrGenerateClientId();

      // Store API key
      const apiKeyData: UserApiKeyData = {
        key: decrypted.key,
        clientId,
        oneTimePassword: decrypted.one_time_password,
        createdAt: Date.now(),
      };

      await UserApiKeyManager.storeApiKey(apiKeyData);

      // Store one-time password if provided
      if (decrypted.one_time_password) {
        await UserApiKeyManager.storeOneTimePassword(decrypted.one_time_password);
      }

      logger.info('UserApiKeyAuth: Authorization successful', {
        hasKey: !!decrypted.key,
        hasOtp: !!decrypted.one_time_password,
      });

      return {
        success: true,
        apiKey: decrypted.key,
        clientId,
        oneTimePassword: decrypted.one_time_password,
      };
    } catch (error: any) {
      logger.error('UserApiKeyAuth: Failed to handle authorization callback', error);
      return {
        success: false,
        error: error.message || 'Failed to process authorization callback',
      };
    }
  }

  /**
   * Check API version from Discourse instance
   * @returns API version number or null if check fails
   */
  static async checkApiVersion(): Promise<number | null> {
    try {
      const response = await fetch(`${DISCOURSE_URL}/user-api-key/new`, {
        method: 'HEAD',
      });

      const versionHeader = response.headers.get('Auth-Api-Version');
      if (versionHeader) {
        const version = parseInt(versionHeader, 10);
        logger.info('UserApiKeyAuth: API version detected', { version });
        return version;
      }

      return null;
    } catch (error) {
      logger.error('UserApiKeyAuth: Failed to check API version', error);
      return null;
    }
  }

  /**
   * Revoke current API key
   * @returns true if revocation successful
   */
  static async revokeApiKey(): Promise<boolean> {
    try {
      const apiKeyData = await UserApiKeyManager.getApiKey();
      
      if (!apiKeyData) {
        logger.warn('UserApiKeyAuth: No API key to revoke');
        return false;
      }

      logger.info('UserApiKeyAuth: Revoking API key...');

      // Call revocation endpoint
      const response = await fetch(`${DISCOURSE_URL}/user-api-key/revoke`, {
        method: 'POST',
        headers: {
          'User-Api-Key': apiKeyData.key,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Clear stored API key
        await UserApiKeyManager.clearApiKey();
        logger.info('UserApiKeyAuth: API key revoked successfully');
        return true;
      } else {
        logger.error('UserApiKeyAuth: API key revocation failed', {
          status: response.status,
          statusText: response.statusText,
        });
        // Still clear local key even if server revocation fails
        await UserApiKeyManager.clearApiKey();
        return false;
      }
    } catch (error) {
      logger.error('UserApiKeyAuth: Failed to revoke API key', error);
      // Clear local key even on error
      await UserApiKeyManager.clearApiKey();
      return false;
    }
  }

  /**
   * Generate one-time password using existing API key
   * @returns One-time password or null if generation fails
   */
  static async generateOneTimePassword(): Promise<string | null> {
    try {
      const apiKeyData = await UserApiKeyManager.getApiKey();
      
      if (!apiKeyData) {
        logger.warn('UserApiKeyAuth: No API key available for OTP generation');
        return null;
      }

      logger.info('UserApiKeyAuth: Generating one-time password...');

      // Get or generate key pair for OTP request
      const keyPair = await UserApiKeyManager.generateKeyPair();
      await UserApiKeyManager.storePrivateKey(keyPair.privateKey);

      const clientId = await UserApiKeyManager.getOrGenerateClientId();
      const hasQuery = AUTH_REDIRECT_SCHEME.includes('?');
      const separator = hasQuery ? '&' : '?';
      const authRedirect = `${AUTH_REDIRECT_SCHEME}${separator}client_id=${encodeURIComponent(clientId)}&otp=true`;

      // Build OTP request URL
      const params = new URLSearchParams({
        auth_redirect: authRedirect,
        application_name: 'Fomio',
        public_key: keyPair.publicKey,
      });

      const url = `${DISCOURSE_URL}/user-api-key/otp?${params.toString()}`;

      // Open in WebView or browser - this will redirect back with encrypted OTP
      // For now, return the URL to be opened
      // The actual OTP will be received via the callback
      logger.info('UserApiKeyAuth: OTP generation URL built', {
        url: url.replace(keyPair.publicKey, '[PUBLIC_KEY]'),
      });

      return url;
    } catch (error) {
      logger.error('UserApiKeyAuth: Failed to generate one-time password', error);
      return null;
    }
  }

  /**
   * Check if user has authorized API key
   * @returns true if API key exists and is valid
   */
  static async isAuthorized(): Promise<boolean> {
    return await UserApiKeyManager.hasApiKey();
  }

  /**
   * Get current API key data
   * @returns API key data or null
   */
  static async getApiKeyData(): Promise<UserApiKeyData | null> {
    return await UserApiKeyManager.getApiKey();
  }
}

export default UserApiKeyAuth;

