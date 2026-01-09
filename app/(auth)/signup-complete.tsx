import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, ArrowRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';

/**
 * Signup Complete Screen (Ricochet Landing)
 * 
 * This screen catches the fomio://signup-complete deep link after
 * Discourse activates an account. It provides visual feedback and
 * then redirects the user to sign in.
 * 
 * The "Ricochet" pattern solves the in-app browser problem:
 * 1. User clicks activation link in Gmail/Outlook/etc.
 * 2. Link opens in in-app browser → Discourse activates account
 * 3. Discourse redirects to fomio://signup-complete
 * 4. In-app browser can't handle fomio:// → System opens Fomio app
 * 5. This screen catches the deep link → Shows success → Redirects to sign-in
 */
export default function SignupCompleteScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const tokens = getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light');
  const [isReady, setIsReady] = useState(false);

  const colors = useMemo(() => ({
    background: tokens.colors.background,
    card: tokens.colors.surfaceFrost,
    text: tokens.colors.text,
    muted: tokens.colors.muted,
    accent: tokens.colors.accent,
    onAccent: tokens.colors.onAccent,
    border: tokens.colors.border,
    success: '#22C55E', // Green for success
  }), [tokens]);

  useEffect(() => {
    // Haptic feedback for success
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Dismiss any open browser sessions and cool down
    // This prevents "Another web browser is already open" error
    const prepareForAuth = async () => {
      try {
        // Try to dismiss any lingering browser session
        await WebBrowser.dismissBrowser();
      } catch {
        // Ignore - may not have been open
      }
      
      try {
        // Cool down the browser to ensure it's ready for a new session
        await WebBrowser.coolDownAsync();
      } catch {
        // Ignore - coolDownAsync may not be available
      }
      
      // Short delay to ensure browser is fully closed
      setTimeout(() => setIsReady(true), 500);
    };

    prepareForAuth();
  }, []);

  const handleContinueToSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.replace('/(auth)/signin' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Success Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${colors.success}20` }]}>
          <CheckCircle size={48} color={colors.success} weight="fill" />
        </View>

        {/* Success Message */}
        <Text style={[styles.title, { color: colors.text }]}>Account Verified!</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Your account has been successfully activated. Tap below to sign in to your new account.
        </Text>

        {/* Continue to Sign In button */}
        <TouchableOpacity 
          style={[
            styles.primaryButton, 
            { backgroundColor: colors.accent },
            !isReady && styles.disabledButton,
          ]} 
          onPress={handleContinueToSignIn}
          disabled={!isReady}
        >
          <Text style={[styles.primaryText, { color: colors.onAccent }]}>
            {isReady ? 'Continue to Sign In' : 'Preparing...'}
          </Text>
          {isReady && <ArrowRight size={20} color={colors.onAccent} weight="bold" />}
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
    borderRadius: 16,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

