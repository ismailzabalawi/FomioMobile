import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from '../components/shared/theme-provider';
import { UserApiKeyAuth } from '../shared/userApiKeyAuth';
import { useAuth } from '../shared/useAuth';
import { logger } from '../shared/logger';
import { discourseApi } from '../shared/discourseApi';

const config = Constants.expoConfig?.extra || {};

export default function AuthCallbackScreen() {
  const { isDark } = useTheme();
  const { setAuthenticatedUser } = useAuth();
  const params = useLocalSearchParams<{ payload?: string; client_id?: string }>();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const colors = {
    background: isDark ? '#18181b' : '#fff',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      logger.info('AuthCallbackScreen: Processing authorization callback...');

      const payload = params.payload;
      
      if (!payload) {
        logger.error('AuthCallbackScreen: No payload parameter in callback');
        setStatus('error');
        setErrorMessage('No authorization data received. Please try again.');
        setTimeout(() => {
          router.replace('/(auth)/signin');
        }, 3000);
        return;
      }

      // Handle authorization callback
      const result = await UserApiKeyAuth.handleAuthorizationCallback(payload);

      if (!result.success) {
        logger.error('AuthCallbackScreen: Authorization failed', { error: result.error });
        setStatus('error');
        setErrorMessage(result.error || 'Authorization failed. Please try again.');
        setTimeout(() => {
          router.replace('/(auth)/signin');
        }, 3000);
        return;
      }

      logger.info('AuthCallbackScreen: Authorization successful, warming browser cookies...');

      // Warm browser cookies using OTP (optional but recommended)
      if (result.oneTimePassword) {
        try {
          await UserApiKeyAuth.warmBrowserCookies(result.oneTimePassword);
        } catch (otpError) {
          // OTP warming is optional - log but don't fail
          logger.warn('AuthCallbackScreen: OTP warming failed (non-critical)', otpError);
        }
      }

      logger.info('AuthCallbackScreen: Fetching user data...');

      // Fetch user data using the new API key
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

        // Set authenticated user
        await setAuthenticatedUser(appUser);

        logger.info('AuthCallbackScreen: User authenticated successfully', {
          username: appUser.username,
        });

        setStatus('success');

        // Navigate to main app after short delay
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } else {
        logger.error('AuthCallbackScreen: Failed to fetch user data', {
          error: userResponse.error,
        });
        setStatus('error');
        setErrorMessage('Failed to load user data. Please try again.');
        setTimeout(() => {
          router.replace('/(auth)/signin');
        }, 3000);
      }
    } catch (error: any) {
      logger.error('AuthCallbackScreen: Error processing callback', error);
      setStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
      setTimeout(() => {
        router.replace('/(auth)/signin');
      }, 3000);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.text }]}>
              Completing authorization...
            </Text>
            <Text style={[styles.subText, { color: colors.secondary }]}>
              Please wait while we set up your account
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={[styles.successIcon, { color: colors.primary }]}>✓</Text>
            <Text style={[styles.statusText, { color: colors.text }]}>
              Authorization successful!
            </Text>
            <Text style={[styles.subText, { color: colors.secondary }]}>
              Redirecting to the app...
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={[styles.errorIcon, { color: colors.error }]}>✕</Text>
            <Text style={[styles.statusText, { color: colors.text }]}>
              Authorization failed
            </Text>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errorMessage}
            </Text>
            <Text style={[styles.subText, { color: colors.secondary }]}>
              Redirecting back to login...
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  errorIcon: {
    fontSize: 64,
    fontWeight: 'bold',
  },
});
