import React, { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { logger } from '../../shared/logger';
import { useAuth } from '@/shared/auth-context';
import { discourseApi } from '../../shared/discourseApi';
import { UserApiKeyManager } from '../../shared/userApiKeyManager';
import { hasUserApiKey } from '../../lib/auth';
import { parseURLParameters } from '../../lib/auth-utils';
import Constants from 'expo-constants';

const config = Constants.expoConfig?.extra || {};

/**
 * Auth callback handler
 * This screen handles the deep link callback from Discourse after authorization
 * Extracts encrypted payload from URL, decrypts it, stores API key, then verifies user
 * 
 * Note: This serves as a fallback for direct deep links. The main auth flow in lib/auth.ts
 * already handles payload extraction and storage when using signIn(), so this handler
 * checks if auth is already complete to prevent double-processing.
 */
export default function AuthCallbackScreen() {
  const { setAuthenticatedUser, isAuthenticated } = useAuth();
  const hasProcessedRef = useRef(false);
  const params = useLocalSearchParams();

  useEffect(() => {
    logger.info('AuthCallbackScreen: Component mounted', {
      platform: Platform.OS,
      params: params,
      paramsKeys: Object.keys(params),
      hasUrl: !!params.url,
      hasPayload: !!params.payload,
      urlValue: typeof params.url === 'string' ? params.url.substring(0, 200) : params.url,
      payloadValue: typeof params.payload === 'string' ? params.payload.substring(0, 100) : params.payload,
    });
    // Prevent multiple callback processing using ref (more reliable than state)
    if (hasProcessedRef.current) {
      return;
    }
    
    hasProcessedRef.current = true;
    
    async function handleCallback() {
      try {
        logger.info('AuthCallbackScreen: Processing callback...', {
          platform: Platform.OS,
          paramsKeys: Object.keys(params),
        });

        // Early return: Check if authentication is already complete
        // This prevents double-processing when lib/auth.ts.signIn() has already handled the auth flow
        const hasApiKey = await hasUserApiKey();
        if (hasApiKey) {
          // Verify the API key is valid by checking user data
          const userResponse = await discourseApi.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            logger.info('AuthCallbackScreen: Authentication already complete, navigating to main app');
            router.replace('/(tabs)');
            return;
          } else {
            // API key exists but is invalid, continue with callback processing
            logger.warn('AuthCallbackScreen: API key exists but is invalid, processing callback');
          }
        }

        // Extract payload from URL query parameters
        // Can come from params.url (full URL string) or params.payload (direct param)
        let payload: string | null = null;
        
        // Try direct payload parameter first
        if (typeof params.payload === 'string') {
          payload = decodeURIComponent(params.payload);
          logger.info('AuthCallbackScreen: Found payload in direct param');
        } 
        // Try extracting from URL string using utility function
        else if (typeof params.url === 'string') {
          const urlString = params.url;
          const urlParams = parseURLParameters(urlString);
          payload = urlParams.payload || null;
          if (payload) {
            logger.info('AuthCallbackScreen: Found payload in URL string');
          }
        }

        if (!payload) {
          logger.error('AuthCallbackScreen: No payload found in callback URL', {
            params: Object.keys(params),
            urlParam: typeof params.url === 'string' ? params.url.substring(0, 100) : 'not a string',
          });
          
          // If no payload, check if we already have a valid API key (maybe from openAuthSessionAsync)
          const userResponse = await discourseApi.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            logger.info('AuthCallbackScreen: No payload but API key already valid, proceeding with user fetch');
            // Continue to user mapping below
          } else {
            throw new Error('No payload found in callback URL and no valid API key. Please try authorizing again.');
          }
        } else {
          // Decrypt payload and store API key
          logger.info('AuthCallbackScreen: Decrypting payload...');
          try {
            const decrypted = await UserApiKeyManager.decryptPayload(payload);
            
            if (!decrypted.key) {
              throw new Error('Invalid payload: API key not found after decryption');
            }

            // Verify nonce matches stored nonce (security check to prevent replay attacks)
            const storedNonce = await UserApiKeyManager.getNonce();
            if (decrypted.nonce && storedNonce) {
              if (decrypted.nonce !== storedNonce) {
                logger.error('AuthCallbackScreen: Nonce mismatch - possible replay attack', {
                  storedNonce: storedNonce.substring(0, 10) + '...',
                  decryptedNonce: decrypted.nonce.substring(0, 10) + '...',
                });
                throw new Error('Security verification failed. Please try again.');
              }
              logger.info('AuthCallbackScreen: Nonce verification successful');
            } else if (decrypted.nonce || storedNonce) {
              // If only one is present, log warning but don't fail (for backward compatibility)
              logger.warn('AuthCallbackScreen: Partial nonce data - one missing', {
                hasDecryptedNonce: !!decrypted.nonce,
                hasStoredNonce: !!storedNonce,
              });
            }

            // Clear nonce after successful verification (prevents reuse)
            await UserApiKeyManager.clearNonce();

            // Get or generate client ID
            const clientId = await UserApiKeyManager.getOrGenerateClientId();

            // Store API key securely in new unified storage
            await SecureStore.setItemAsync("fomio_user_api_key", decrypted.key);
            
            // Store API key in UserApiKeyManager for backward compatibility
            await UserApiKeyManager.storeApiKey({
              key: decrypted.key,
              clientId,
              oneTimePassword: decrypted.one_time_password,
              createdAt: Date.now(),
            });

            // Store one-time password if provided
            if (decrypted.one_time_password) {
              await UserApiKeyManager.storeOneTimePassword(decrypted.one_time_password);
            }

            logger.info('AuthCallbackScreen: API key stored successfully');
          } catch (decryptError: any) {
            logger.error('AuthCallbackScreen: Failed to decrypt payload', decryptError);
            throw new Error(`Failed to decrypt authorization payload: ${decryptError.message || 'Unknown error'}. Please try authorizing again.`);
          }
        }

        // Verify authentication by fetching user data
        logger.info('AuthCallbackScreen: Verifying authentication...');
        const userResponse = await discourseApi.getCurrentUser();

        if (userResponse.success && userResponse.data) {
          // Map Discourse user to AppUser
          const DISCOURSE_URL = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info';
          const username = userResponse.data.username || 'unknown';
          const appUser = {
            id: userResponse.data.id?.toString() || '0',
            username: username,
            name: userResponse.data.name || username || 'Unknown User',
            email: userResponse.data.email || '',
            avatar: userResponse.data.avatar_template
              ? `${DISCOURSE_URL}${userResponse.data.avatar_template.replace('{size}', '120')}`
              : '',
            bio: userResponse.data.bio_raw || '',
            followers: 0,
            following: 0,
            bytes: userResponse.data.topic_count || 0,
            comments: userResponse.data.post_count || 0,
            joinedDate: userResponse.data.created_at
              ? new Date(userResponse.data.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })
              : 'Unknown',
          };

          // Store username with API key
          if (username) {
            await SecureStore.setItemAsync("fomio_user_api_username", username);
          }

          await setAuthenticatedUser(appUser);
          logger.info('AuthCallbackScreen: User authenticated successfully');

          // Navigate to main app
          router.replace('/(tabs)');
        } else {
          const errorMsg = userResponse.error || 'Failed to fetch user data';
          logger.error('AuthCallbackScreen: Failed to fetch user data', {
            error: errorMsg,
            status: userResponse.status,
          });
          
          // Clear potentially invalid API key
          try {
            await UserApiKeyManager.clearApiKey();
          } catch (clearError) {
            logger.warn('AuthCallbackScreen: Failed to clear API key', clearError);
          }
          
          router.replace('/(auth)/signin');
        }
      } catch (error: any) {
        logger.error('AuthCallbackScreen: Error processing callback', error);
        
        // Clear potentially invalid API key on error
        try {
          await UserApiKeyManager.clearApiKey();
        } catch (clearError) {
          logger.warn('AuthCallbackScreen: Failed to clear API key on error', clearError);
        }
        
        router.replace('/(auth)/signin');
      }
    }
    
    handleCallback();
  }, [setAuthenticatedUser]);

  // Return null - this screen just handles the redirect
  return null;
}
