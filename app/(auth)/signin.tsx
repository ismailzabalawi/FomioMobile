import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../components/shared/theme-provider';
import { signIn, isAuthenticated } from '../../lib/auth';
import { logger } from '../../shared/logger';

export default function SignInScreen() {
  const { isDark } = useTheme();
  const colors = {
    background: isDark ? '#18181b' : '#fff',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#0ea5e9',
    divider: isDark ? '#334155' : '#e2e8f0',
    error: isDark ? '#ef4444' : '#dc2626',
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if already authenticated
      const authed = await isAuthenticated();
      if (authed) {
        router.replace('/(tabs)' as any);
        return;
      }

      // Start sign-in flow
      await signIn();
      
      // Sign-in successful - navigate to main app
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to sign in. Please try again.';
      setError(errorMessage);
      logger.error('SignInScreen: Sign-in failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint="Go back to previous screen"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sign In</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: `${colors.error}10`, borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.infoContainer}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Connect to Forum</Text>
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              Sign in using Discourse User API Key authentication. You'll be redirected to approve access.
            </Text>
          </View>

          <View style={styles.scopesContainer}>
            <Text style={[styles.scopesTitle, { color: colors.text }]}>What we'll access:</Text>
            <View style={styles.scopesList}>
              <Text style={[styles.scopeItem, { color: colors.secondary }]}>• Read your posts and topics</Text>
              <Text style={[styles.scopeItem, { color: colors.secondary }]}>• Create and edit posts</Text>
              <Text style={[styles.scopeItem, { color: colors.secondary }]}>• View notifications</Text>
              <Text style={[styles.scopeItem, { color: colors.secondary }]}>• Access session information</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton, { backgroundColor: colors.primary }]}
            onPress={handleSignIn}
            disabled={loading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            accessibilityHint="Sign in to Discourse forum using API key authentication"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                Sign In
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
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
  infoContainer: {
    marginBottom: 24,
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
  scopesContainer: {
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  scopesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scopesList: {
    gap: 8,
  },
  scopeItem: {
    fontSize: 14,
    lineHeight: 20,
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
