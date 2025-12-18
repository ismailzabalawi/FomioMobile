import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Auth entry route.
 *
 * Routing decision is centralized in `app/(auth)/_layout.tsx`:
 * - authenticated -> /(tabs)
 * - onboarding not completed -> /(auth)/onboarding
 * - onboarding completed -> /(auth)/signin
 *
 * This screen renders a brief loading state while the layout redirects.
 * It does NOT redirect itself to avoid conflicting with the layout's redirect logic.
 */
export default function AuthIndex(): React.ReactElement {
  // Layout will redirect; this just prevents blank screen during redirect
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

