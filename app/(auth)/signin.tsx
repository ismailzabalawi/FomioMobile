import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/components/theme';
import { useAuth } from '@/shared/auth-context';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { useScreenBackBehavior } from '@/shared/hooks/useScreenBackBehavior';
import { getTokens } from '@/shared/design/tokens';

const config = Constants.expoConfig?.extra || {};
const BASE_URL = config.DISCOURSE_BASE_URL;

/**
 * Sign In Screen - Gateway to authentication
 * 
 * This screen provides entry points to:
 * 1. Sign in via auth modal (WebView-based User API Key flow)
 * 2. Create account (opens signup screen)
 * 
 * If already authenticated, redirects to main app.
 */
export default function SignInScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const tokens = getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light');
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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

  // Check if already authenticated
  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        // Already authenticated, redirect to main app or returnTo
        const returnTo = params.returnTo;
        if (returnTo) {
          router.replace(decodeURIComponent(returnTo) as any);
        } else {
          router.replace('/(tabs)');
        }
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [isAuthenticated, isAuthLoading, params.returnTo]);

  // Open auth modal for sign in
  const handleSignIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    
    // Pass returnTo param to auth modal
    const returnTo = params.returnTo;
    if (returnTo) {
      router.push(`/(auth)/auth-modal?returnTo=${encodeURIComponent(returnTo)}` as any);
    } else {
      router.push('/(auth)/auth-modal' as any);
    }
  }, [params.returnTo]);

  // Navigate to signup
  const handleSignUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(auth)/signup');
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, []);

  // Configure header
  const canGoBack = router.canGoBack();

  useScreenHeader({
    title: 'Sign In',
    canGoBack,
    onBackPress: handleBack,
    withSafeTop: false,
    tone: 'bg',
    compact: true,
    titleFontSize: 20,
  }, [isDark]);

  useScreenBackBehavior({
    canGoBack,
    onBackPress: handleBack,
  }, [canGoBack, handleBack]);

  // Show loading while checking auth status
  if (isAuthLoading || isCheckingAuth) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.form}>
          {/* Header section */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              Sign in to access your account, post Bytes, and join the conversation.
            </Text>
            {baseUrlMissing && (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Configuration missing. Please set DISCOURSE_BASE_URL.
                </Text>
              </View>
            )}
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              baseUrlMissing && styles.disabledButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleSignIn}
            disabled={baseUrlMissing}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            accessibilityHint="Opens sign in flow"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
              {baseUrlMissing ? 'Configuration Required' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            <Text style={[styles.dividerText, { color: colors.secondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={handleSignUp}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Create Account"
            accessibilityHint="Go to sign up screen"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Guest mode hint */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => router.replace('/(tabs)')}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Continue as Guest"
            accessibilityHint="Browse without signing in"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.guestButtonText, { color: colors.secondary }]}>
              Continue as Guest
            </Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 32,
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
  guestButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
