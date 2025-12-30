import React, { useEffect, useRef } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { logger } from '../../shared/logger';
import { useAuth } from '@/shared/auth-context';
import { discourseApi, setAuthInProgress } from '../../shared/discourseApi';
import { UserApiKeyManager } from '../../shared/userApiKeyManager';
import { hasUserApiKey } from '../../lib/auth';
import { parseURLParameters } from '../../lib/auth-utils';
import Constants from 'expo-constants';
import { setOnboardingCompleted } from '../../shared/onboardingStorage';

const config = Constants.expoConfig?.extra || {};

// Global flag to prevent double-processing across component remounts
let globalCallbackProcessing = false;
let globalCallbackProcessed = false;

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
  const navigation = useNavigation();
  const hasProcessedRef = useRef(false);
  const params = useLocalSearchParams();
  
  // If already authenticated, skip processing entirely
  if (isAuthenticated && !globalCallbackProcessing) {
    logger.info('AuthCallbackScreen: Already authenticated, redirecting to tabs');
    // Use setTimeout to avoid navigation during render
    setTimeout(() => router.replace('/(tabs)'), 0);
    return null;
  }

  const normalizePayload = (value: string): string => value.replace(/ /g, '+');

  useEffect(() => {
    logger.info('AuthCallbackScreen: Component mounted', {
      platform: Platform.OS,
      params: params,
      paramsKeys: Object.keys(params),
      hasUrl: !!params.url,
      hasPayload: !!params.payload,
      urlValue: typeof params.url === 'string' ? params.url.substring(0, 200) : params.url,
      payloadValue: typeof params.payload === 'string' ? params.payload.substring(0, 100) : params.payload,
      globalCallbackProcessing,
      globalCallbackProcessed,
    });
    
    // Prevent multiple callback processing using both ref and global flag
    if (hasProcessedRef.current || globalCallbackProcessing || globalCallbackProcessed) {
      logger.info('AuthCallbackScreen: Skipping - already processed or processing', {
        hasProcessedRef: hasProcessedRef.current,
        globalCallbackProcessing,
        globalCallbackProcessed,
      });
      return;
    }
    
    hasProcessedRef.current = true;
    globalCallbackProcessing = true;
    
    async function handleCallback() {
      // Double-check we haven't already processed (race condition protection)
      if (globalCallbackProcessed) {
        logger.info('AuthCallbackScreen: Already processed, skipping handleCallback');
        router.replace('/(tabs)');
        return;
      }
      
      // Set flag to prevent 401/403 from parallel requests clearing the API key
      setAuthInProgress(true);
      
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
          payload = normalizePayload(decodeURIComponent(params.payload));
          logger.info('AuthCallbackScreen: Found payload in direct param');
        } else if (Array.isArray(params.payload) && typeof params.payload[0] === 'string') {
          payload = normalizePayload(decodeURIComponent(params.payload[0]));
          logger.info('AuthCallbackScreen: Found payload in direct param array');
        }
        // Try extracting from URL string using utility function
        else if (typeof params.url === 'string') {
          const urlString = params.url;
          const urlParams = parseURLParameters(urlString);
          payload = urlParams.payload ? normalizePayload(urlParams.payload) : null;
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

            // Store API key securely - just the raw key, not JSON
            // authHeaders() expects a raw string at this key
            await SecureStore.setItemAsync("fomio_user_api_key", decrypted.key);

            // Store one-time password if provided
            if (decrypted.one_time_password) {
              await UserApiKeyManager.storeOneTimePassword(decrypted.one_time_password);
            }

            // Android: mirror iOS by persisting complete auth data when payload arrives
            if (Platform.OS === 'android') {
              let username: string | undefined;
              try {
                const userResponse = await discourseApi.getCurrentUser();
                if (userResponse.success && userResponse.data?.username) {
                  username = userResponse.data.username;
                  logger.info('AuthCallbackScreen: Username retrieved during Android callback', { username });
                }
              } catch (error) {
                logger.warn('AuthCallbackScreen: Failed to fetch username during Android callback (non-critical)', error);
              }

              const clientId = await UserApiKeyManager.getOrGenerateClientId();
              await UserApiKeyManager.storeCompleteAuth(
                decrypted.key,
                username,
                clientId,
                decrypted.one_time_password
              );
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
          const DISCOURSE_URL = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.fomio.app';
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
          await setOnboardingCompleted();
          
          // Mark as successfully processed to prevent any re-processing
          globalCallbackProcessed = true;

          // Android: warm browser cookies with OTP if available
          if (Platform.OS === 'android') {
            try {
              const otp = await UserApiKeyManager.getOneTimePassword();
              if (otp) {
                const otpUrl = `${DISCOURSE_URL}/session/otp/${otp}`;
                logger.info('AuthCallbackScreen: Warming browser cookies with OTP (Android)...');
                await Linking.openURL(otpUrl);
              }
            } catch (otpError) {
              logger.warn('AuthCallbackScreen: OTP cookie warming failed on Android (non-critical)', otpError);
            }
          }

          // Reset navigation stack to prevent going back to auth screens
          const rootNavigation = navigation.getParent() || navigation;
          rootNavigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: '/(tabs)' }],
            })
          );
        } else {
          const errorMsg = userResponse.error || 'Failed to fetch user data';
          logger.error('AuthCallbackScreen: Failed to fetch user data', {
            error: errorMsg,
            status: userResponse.status,
          });
          
          // Clear potentially invalid API key
          try {
            await SecureStore.deleteItemAsync("fomio_user_api_key");
            await SecureStore.deleteItemAsync("fomio_user_api_username");
            await UserApiKeyManager.clearApiKey();
          } catch (clearError) {
            logger.warn('AuthCallbackScreen: Failed to clear API key', clearError);
          }
          
          router.replace('/(auth)/signin');
        }
      } catch (error: any) {
        // Only log as error if we haven't already successfully processed
        // Otherwise this is just noise from a re-mount attempt
        if (!globalCallbackProcessed) {
          logger.error('AuthCallbackScreen: Error processing callback', {
            error: error?.message || (error === null ? 'null error' : String(error)),
          });
          
          try {
            await SecureStore.deleteItemAsync("fomio_user_api_key");
            await SecureStore.deleteItemAsync("fomio_user_api_username");
            await UserApiKeyManager.clearApiKey();
          } catch (clearError) {
            logger.warn('AuthCallbackScreen: Failed to clear API key on error', clearError);
          }
          
          router.replace('/(auth)/signin');
        } else {
          // Already processed successfully, this is just a re-mount - ignore silently
          logger.debug('AuthCallbackScreen: Ignoring error on re-mount (already processed)');
          router.replace('/(tabs)');
        }
      } finally {
        // Always clear the auth-in-progress flag when done
        globalCallbackProcessing = false;
        setAuthInProgress(false);
      }
    }
    
    handleCallback();
  }, [setAuthenticatedUser]);

  // Return null - this screen just handles the redirect
  return null;
}
