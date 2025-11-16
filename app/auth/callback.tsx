import React, { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { logger } from '../../shared/logger';
import { useAuth } from '../../shared/useAuth';
import { discourseApi } from '../../shared/discourseApi';
import Constants from 'expo-constants';

const config = Constants.expoConfig?.extra || {};

/**
 * Auth callback handler
 * This screen handles the deep link callback from Discourse after authorization
 * Note: expo-auth-session handles most of this automatically, but this route
 * serves as a fallback for direct deep link navigation
 */
export default function AuthCallbackScreen() {
  const { setAuthenticatedUser } = useAuth();
  const hasProcessedRef = useRef(false);
  const params = useLocalSearchParams();

  useEffect(() => {
    // Prevent multiple callback processing using ref (more reliable than state)
    if (hasProcessedRef.current) {
      return;
    }
    
    hasProcessedRef.current = true;
    
    async function handleCallback() {
      try {
        // Log deep link information for debugging (platform-agnostic)
        const urlString = typeof params.url === 'string' ? params.url : '';
        logger.info('AuthCallbackScreen: Processing callback...', {
          platform: Platform.OS,
          hasUrlParam: !!urlString,
          paramsKeys: Object.keys(params),
        });

        // Extract payload from URL if present (handles both iOS and Android formats)
        // iOS: fomio:///auth/callback?payload=... (triple slash)
        // Android: fomio://auth/callback?payload=... (double slash)
        if (urlString) {
          const payloadMatch = urlString.match(/[?&]payload=([^&]+)/);
          if (payloadMatch) {
            logger.info('AuthCallbackScreen: Found payload in URL params');
          } else {
            logger.warn('AuthCallbackScreen: No payload found in URL', { urlString });
          }
        }

        // If expo-auth-session handled it, we should already be authenticated
        // Just verify and fetch user data
        const userResponse = await discourseApi.getCurrentUser();

        if (userResponse.success && userResponse.data) {
          // Map Discourse user to AppUser
          const DISCOURSE_URL = config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info';
          const appUser = {
            id: userResponse.data.id?.toString() || '0',
            username: userResponse.data.username || 'unknown',
            name: userResponse.data.name || userResponse.data.username || 'Unknown User',
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
          logger.info('AuthCallbackScreen: User authenticated successfully');

          // Navigate to main app
          router.replace('/(tabs)');
        } else {
          logger.error('AuthCallbackScreen: Failed to fetch user data');
          router.replace('/(auth)/signin');
        }
      } catch (error: any) {
        logger.error('AuthCallbackScreen: Error processing callback', error);
        router.replace('/(auth)/signin');
      }
    }
    
    handleCallback();
  }, [setAuthenticatedUser]);

  // Return null - this screen just handles the redirect
  return null;
}
