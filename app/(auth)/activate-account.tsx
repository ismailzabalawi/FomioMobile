import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';

/**
 * Account Activation Screen (public)
 * 
 * Handles deep links like fomio://activate-account?token=XYZ
 * Opens the Discourse activation URL in the system browser.
 */
export default function ActivateAccountScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const tokens = getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light');
  const params = useLocalSearchParams<{ token?: string }>();
  const [status, setStatus] = useState<'pending' | 'opened' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  const config = Constants.expoConfig?.extra || {};
  const baseUrl = config.DISCOURSE_BASE_URL || 'https://meta.fomio.app';
  const token = typeof params.token === 'string' ? params.token : undefined;

  const colors = useMemo(() => ({
    background: tokens.colors.background,
    card: tokens.colors.surfaceFrost,
    text: tokens.colors.text,
    muted: tokens.colors.muted,
    accent: tokens.colors.accent,
    onAccent: tokens.colors.onAccent,
    border: tokens.colors.border,
    danger: tokens.colors.danger,
    dangerSoft: tokens.colors.dangerSoft,
    success: '#7ddf92', // Success color not in token system, using hardcoded value
  }), [tokens]);

  const activationUrl = token
    ? `${baseUrl}/u/activate-account/${encodeURIComponent(token)}`
    : null;

  const openActivation = useCallback(async () => {
    if (!activationUrl) {
      setStatus('error');
      setError('Activation link is missing or invalid. Please reopen from your email.');
      return;
    }

    try {
      setStatus('pending');
      setError(null);
      await Linking.openURL(activationUrl);
      setStatus('opened');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Failed to open activation link. Please try again.');
    }
  }, [activationUrl]);

  // Auto-launch on mount
  useEffect(() => {
    openActivation();
  }, [openActivation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Activate your account</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          We'll open your activation link in the browser to finish setup.
        </Text>

        {status === 'pending' && (
          <View style={styles.row}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.statusText, { color: colors.muted }]}>Opening activation link…</Text>
          </View>
        )}

        {status === 'opened' && (
          <Text style={[styles.successText, { color: colors.success }]}>
            If your browser didn't open, tap "Open activation link" below.
          </Text>
        )}

        {status === 'error' && error && (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: colors.accent }]} 
          onPress={openActivation}
        >
          <Text style={[styles.primaryText, { color: colors.onAccent }]}>Open activation link</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/(auth)/signin' as any)}
        >
          <Text style={[styles.secondaryText, { color: colors.muted }]}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 15,
  },
  successText: {
    fontSize: 15,
    marginBottom: 16,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
  },
});
