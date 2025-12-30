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
 * Helper to check if pathname is an explicit auth screen (signin/signup/auth-modal).
 */
function isExplicitAuthScreen(pathname: string): boolean {
  return (
    pathname.includes('/signin') ||
    pathname.includes('/signup') ||
    pathname.includes('/auth-modal')
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

  const isAuthIndex = isAuthIndexRoute(pathname);
  const isOnboarding = isOnboardingRoute(pathname);
  const isExplicitAuth = isExplicitAuthScreen(pathname);

  let redirectTo: string | null = null;

  if (isAuthenticated) {
    redirectTo = '/(tabs)';
  } else if (!hasCompletedOnboarding) {
    redirectTo = isOnboarding ? null : '/(auth)/onboarding';
  } else if (isOnboarding || isAuthIndex) {
    redirectTo = '/(auth)/signin';
  } else if (isExplicitAuth) {
    redirectTo = null;
  } else {
    redirectTo = '/(auth)/signin';
  }

  if (redirectTo) {
    console.log('🧭 Redirecting auth route:', { redirectTo });
    return <Redirect href={redirectTo} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen 
        name="auth-modal" 
        options={{ 
          presentation: 'fullScreenModal',
          headerShown: false,
          animation: 'slide_from_bottom',
        }} 
      />
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
