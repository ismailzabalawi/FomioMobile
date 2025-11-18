import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { signIn } from '../../lib/auth';
import { useAuth } from '../../shared/useAuth';
import { logger } from '../../shared/logger';

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
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  // Handle authorization
  const handleAuthorize = async () => {
    // Prevent multiple simultaneous auth attempts
    if (isAuthorizing) {
      return;
    }

    try {
      setIsAuthorizing(true);
      setError(null);
      
      logger.info('AuthorizeScreen: Starting authorization flow...');
      
      // Use unified signIn() from lib/auth.ts
      // This handles: RSA key generation, browser session, payload decryption, storage, and OTP warming
      const success = await signIn();
      
      if (success) {
        logger.info('AuthorizeScreen: Authorization successful');
        // signIn() emits 'auth:signed-in' event, which will trigger useAuth hook
        // to refresh user data and navigate. We can navigate here as well for immediate feedback.
        router.replace('/(tabs)');
      } else {
        throw new Error('Authorization failed. Please try again.');
      }
    } catch (err: any) {
      logger.error('AuthorizeScreen: Authorization failed', err);
      
      // Provide user-friendly error messages
      let displayError = 'Authorization failed. Please try again.';
      
      const errorMessage = err?.message || '';
      if (errorMessage.toLowerCase().includes('cancel') || errorMessage.toLowerCase().includes('cancelled')) {
        displayError = 'Authorization was cancelled. Please try again when ready.';
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
        displayError = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.toLowerCase().includes('decrypt') || errorMessage.toLowerCase().includes('payload')) {
        displayError = 'Failed to process authorization response. Please try again.';
      } else if (errorMessage) {
        displayError = errorMessage;
      }
      
      setError(displayError);
    } finally {
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
            accessibilityLabel="Authorize Fomio"
            accessibilityHint="Opens your browser to authorize Fomio to access your account"
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
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
});

