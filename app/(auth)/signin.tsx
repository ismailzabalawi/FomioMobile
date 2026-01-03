import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/components/theme';
import { useAuth } from '@/shared/auth-context';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { useScreenBackBehavior } from '@/shared/hooks/useScreenBackBehavior';
import { getTokens } from '@/shared/design/tokens';

const config = Constants.expoConfig?.extra || {};
const BASE_URL = config.DISCOURSE_BASE_URL;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Sign In Screen - Gateway to authentication
 * 
 * This screen provides entry points to:
 * 1. Sign in via auth modal (User API Key flow with Chrome Custom Tabs)
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
  
  // Animation values
  const primaryButtonScale = useSharedValue(1);
  const secondaryButtonScale = useSharedValue(1);

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

  // Button press animations
  const onPrimaryPressIn = useCallback(() => {
    primaryButtonScale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [primaryButtonScale]);

  const onPrimaryPressOut = useCallback(() => {
    primaryButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [primaryButtonScale]);

  const onSecondaryPressIn = useCallback(() => {
    secondaryButtonScale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [secondaryButtonScale]);

  const onSecondaryPressOut = useCallback(() => {
    secondaryButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [secondaryButtonScale]);

  const primaryButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: primaryButtonScale.value }],
  }));

  const secondaryButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: secondaryButtonScale.value }],
  }));

  // Open auth modal for sign in
  const handleSignIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    
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

  // Continue as guest
  const handleGuest = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.replace('/(tabs)');
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
    title: '',
    canGoBack,
    onBackPress: handleBack,
    withSafeTop: false,
    tone: 'bg',
    compact: true,
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
          {/* Header section with animation */}
          <Animated.View 
            entering={FadeInDown.delay(100).duration(400).springify()}
            style={styles.infoContainer}
          >
            <Text style={[styles.infoTitle, { color: colors.text }]}>Welcome to Fomio</Text>
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
          </Animated.View>

          {/* Sign In Button with animation */}
          <Animated.View entering={FadeInUp.delay(200).duration(400).springify()}>
            <AnimatedTouchableOpacity
              style={[
                styles.primaryButton,
                baseUrlMissing && styles.disabledButton,
                { backgroundColor: colors.primary },
                primaryButtonStyle,
              ]}
              onPress={handleSignIn}
              onPressIn={onPrimaryPressIn}
              onPressOut={onPrimaryPressOut}
              disabled={baseUrlMissing}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Sign In"
              accessibilityHint="Opens sign in flow"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={1}
            >
              <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                {baseUrlMissing ? 'Configuration Required' : 'Sign In'}
              </Text>
            </AnimatedTouchableOpacity>
          </Animated.View>

          {/* Divider with animation */}
          <Animated.View 
            entering={FadeInUp.delay(300).duration(400).springify()}
            style={styles.divider}
          >
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            <Text style={[styles.dividerText, { color: colors.secondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          </Animated.View>

          {/* Create Account Button with animation */}
          <Animated.View entering={FadeInUp.delay(400).duration(400).springify()}>
            <AnimatedTouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary }, secondaryButtonStyle]}
              onPress={handleSignUp}
              onPressIn={onSecondaryPressIn}
              onPressOut={onSecondaryPressOut}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Create Account"
              accessibilityHint="Go to sign up screen"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={1}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                Create Account
              </Text>
            </AnimatedTouchableOpacity>
          </Animated.View>

          {/* Guest mode hint with animation */}
          <Animated.View entering={FadeInUp.delay(500).duration(400).springify()}>
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuest}
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
          </Animated.View>
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
    padding: 24,
    justifyContent: 'center',
  },
  form: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  infoContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  infoText: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  errorBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  guestButton: {
    marginTop: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
