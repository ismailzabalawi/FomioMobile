import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { useAuth } from '../shared/useAuth';

interface WelcomeScreenProps {}

export default function WelcomeScreen({}: WelcomeScreenProps): React.ReactElement {
  const { isDark } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  
  const colors = {
    background: isDark ? '#18181b' : '#ffffff',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    buttonText: isDark ? '#ffffff' : '#ffffff',
    border: isDark ? '#334155' : '#0ea5e9',
  };

  const handleGetStarted = (): void => {
    router.push('/(auth)/onboarding');
  };

  const handleContinueToApp = (): void => {
    router.replace('/(tabs)');
  };

  const handleSignIn = (): void => {
    router.push('/(auth)/signin');
  };

  const handleExplore = (): void => {
    router.push('/(tabs)');
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
            <Text style={[styles.heroTitle, { color: colors.text }]}>Fomio</Text>
            <Text style={[styles.heroSubtitle, { color: colors.secondary }]}>
              Your social platform for sharing and connecting
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            {isAuthenticated ? (
              <>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleContinueToApp}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Continue to App"
                  accessibilityHint="Go to the main app"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                    Continue to App
                  </Text>
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
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleGetStarted}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Get Started"
                  accessibilityHint="Begin onboarding for Fomio"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                    Get Started
                  </Text>
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
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                    Sign In
                  </Text>
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
              </>
            )}
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
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

