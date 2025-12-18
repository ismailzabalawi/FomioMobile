import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';

interface WelcomeScreenProps {}

export default function WelcomeScreen({}: WelcomeScreenProps): React.ReactElement {
  const { isDark } = useTheme();
  const tokens = getTokens(isDark ? 'darkAmoled' : 'light');
  const colors = {
    background: tokens.colors.background,
    primary: tokens.colors.accent,
    text: tokens.colors.text,
    secondary: tokens.colors.muted,
    onPrimary: tokens.colors.onAccent,
    border: tokens.colors.border,
  } as const;

  const handleGetStarted = (): void => {
    // Keep routing centralized in the auth/onboarding gate.
    router.push('/(auth)');
  };

  const handleSignIn = (): void => {
    router.push('/(auth)/signin');
  };

  const handleExplore = (): void => {
    router.push('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>Welcome to Fomio</Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Share your thoughts, connect with others, and discover amazing content.
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.hero}>
            <Image
              source={require('../assets/images/favicon.png')}
              style={styles.heroLogo}
              resizeMode="contain"
              accessibilityLabel="Fomio logo"
            />
            <Text style={[styles.heroSubtitle, { color: colors.secondary }]}>
              Your social platform for sharing and connecting
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleGetStarted}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Get Started"
              accessibilityHint="Begin onboarding for Fomio"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={handleSignIn}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Sign In"
              accessibilityHint="Sign in to your Fomio account"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostButton}
              onPress={handleExplore}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Explore Without Account"
              accessibilityHint="Browse Fomio without signing in"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.ghostButtonText, { color: colors.secondary }]}>
                Explore Without Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroLogo: {
    width: 96,
    height: 96,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  ghostButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
