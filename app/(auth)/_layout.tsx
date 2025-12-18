import React, { useEffect, useState } from 'react';
import { Stack, Redirect, usePathname, useFocusEffect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/shared/auth-context';
import { getOnboardingState } from '@/shared/onboardingStorage';

/**
 * Helper to check if pathname represents the auth index/root route.
 * Handles various pathname formats that Expo Router might return.
 */
function isAuthIndexRoute(pathname: string): boolean {
  // Normalize: remove trailing slashes for comparison
  const normalized = pathname.replace(/\/+$/, '');
  
  // Check for various ways the index route might appear
  return (
    normalized === '/(auth)' ||
    normalized === '/(auth)/index' ||
    normalized === '' ||          // Relative path within the group
    normalized === '/' ||         // Root within the group
    normalized === '/index'       // Index relative path
  );
}

/**
 * Helper to check if pathname is the onboarding route.
 */
function isOnboardingRoute(pathname: string): boolean {
  return pathname.includes('/onboarding');
}

/**
 * Helper to check if pathname is an explicit auth screen (signin/signup/authorize).
 */
function isExplicitAuthScreen(pathname: string): boolean {
  return (
    pathname.includes('/signin') ||
    pathname.includes('/signup') ||
    pathname.includes('/authorize')
  );
}

export default function AuthLayout(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    getOnboardingState()
      .then((state) => {
        if (!mounted) return;
        console.log('🧭 Onboarding state loaded:', { hasCompletedOnboarding: !!state.hasCompletedOnboarding });
        setHasCompletedOnboarding(!!state.hasCompletedOnboarding);
        setIsOnboardingLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        // Safe fallback: treat as not completed so users can still proceed.
        console.log('🧭 Onboarding state failed to load, defaulting to not completed');
        setHasCompletedOnboarding(false);
        setIsOnboardingLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh onboarding state whenever the auth stack regains focus while unauthenticated.
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) return;

      let mounted = true;
      setIsOnboardingLoading(true);

      getOnboardingState()
        .then((state) => {
          if (!mounted) return;
          setHasCompletedOnboarding(!!state.hasCompletedOnboarding);
          setIsOnboardingLoading(false);
        })
        .catch(() => {
          if (!mounted) return;
          setHasCompletedOnboarding(false);
          setIsOnboardingLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, [isAuthenticated])
  );

  // Debug: log current navigation state
  console.log('🧭 AuthLayout render:', {
    pathname,
    isAuthenticated,
    isLoading,
    isOnboardingLoading,
    hasCompletedOnboarding,
    isAuthIndex: isAuthIndexRoute(pathname),
    isOnboarding: isOnboardingRoute(pathname),
    isExplicitAuth: isExplicitAuthScreen(pathname),
  });

  // Show loading state during auth check
  if (isLoading || isOnboardingLoading) {
    console.log('🧭 Showing loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirect authenticated users to main app
  if (isAuthenticated) {
    console.log('🧭 Redirecting authenticated user to /(tabs)');
    return <Redirect href="/(tabs)" />;
  }

  // Gate: first-time users must complete onboarding first.
  if (!hasCompletedOnboarding) {
    // If they try to access other auth routes directly, force onboarding.
    if (!isOnboardingRoute(pathname)) {
      console.log('🧭 Onboarding not completed, redirecting to onboarding');
      return <Redirect href="/(auth)/onboarding" />;
    }
    // User is on onboarding, let them continue
    console.log('🧭 User on onboarding screen, rendering Stack');
  } else {
    // Onboarding is already completed:
    // - never show onboarding again by default
    // - if user explicitly lands on onboarding, send them to sign-in
    if (isOnboardingRoute(pathname)) {
      console.log('🧭 Onboarding already completed, redirecting to signin');
      return <Redirect href="/(auth)/signin" />;
    }

    // If user enters `/(auth)` root/index, route to sign-in by default.
    if (isAuthIndexRoute(pathname)) {
      console.log('🧭 At auth index with completed onboarding, redirecting to signin');
      return <Redirect href="/(auth)/signin" />;
    }

    // User is on an explicit auth screen (signin/signup/authorize), let them continue
    console.log('🧭 User on explicit auth screen, rendering Stack');
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="authorize" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
