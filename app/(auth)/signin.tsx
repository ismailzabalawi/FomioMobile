import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { getTokens } from '@/shared/design/tokens';

const config = Constants.expoConfig?.extra || {};
const BASE_URL = config.DISCOURSE_BASE_URL;

export default function SignInScreen() {
  const { isDark } = useTheme();
  const tokens = getTokens(isDark ? 'darkAmoled' : 'light');
  const baseUrlMissing = !BASE_URL;
  const colors = {
    background: tokens.colors.background,
    primary: tokens.colors.accent,
    onPrimary: tokens.colors.onAccent,
    text: tokens.colors.text,
    secondary: tokens.colors.muted,
    divider: tokens.colors.border,
    error: tokens.colors.danger,
    errorBg: tokens.colors.dangerSoft,
  } as const;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const isProcessingRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  const handleConnect = async (isRetry = false) => {
    if (baseUrlMissing) {
      setError('Missing DISCOURSE_BASE_URL config. Please configure meta.techrebels.info and try again.');
      return;
    }

    // Prevent multiple simultaneous auth attempts
    if (isProcessingRef.current) {
      return;
    }

    if (!isRetry) {
      setRetryCount(0);
    }

    setLoading(true);
    setError('');
    isProcessingRef.current = true;

    try {
      // Check if we already have a valid API key
      const authModule = require('../../lib/auth');
      const hasKey = await authModule.hasUserApiKey();
      
      if (hasKey) {
        // Try to verify the key is still valid by checking session
        try {
          const discourseApi = require('../../shared/discourseApi').discourseApi;
          const userResponse = await discourseApi.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            // Key is valid, navigate to main app
            router.replace('/(tabs)' as any);
            return;
          }
        } catch (error: any) {
          // Key exists but is invalid, continue to sign in
          console.log('⚠️ Existing API key invalid, starting new sign in');
        }
      }
      
      // Start delegated authentication flow
      const success = await authModule.signIn();
      
      if (success) {
        // Sign in successful, navigate to main app
        router.replace('/(tabs)' as any);
      } else {
        throw new Error('Sign in failed. Please try again.');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to connect. Please try again.';
      let displayError = errorMessage;
      
      // Show helpful hints for common errors
      if (errorMessage.toLowerCase().includes('cancel') || errorMessage.toLowerCase().includes('cancelled')) {
        displayError = 'Sign in was cancelled. Please try again when ready.';
      } else if (errorMessage.toLowerCase().includes('redirect') || errorMessage.toLowerCase().includes('url')) {
        displayError = 'Configuration error: Missing redirect URL in Discourse settings. Please contact support.';
      } else if (errorMessage.toLowerCase().includes('scope')) {
        displayError = 'Permission error: Insufficient scopes. Please check your API key permissions.';
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('connection')) {
        displayError = 'Network error: Please check your internet connection and try again.';
        // Allow retry for network errors
        if (retryCount < 2 && mountedRef.current) {
          setRetryCount(retryCount + 1);
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              handleConnect(true);
            }
          }, 2000 * (retryCount + 1)); // Exponential backoff
          return;
        }
      } else if (errorMessage.toLowerCase().includes('decrypt') || errorMessage.toLowerCase().includes('payload')) {
        displayError = 'Authorization error: Failed to process authorization response. Please try again.';
      }
      
      setError(displayError);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Configure header
  useScreenHeader({
    title: "Sign In",
    canGoBack: true,
    onBackPress: handleBack,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
  }, [isDark]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.form}>
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              {retryCount > 0 && (
                <Text style={[styles.retryText, { color: colors.secondary }]}>
                  Retrying... ({retryCount}/2)
                </Text>
              )}
            </View>
          ) : null}

          <View style={styles.infoContainer}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Connect to Forum</Text>
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              Sign in using Discourse User API Key authentication. You'll be redirected to approve access.
            </Text>
            {baseUrlMissing && (
              <Text style={[styles.infoText, { color: colors.error, marginTop: 12 }]}>
                Missing DISCOURSE_BASE_URL config (expected meta.techrebels.info). Please update app config before signing in.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (loading || baseUrlMissing) && styles.disabledButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => handleConnect()}
            disabled={loading || baseUrlMissing}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Connect to Forum"
            accessibilityHint="Connect to Discourse forum using API key authentication"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                {baseUrlMissing ? 'Configuration required' : 'Connect to Forum'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            <Text style={[styles.dividerText, { color: colors.secondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={() => router.push('/(auth)/signup')}
            disabled={loading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Create Account"
            accessibilityHint="Go to sign up screen"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Create Account</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  form: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  infoContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
