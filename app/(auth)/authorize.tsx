import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { UserApiKeyAuth } from '../../shared/userApiKeyAuth';
import { useAuth } from '../../shared/useAuth';
import { logger } from '../../shared/logger';

const AUTH_REDIRECT_SCHEME = process.env.EXPO_PUBLIC_AUTH_REDIRECT_SCHEME || 'fomio://auth-callback';

// Complete auth session when browser closes
WebBrowser.maybeCompleteAuthSession();

export default function AuthorizeScreen() {
  const { isDark } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  
  const colors = {
    background: isDark ? '#18181b' : '#fff',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#0ea5e9',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  // Load authorization URL
  useEffect(() => {
    const loadAuthUrl = async () => {
      try {
        setLoadingUrl(true);
        setError(null);
        
        const url = await UserApiKeyAuth.initiateAuthorization({
          applicationName: 'Fomio',
          scopes: ['read', 'write', 'message_bus', 'notifications', 'one_time_password'],
        });
        
        setAuthUrl(url);
        logger.info('AuthorizeScreen: Authorization URL loaded');
      } catch (err) {
        logger.error('AuthorizeScreen: Failed to load auth URL', err);
        setError('Failed to initialize authorization. Please try again.');
      } finally {
        setLoadingUrl(false);
      }
    };

    loadAuthUrl();
  }, []);

  // Handle opening browser for authorization
  const handleOpenBrowser = async () => {
    if (!authUrl) {
      setError('Authorization URL not ready. Please wait.');
      return;
    }

    try {
      setIsOpeningBrowser(true);
      setError(null);
      
      logger.info('AuthorizeScreen: Opening browser for authorization', {
        url: authUrl.replace(/public_key=[^&]+/, 'public_key=[REDACTED]'),
      });

      // Open browser with the authorization URL
      // The deep link will automatically route to auth-callback.tsx when Discourse redirects
      const result = await WebBrowser.openBrowserAsync(authUrl, {
        showInRecents: true,
        enableBarCollapsing: false,
      });

      logger.info('AuthorizeScreen: Browser closed', { type: result.type });

      // If user cancelled, show error
      if (result.type === 'cancel') {
        setError('Authorization cancelled. Please try again.');
      }
      // If there's an error, show it
      else if (result.type === 'dismiss') {
        // User dismissed the browser - this is okay, deep linking will handle the callback
        logger.info('AuthorizeScreen: Browser dismissed, waiting for deep link callback');
      }
    } catch (err) {
      logger.error('AuthorizeScreen: Failed to open browser', err);
      setError('Failed to open authorization page. Please try again.');
    } finally {
      setIsOpeningBrowser(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    router.back();
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    // Reload the component to regenerate URL
    router.replace('/(auth)/authorize' as any);
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
        {loadingUrl || !authUrl ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondary }]}>
              Preparing authorization...
            </Text>
          </View>
        ) : (
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
              onPress={handleOpenBrowser}
              disabled={isOpeningBrowser}
              style={[
                styles.authorizeButton,
                { backgroundColor: colors.primary },
                isOpeningBrowser && styles.authorizeButtonDisabled,
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Open authorization page"
              accessibilityHint="Opens your browser to authorize Fomio"
            >
              {isOpeningBrowser ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.authorizeButtonText}>
                  Open Authorization Page
                </Text>
              )}
            </TouchableOpacity>
            <Text style={[styles.hintText, { color: colors.secondary }]}>
              After authorizing, you'll be automatically redirected back to the app.
            </Text>
          </View>
        )}
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
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
});

