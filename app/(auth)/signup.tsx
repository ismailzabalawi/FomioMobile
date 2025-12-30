import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { getTokens } from '@/shared/design/tokens';

const config = Constants.expoConfig?.extra || {};
const BASE_URL = config.DISCOURSE_BASE_URL;

/**
 * Sign Up Screen
 * 
 * Two-step flow:
 * 1. Open Discourse signup page in browser
 * 2. After returning, show "Continue to Connect" button that opens auth modal
 */
export default function SignUpScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const tokens = getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light');
  const baseUrlMissing = !BASE_URL;

  const [loading, setLoading] = useState(false);
  const [hasOpenedSignup, setHasOpenedSignup] = useState(false);

  const colors = {
    background: tokens.colors.background,
    primary: tokens.colors.accent,
    onPrimary: tokens.colors.onAccent,
    text: tokens.colors.text,
    secondary: tokens.colors.muted,
    divider: tokens.colors.border,
    error: tokens.colors.danger,
    errorBg: tokens.colors.dangerSoft,
    success: tokens.colors.accent,
    successBg: tokens.colors.surfaceAccent,
  } as const;

  // Open signup page in browser
  const handleOpenSignup = useCallback(async () => {
    if (baseUrlMissing) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoading(true);

    try {
      const signupUrl = new URL(`${BASE_URL}/signup`);
      signupUrl.searchParams.set('fomio', '1');
      signupUrl.searchParams.set('return_to', 'fomio://auth_redirect');
      await WebBrowser.openBrowserAsync(signupUrl.toString());
      // User has returned from browser, show continue option
      setHasOpenedSignup(true);
    } catch (err) {
      console.error('Failed to open signup page:', err);
    } finally {
      setLoading(false);
    }
  }, [baseUrlMissing]);

  // Open auth modal to connect after signup
  const handleContinueToConnect = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/(auth)/auth-modal' as any);
  }, []);

  // Navigate to sign in
  const handleSignIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(auth)/signin');
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Configure header
  useScreenHeader({
    title: 'Create Account',
    canGoBack: true,
    onBackPress: handleBack,
    withSafeTop: false,
    tone: 'bg',
    compact: true,
    titleFontSize: 20,
  }, [isDark]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.form}>
          {/* Header section */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              {hasOpenedSignup ? 'Almost There!' : 'Create Account'}
            </Text>
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              {hasOpenedSignup
                ? 'After creating your account on the forum, tap below to connect it to Fomio.'
                : 'Create your account on the Discourse forum. After signing up, you\'ll connect it to Fomio.'
              }
            </Text>
            {baseUrlMissing && (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Configuration missing. Please set DISCOURSE_BASE_URL.
                </Text>
              </View>
            )}
          </View>

          {/* Success banner when user has opened signup */}
          {hasOpenedSignup && (
            <View style={[styles.successBanner, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
              <Text style={[styles.successText, { color: colors.text }]}>
                ✓ Sign up page opened. Once you've created your account, continue below.
              </Text>
            </View>
          )}

          {/* Primary action: Open signup or Continue to connect */}
          {hasOpenedSignup ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleContinueToConnect}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Continue to Connect"
              accessibilityHint="Connect your new account to Fomio"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                Continue to Connect
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (loading || baseUrlMissing) && styles.disabledButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleOpenSignup}
              disabled={loading || baseUrlMissing}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Open Sign Up Page"
              accessibilityHint="Open Discourse signup page in browser"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                {baseUrlMissing ? 'Configuration Required' : loading ? 'Opening...' : 'Open Sign Up Page'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Re-open signup option */}
          {hasOpenedSignup && (
            <TouchableOpacity
              style={[styles.tertiaryButton]}
              onPress={handleOpenSignup}
              disabled={loading}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Open Sign Up Page Again"
              accessibilityHint="Reopen the signup page if needed"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.tertiaryButtonText, { color: colors.secondary }]}>
                {loading ? 'Opening...' : 'Open Sign Up Page Again'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            <Text style={[styles.dividerText, { color: colors.secondary }]}>
              {hasOpenedSignup ? 'already have an account?' : 'or'}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={handleSignIn}
            disabled={loading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            accessibilityHint="Go to sign in screen"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Sign In</Text>
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
  infoContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  errorBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  successBanner: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  successText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  tertiaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  tertiaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
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
    fontSize: 17,
    fontWeight: '600',
  },
});
