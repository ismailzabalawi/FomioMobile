import { UserApiKeyManager, UserApiKeyData } from './userApiKeyManager';
import { discourseApi } from './discourseApi';
import { logger } from './logger';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';

const config = Constants.expoConfig?.extra || {};
const DISCOURSE_URL = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info';

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
 * Following Discourse User API Keys specification with delegated auth + OTP
 */
export class UserApiKeyAuth {
  /**
   * Build authorization URL for /user-api-key/new endpoint
   * @param options - Authorization options (scopes, application name, etc.)
   * @returns Authorization URL string
   */
  static async buildAuthorizationUrl(options: AuthorizationOptions = {}): Promise<string> {
    try {
      // Generate client ID (UUID)
      const clientId = await UserApiKeyManager.getOrGenerateClientId();
      
      // Generate RSA keypair for this login session
      const keyPair = await UserApiKeyManager.generateKeyPair();
      const publicKey = keyPair.publicKey;
      
      // Store private key temporarily (will be used to decrypt payload)
      await UserApiKeyManager.storePrivateKey(keyPair.privateKey);

      // Build redirect URI
      const redirectUri = Linking.createURL('auth/callback');
      
      // Default scopes
      const defaultScopes = [
        'read',
        'write',
        'notifications',
        'session_info',
        'one_time_password',
      ];
      const scopes: string = Array.isArray(options.scopes)
        ? options.scopes.join(',')
        : (options.scopes || defaultScopes.join(','));
      
      const applicationName = options.applicationName || 'Fomio';
      
      // Build URL with query parameters
      const params = new URLSearchParams();
      params.append('auth_redirect', redirectUri);
      params.append('application_name', applicationName);
      params.append('client_id', clientId);
      params.append('scopes', scopes);
      params.append('public_key', publicKey);

      if (options.pushUrl) {
        params.append('push_url', options.pushUrl);
      }

      const url = `${DISCOURSE_URL}/user-api-key/new?${params.toString()}`;
      
      logger.info('UserApiKeyAuth: Authorization URL built', {
        url: url.replace(publicKey, '[PUBLIC_KEY]'),
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
   * Initiate API key authorization flow using expo-auth-session
   * Opens Discourse authorization page in ASWebAuthenticationSession (iOS) or Chrome Custom Tabs (Android)
   * @param options - Authorization options
   * @returns Authorization result with API key
   */
  static async initiateAuthorization(options: AuthorizationOptions = {}): Promise<AuthorizationResult> {
    try {
      logger.info('UserApiKeyAuth: Initiating API key authorization...');
      
      const authUrl = await this.buildAuthorizationUrl(options);
      const redirectUri = Linking.createURL('auth/callback');

      // Open authorization page using expo-auth-session
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: redirectUri,
      });

      if (result.type !== 'success' || !result.params?.payload) {
        if (result.type === 'cancel') {
          return {
            success: false,
            error: 'Authorization cancelled',
          };
        }
        return {
          success: false,
          error: 'Authorization failed',
        };
      }

      // Handle the callback payload
      return await this.handleAuthorizationCallback(result.params.payload as string);
    } catch (error: any) {
      logger.error('UserApiKeyAuth: Failed to initiate authorization', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate authorization',
      };
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

      // Get stored private key (from buildAuthorizationUrl)
      const privateKey = await UserApiKeyManager.getPrivateKey();
      if (!privateKey) {
        return {
          success: false,
          error: 'Private key not found. Please restart authorization.',
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

      // Clean up private key (we don't need it anymore after decryption)
      // Note: We keep the API key data, just remove the temporary private key
      try {
        const { deleteItemAsync } = require('expo-secure-store');
        await deleteItemAsync('fomio_user_api_private_key');
      } catch {
        // Ignore cleanup errors - private key cleanup is optional
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
   * Warm browser cookies using one-time password
   * Opens /session/otp/{otp} in browser to set logged-in cookie
   * @param oneTimePassword - One-time password from authorization
   */
  static async warmBrowserCookies(oneTimePassword: string): Promise<void> {
    try {
      logger.info('UserApiKeyAuth: Warming browser cookies with OTP...');
      
      const otpUrl = `${DISCOURSE_URL}/session/otp/${oneTimePassword}`;
      const redirectUri = Linking.createURL('auth/callback');

      // Open OTP URL in browser to set logged-in cookie
      await AuthSession.startAsync({
        authUrl: otpUrl,
        returnUrl: redirectUri,
      });

      logger.info('UserApiKeyAuth: Browser cookies warmed successfully');
    } catch (error) {
      // OTP warming is optional - log but don't fail
      logger.warn('UserApiKeyAuth: OTP warming failed (non-critical)', error);
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
