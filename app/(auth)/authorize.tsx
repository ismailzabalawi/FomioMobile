import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../components/shared/theme-provider';
import { UserApiKeyAuth } from '../../shared/userApiKeyAuth';
import { useAuth } from '../../shared/useAuth';
import { logger } from '../../shared/logger';
import { discourseApi } from '../../shared/discourseApi';
import Constants from 'expo-constants';

const config = Constants.expoConfig?.extra || {};

export default function AuthorizeScreen() {
  const { isDark } = useTheme();
  const { isAuthenticated, isLoading, setAuthenticatedUser } = useAuth();
  
  const colors = {
    background: isDark ? '#18181b' : '#fff',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#0ea5e9',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  const [error, setError] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  // Handle authorization
  const handleAuthorize = async () => {
    try {
      setIsAuthorizing(true);
      setError(null);
      
      logger.info('AuthorizeScreen: Starting authorization...');
      
      // Initiate authorization using new flow
      const result = await UserApiKeyAuth.initiateAuthorization({
        applicationName: 'Fomio',
        scopes: ['read', 'write', 'notifications', 'session_info', 'one_time_password'],
      });

      if (!result.success) {
        logger.error('AuthorizeScreen: Authorization failed', { error: result.error });
        setError(result.error || 'Authorization failed. Please try again.');
        setIsAuthorizing(false);
        return;
      }

      logger.info('AuthorizeScreen: Authorization successful, warming browser cookies...');

      // Warm browser cookies using OTP (optional but recommended)
      if (result.oneTimePassword) {
        try {
          await UserApiKeyAuth.warmBrowserCookies(result.oneTimePassword);
        } catch (otpError) {
          // OTP warming is optional - log but don't fail
          logger.warn('AuthorizeScreen: OTP warming failed (non-critical)', otpError);
        }
      }

      logger.info('AuthorizeScreen: Fetching user data...');

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

        logger.info('AuthorizeScreen: User authenticated successfully', {
          username: appUser.username,
        });

        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        logger.error('AuthorizeScreen: Failed to fetch user data', {
          error: userResponse.error,
        });
        setError('Failed to load user data. Please try again.');
        setIsAuthorizing(false);
      }
    } catch (err: any) {
      logger.error('AuthorizeScreen: Authorization error', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsAuthorizing(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    router.back();
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    handleAuthorize();
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Don't render if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint="Go back to previous screen"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Authorize Fomio
        </Text>
        <View style={styles.placeholder} />
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: `${colors.error}10`, borderColor: colors.error }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            onPress={handleRetry}
            style={[styles.retryButton, { borderColor: colors.error }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={[styles.retryButtonText, { color: colors.error }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.contentContainer}>
        <View style={styles.authorizeContainer}>
          <View style={styles.iconContainer}>
            <Text style={[styles.iconText, { color: colors.primary }]}>🔐</Text>
          </View>
          <Text style={[styles.titleText, { color: colors.text }]}>
            Authorize Fomio
          </Text>
          <Text style={[styles.descriptionText, { color: colors.secondary }]}>
            You'll be redirected to TechRebels to authorize Fomio to access your account.
          </Text>
          <TouchableOpacity
            onPress={handleAuthorize}
            disabled={isAuthorizing}
            style={[
              styles.authorizeButton,
              { backgroundColor: colors.primary },
              isAuthorizing && styles.authorizeButtonDisabled,
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Open authorization page"
            accessibilityHint="Opens your browser to authorize Fomio"
          >
            {isAuthorizing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.authorizeButtonText}>
                Authorize Fomio
              </Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.hintText, { color: colors.secondary }]}>
            After authorizing, you'll be automatically redirected back to the app.
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.secondary }]}>
          You will be asked to authorize Fomio to access your account on TechRebels
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  errorContainer: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authorizeContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconText: {
    fontSize: 64,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  authorizeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  authorizeButtonDisabled: {
    opacity: 0.6,
  },
  authorizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
