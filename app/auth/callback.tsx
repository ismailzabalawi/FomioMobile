import React, { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '../../shared/logger';
import { useAuth } from '@/shared/auth-context';
import { discourseApi } from '../../shared/discourseApi';
import { UserApiKeyManager } from '../../shared/userApiKeyManager';
import { hasUserApiKey, processAuthPayload } from '../../lib/auth';
import { parseURLParameters } from '../../lib/auth-utils';
import Constants from 'expo-constants';
import { setOnboardingCompleted } from '../../shared/onboardingStorage';

const config = Constants.expoConfig?.extra || {};

/**
 * Auth callback handler - FALLBACK ONLY
 * 
 * With the unified auth flow using WebBrowser.openAuthSessionAsync,
 * this screen should rarely be hit. It exists as a fallback for:
 * - Direct deep link handling if the app was killed during auth
 * - Edge cases where the system browser doesn't complete properly
 * 
 * The main auth flow is handled synchronously in lib/auth.ts:signIn()
 */
export default function AuthCallbackScreen() {
  const { setAuthenticatedUser } = useAuth();
  const hasProcessedRef = useRef(false);
  const params = useLocalSearchParams();

  useEffect(() => {
    // Prevent multiple callback processing
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    async function handleCallback() {
      try {
        logger.info('AuthCallbackScreen: Processing callback (fallback path)...');

        // Check if authentication is already complete (normal flow)
        // signIn() in lib/auth.ts already handles the payload, so we just need to verify and redirect
        const hasKey = await hasUserApiKey();
        if (hasKey) {
          const userResponse = await discourseApi.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            logger.info('AuthCallbackScreen: Auth already complete, updating context and redirecting');
            
            // Update auth context with user data
            const DISCOURSE_URL = config.DISCOURSE_BASE_URL || 'https://meta.fomio.app';
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
            
            await setAuthenticatedUser(appUser);
            await setOnboardingCompleted();
            
            // Navigate to tabs
            navigateToTabs();
            return;
          }
        }

        // Fallback: Try to extract and process payload from URL params
        // This handles the case where signIn() didn't complete (app was killed, etc.)
        let payload: string | null = null;
        
        if (typeof params.payload === 'string') {
          payload = params.payload.replace(/ /g, '+');
        } else if (Array.isArray(params.payload) && typeof params.payload[0] === 'string') {
          payload = params.payload[0].replace(/ /g, '+');
        } else if (typeof params.url === 'string') {
          const urlParams = parseURLParameters(params.url);
          payload = urlParams.payload?.replace(/ /g, '+') || null;
        }

        if (payload) {
          logger.info('AuthCallbackScreen: Processing payload from deep link...');
          const result = await processAuthPayload(payload);
          
          if (result.success) {
            logger.info('AuthCallbackScreen: Payload processed successfully');
            
            // Fetch and set user data
            const userResponse = await discourseApi.getCurrentUser();
            if (userResponse.success && userResponse.data) {
              const DISCOURSE_URL = config.DISCOURSE_BASE_URL || 'https://meta.fomio.app';
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
              
              await setAuthenticatedUser(appUser);
            }
            
            await setOnboardingCompleted();
            navigateToTabs();
            return;
          } else {
            throw new Error(result.error || 'Failed to process authentication');
          }
        }

        // No payload and no valid key - redirect to sign in
        logger.warn('AuthCallbackScreen: No payload and no valid API key');
        router.replace('/(auth)/signin');
        
      } catch (error: any) {
        logger.error('AuthCallbackScreen: Error processing callback', { error: error?.message });
        
        // Clear any potentially invalid credentials
        try {
          await UserApiKeyManager.clearApiKey();
        } catch {
          // Ignore cleanup errors
        }
        
        router.replace('/(auth)/signin');
      }
    }

    function navigateToTabs() {
      // Use Expo Router's replace to navigate to tabs
      // This replaces the current route, preventing going back to auth screens
      router.replace('/(tabs)');
    }

    handleCallback();
  }, [setAuthenticatedUser, params]);

  // Show loading indicator while processing
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
