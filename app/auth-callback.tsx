import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { logger } from '../shared/logger';
import { useAuth } from '../shared/useAuth';
import { discourseApi } from '../shared/discourseApi';
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

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      logger.info('AuthCallbackScreen: Processing callback...');

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

  // Return null - this screen just handles the redirect
  return null;
}
