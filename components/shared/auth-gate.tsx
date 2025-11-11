import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuthState } from '@/shared/useAuthState';

/**
 * AuthGate component
 * Guards routes by checking authentication status
 * - If not ready: shows loading
 * - If not authenticated: redirects to signin
 * - If authenticated: renders children
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, signedIn } = useAuthState();

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!signedIn) {
    return <Redirect href="/(auth)/signin" />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
