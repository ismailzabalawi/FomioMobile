import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../components/shared/theme-provider';
import { useAuth } from '../../shared/useAuth';

export default function SignInScreen() {
  const { isDark } = useTheme();
  const { signIn } = useAuth();
  const colors = {
    background: isDark ? '#18181b' : '#fff',
    primary: isDark ? '#38bdf8' : '#0ea5e9',
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#0ea5e9',
    inputBg: isDark ? '#27272a' : '#fff',
    inputBorder: isDark ? '#334155' : '#d1d5db',
    divider: isDark ? '#334155' : '#e2e8f0',
    label: isDark ? '#f4f4f5' : '#1e293b',
    disabled: isDark ? '#64748b' : '#64748b',
    error: isDark ? '#ef4444' : '#dc2626',
  };
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signIn(identifier, password);
      
      if (result.success) {
        // Navigate to main app
        router.replace('/(tabs)' as any);
      } else {
        setError(result.error || 'Sign in failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
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

          <Text style={[styles.label, { color: colors.label }]}>Email or Username</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              if (error) setError('');
            }}
            placeholder="Enter your email or username"
            placeholderTextColor={colors.secondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={[styles.label, { color: colors.label }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError('');
            }}
            placeholder="Enter your password"
            placeholderTextColor={colors.secondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <View style={[styles.infoContainer, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              ℹ️ This app uses API key authentication. Make sure your .env file is configured with valid Discourse API credentials.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton, { backgroundColor: colors.primary }]}
            onPress={handleSignIn}
            disabled={loading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            accessibilityHint="Sign in to your Fomio account"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.primaryButtonText, { color: colors.background }]}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            <Text style={[styles.dividerText, { color: colors.secondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={handleSignUp}
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
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
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
  infoContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

